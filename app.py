from pathlib import Path
import logging
import os
import warnings
import re

import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

# =========================================================
# 1. APP CONFIGURATION
# =========================================================

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "best_random_forest_model.joblib"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor_scaler.joblib"

# Baseline threshold.
# Tune using validation data if available.
THRESHOLD = 0.50


# =========================================================
# 2. FEATURE DEFINITIONS
# =========================================================

# These names must match the HTML form input name attributes.
FEATURE_NAMES = [
    "age",
    "gender",
    "smoking",
    "yellow_fingers",
    "anxiety",
    "peer_pressure",
    "chronic_disease",
    "fatigue",
    "allergy",
    "wheezing",
    "alcohol_consuming",
    "coughing",
    "shortness_of_breath",
    "swallowing_difficulty",
    "chest_pain",
]

# All numeric features except gender.
NUMERIC_FEATURES = [
    feature for feature in FEATURE_NAMES
    if feature != "gender"
]

# The dataset uses 1 and 2 for binary indicators.
BINARY_FEATURES = {
    "smoking",
    "yellow_fingers",
    "anxiety",
    "peer_pressure",
    "chronic_disease",
    "fatigue",
    "allergy",
    "wheezing",
    "alcohol_consuming",
    "coughing",
    "shortness_of_breath",
    "swallowing_difficulty",
    "chest_pain",
}

INTEGER_FEATURES = set(NUMERIC_FEATURES)

# Broad validation limits.
INPUT_BOUNDS = {
    "age": (1, 120),
}

# Dataset encoding:
# M = Male, F = Female.
#
# IMPORTANT:
# Confirm that this numeric mapping matches the encoding
# used when training the saved StandardScaler and model.
GENDER_ENCODING = {
    "M": 1,
    "F": 0,
}

# The original dataset column names.
# These aliases let the app align the input with the saved
# scaler whether its feature names use spaces or underscores.
DATASET_COLUMN_MAP = {
    "age": "AGE",
    "gender": "GENDER",
    "smoking": "SMOKING",
    "yellow_fingers": "YELLOW_FINGERS",
    "anxiety": "ANXIETY",
    "peer_pressure": "PEER_PRESSURE",
    "chronic_disease": "CHRONIC DISEASE",
    "fatigue": "FATIGUE ",
    "allergy": "ALLERGY ",
    "wheezing": "WHEEZING",
    "alcohol_consuming": "ALCOHOL CONSUMING",
    "coughing": "COUGHING",
    "shortness_of_breath": "SHORTNESS OF BREATH",
    "swallowing_difficulty": "SWALLOWING DIFFICULTY",
    "chest_pain": "CHEST PAIN",
}


# =========================================================
# 3. FEATURE NAME HELPERS
# =========================================================

def normalize_feature_name(name):
    """
    Normalize column names to make matching robust to
    capitalization, spaces, and underscores.
    """
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


FEATURE_ALIASES = {}

for canonical_name in FEATURE_NAMES:
    FEATURE_ALIASES[normalize_feature_name(canonical_name)] = (
        canonical_name
    )

    original_name = DATASET_COLUMN_MAP[canonical_name]
    FEATURE_ALIASES[normalize_feature_name(original_name)] = (
        canonical_name
    )


def resolve_model_features(preprocessor):
    """
    Determine the expected feature order from the fitted scaler
    when feature_names_in_ is available.
    """
    scaler_feature_names = getattr(
        preprocessor,
        "feature_names_in_",
        None,
    )

    if scaler_feature_names is not None:
        model_feature_names = list(scaler_feature_names)

        resolved_names = []

        for column_name in model_feature_names:
            normalized_name = normalize_feature_name(column_name)

            if normalized_name not in FEATURE_ALIASES:
                raise ValueError(
                    "Unrecognized feature in saved preprocessor: "
                    f"{column_name!r}"
                )

            resolved_names.append(
                FEATURE_ALIASES[normalized_name]
            )

        if len(resolved_names) != len(FEATURE_NAMES):
            raise ValueError(
                "The saved preprocessor has an unexpected number "
                "of features."
            )

        if set(resolved_names) != set(FEATURE_NAMES):
            raise ValueError(
                "The saved preprocessor features do not match "
                "the 15 expected lung cancer input features."
            )

        if len(set(resolved_names)) != len(resolved_names):
            raise ValueError(
                "Duplicate feature names were detected in "
                "the saved preprocessor."
            )

        return model_feature_names, resolved_names

    # If the scaler has no feature_names_in_, use the documented
    # canonical order. This order MUST match training.
    return FEATURE_NAMES.copy(), FEATURE_NAMES.copy()


# =========================================================
# 4. LOAD MODEL AND PREPROCESSOR
# =========================================================

def load_artifacts():
    """Load trusted model artifacts saved during training."""

    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}"
        )

    if not PREPROCESSOR_PATH.is_file():
        raise FileNotFoundError(
            f"Preprocessor file not found: {PREPROCESSOR_PATH}"
        )

    # Only load joblib files from trusted sources.
    with warnings.catch_warnings():
        warnings.simplefilter("default")

        loaded_model = joblib.load(MODEL_PATH)
        loaded_preprocessor = joblib.load(PREPROCESSOR_PATH)

    if not hasattr(loaded_model, "predict"):
        raise TypeError(
            "The saved model does not support predict()."
        )

    if not hasattr(loaded_model, "predict_proba"):
        raise TypeError(
            "The saved Random Forest model does not support "
            "predict_proba()."
        )

    if not hasattr(loaded_model, "classes_"):
        raise TypeError(
            "The saved model has no classes_ attribute."
        )

    if not hasattr(loaded_preprocessor, "transform"):
        raise TypeError(
            "The saved preprocessor does not support transform()."
        )

    expected_count = getattr(
        loaded_preprocessor,
        "n_features_in_",
        None,
    )

    if (
        expected_count is not None
        and expected_count != len(FEATURE_NAMES)
    ):
        raise ValueError(
            "Feature count mismatch: the saved preprocessor expects "
            f"{expected_count} features, but the app provides "
            f"{len(FEATURE_NAMES)}."
        )

    model_feature_names, resolved_feature_names = (
        resolve_model_features(loaded_preprocessor)
    )

    logger.info("Model loaded: %s", type(loaded_model).__name__)
    logger.info(
        "Model classes: %s",
        list(loaded_model.classes_),
    )
    logger.info(
        "Expected model input features: %s",
        model_feature_names,
    )

    return (
        loaded_model,
        loaded_preprocessor,
        model_feature_names,
        resolved_feature_names,
    )


# =========================================================
# 5. POSITIVE CLASS DETECTION
# =========================================================

def is_positive_class(value):
    """
    Recognize common positive labels from the lung cancer dataset.

    Supported positive labels:
    YES, Yes, yes, 1, and True.

    Confirm the saved model's actual target encoding.
    """
    if isinstance(value, (bool, np.bool_)):
        return bool(value)

    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value) == 1.0

    return str(value).strip().upper() in {
        "YES",
        "1",
        "TRUE",
    }


# =========================================================
# 6. INITIALIZE MODEL
# =========================================================

try:
    (
        model,
        preprocessor,
        MODEL_FEATURE_NAMES,
        RESOLVED_FEATURE_NAMES,
    ) = load_artifacts()

    positive_class_indices = [
        index
        for index, class_value in enumerate(model.classes_)
        if is_positive_class(class_value)
    ]

    if len(positive_class_indices) != 1:
        raise ValueError(
            "Could not uniquely identify the positive lung cancer "
            "class in model.classes_. "
            f"Available classes: {list(model.classes_)}"
        )

    POSITIVE_CLASS_INDEX = positive_class_indices[0]

    logger.info(
        "Positive target class: %s",
        model.classes_[POSITIVE_CLASS_INDEX],
    )

except Exception:
    logger.exception(
        "Failed to load or validate model artifacts."
    )
    raise


# =========================================================
# 7. INPUT VALIDATION
# =========================================================

def parse_form_input(form):
    """
    Validate all form inputs and convert them to model-ready
    numeric values.
    """
    values = {}

    for feature in FEATURE_NAMES:
        raw_value = form.get(feature, "").strip()

        if not raw_value:
            raise ValueError(
                f"Please provide a value for {feature.replace('_', ' ')}."
            )

        if feature == "gender":
            gender_value = raw_value.upper()

            if gender_value not in GENDER_ENCODING:
                raise ValueError(
                    "Gender must be either M or F."
                )

            values[feature] = GENDER_ENCODING[gender_value]
            continue

        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            raise ValueError(
                f"{feature.replace('_', ' ').capitalize()} "
                "must be a valid number."
            )

        if not np.isfinite(value):
            raise ValueError(
                f"{feature.replace('_', ' ').capitalize()} "
                "must be a finite number."
            )

        if feature in INPUT_BOUNDS:
            lower, upper = INPUT_BOUNDS[feature]

            if not lower <= value <= upper:
                raise ValueError(
                    f"{feature.replace('_', ' ').capitalize()} "
                    f"must be between {lower} and {upper}."
                )

        if feature in INTEGER_FEATURES and not value.is_integer():
            raise ValueError(
                f"{feature.replace('_', ' ').capitalize()} "
                "must be a whole number."
            )

        if feature in BINARY_FEATURES and int(value) not in (1, 2):
            raise ValueError(
                f"{feature.replace('_', ' ').capitalize()} "
                "must be either 1 (No) or 2 (Yes)."
            )

        values[feature] = int(value)

    return values


# =========================================================
# 8. BUILD MODEL INPUT
# =========================================================

def build_model_input(values):
    """
    Construct a DataFrame with the exact feature names and order
    expected by the saved preprocessor.
    """
    ordered_values = {}

    for model_column, canonical_feature in zip(
        MODEL_FEATURE_NAMES,
        RESOLVED_FEATURE_NAMES,
    ):
        ordered_values[model_column] = values[canonical_feature]

    input_df = pd.DataFrame(
        [ordered_values],
        columns=MODEL_FEATURE_NAMES,
    )

    return input_df


# =========================================================
# 9. ROUTES
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ready",
        "model": type(model).__name__,
        "features": len(FEATURE_NAMES),
        "target_classes": [
            str(class_value)
            for class_value in model.classes_
        ],
        "threshold": THRESHOLD,
    })


@app.route("/predict", methods=["POST"])
def predict():
    is_ajax = (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.accept_mimetypes.best == "application/json"
    )

    def respond(payload, status=200):
        if is_ajax:
            return jsonify(payload), status

        if "error" in payload:
            return render_template(
                "index.html",
                error=payload["error"],
            ), status

        return render_template(
            "index.html",
            prediction=payload["prediction"],
            probability=payload["probability"],
        ), status

    try:
        # Validate form values.
        values = parse_form_input(request.form)

        # Build the input DataFrame in the fitted scaler's order.
        input_df = build_model_input(values)

        # Apply the saved StandardScaler.
        # Do NOT fit the scaler again on user input.
        scaled_input = preprocessor.transform(input_df)

        # Predict probabilities.
        probabilities = model.predict_proba(scaled_input)[0]

        probability = float(
            probabilities[POSITIVE_CLASS_INDEX]
        )

        # Apply the selected classification threshold.
        prediction = (
            "Yes"
            if probability >= THRESHOLD
            else "No"
        )

        logger.info(
            "Prediction completed. Result=%s, probability=%.4f",
            prediction,
            probability,
        )

        return respond({
            "success": True,
            "prediction": prediction,
            "probability": probability,
            "threshold": THRESHOLD,
        })

    except ValueError as exc:
        logger.warning("Invalid prediction input: %s", exc)

        return respond({
            "success": False,
            "error": str(exc),
        }, 400)

    except Exception:
        logger.exception("Prediction failed.")

        return respond({
            "success": False,
            "error": (
                "An unexpected error occurred. "
                "Please try again."
            ),
        }, 500)


# =========================================================
# 10. RUN FLASK SERVER
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )