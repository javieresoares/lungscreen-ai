/* =========================================
   LUNGSCREEN AI — MAIN INTERACTIONS
========================================= */

(() => {
  "use strict";

  const header = document.getElementById("site-header");
  const menuButton = document.getElementById("mobile-menu-button");
  const navigation = document.getElementById("main-navigation");
  const navLinks = [...document.querySelectorAll("[data-nav]")];

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* -----------------------------------------
     1. HEADER SCROLL EFFECT
  ----------------------------------------- */

  if (header) {
    let scrollPending = false;

    const updateHeader = () => {
      header.classList.toggle("header-scrolled", window.scrollY > 12);
      scrollPending = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (scrollPending) return;
        scrollPending = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true },
    );

    updateHeader();
  }

  /* -----------------------------------------
     2. MOBILE NAVIGATION
  ----------------------------------------- */

  const closeMenu = () => {
    if (!menuButton || !navigation) return;

    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    navigation.classList.remove("is-open");
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";

      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Open navigation menu" : "Close navigation menu",
      );

      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (
        header &&
        !header.contains(event.target) &&
        menuButton.getAttribute("aria-expanded") === "true"
      ) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const wasOpen = menuButton.getAttribute("aria-expanded") === "true";

        closeMenu();

        if (wasOpen) menuButton.focus();
      }
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 760) closeMenu();
      },
      { passive: true },
    );
  }

  /* -----------------------------------------
     3. ACTIVE NAVIGATION
  ----------------------------------------- */

  const sectionLinks = new Map();

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#")) return;

    const section = document.getElementById(href.slice(1));

    if (section) sectionLinks.set(section, link);
  });

  const setActiveLink = (activeLink) => {
    navLinks.forEach((link) => {
      const isActive = link === activeLink;

      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length) {
          const activeLink = sectionLinks.get(visibleSections[0].target);

          if (activeLink) setActiveLink(activeLink);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.15, 0.35, 0.6],
      },
    );

    sectionLinks.forEach((link, section) => {
      sectionObserver.observe(section);
    });
  }

  /* -----------------------------------------
     4. SMOOTH ANCHOR SCROLLING
  ----------------------------------------- */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");

      if (!href || href === "#") return;

      const target = document.getElementById(href.slice(1));

      if (!target) return;

      event.preventDefault();

      const headerHeight = header ? header.getBoundingClientRect().height : 0;

      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      const targetLink = sectionLinks.get(target);

      if (targetLink) setActiveLink(targetLink);
    });
  });

  /* -----------------------------------------
     5. GENERAL SCROLL REVEAL
  ----------------------------------------- */

  const revealElements = document.querySelectorAll(".scroll-reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  }

  /* -----------------------------------------
     6. ABOUT SECTION REVEAL
  ----------------------------------------- */

  const aboutRevealElements = document.querySelectorAll(".about-reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    aboutRevealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  } else if (aboutRevealElements.length > 0) {
    document.body.classList.add("about-animations-ready");

    const aboutObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    aboutRevealElements.forEach((element) => {
      aboutObserver.observe(element);
    });
  }

  /* -----------------------------------------
     7. TECHNOLOGY SECTION REVEAL
  ----------------------------------------- */

  const technologyRevealElements = document.querySelectorAll(".tech-reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    technologyRevealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  } else if (technologyRevealElements.length > 0) {
    document.body.classList.add("tech-animations-ready");

    const technologyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    technologyRevealElements.forEach((element) => {
      technologyObserver.observe(element);
    });
  }

  /* -----------------------------------------
     8. FEATURES SECTION REVEAL
  ----------------------------------------- */

  const featureRevealElements = document.querySelectorAll(".feature-reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    featureRevealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  } else if (featureRevealElements.length > 0) {
    document.body.classList.add("feature-animations-ready");

    const featureObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    featureRevealElements.forEach((element) => {
      featureObserver.observe(element);
    });
  }

  /* -----------------------------------------
     9. ASSESSMENT FORM AND SAMPLE DATA
  ----------------------------------------- */

  const assessmentForm = document.getElementById("assessment-form");

  const sampleNotice = document.getElementById("sample-notice");

  const fillYesButton = document.getElementById("fill-yes");

  const fillNoButton = document.getElementById("fill-no");

  const clearFormButton = document.getElementById("clear-form");

  /*
   * Dataset examples:
   * Sample A: dataset row index 1, LUNG_CANCER = 1
   * Sample B: dataset row index 2, LUNG_CANCER = 0
   *
   * Assumption: GENDER 1 = M and GENDER 0 = F.
   * Verify the gender mapping against your training dataset.
   *
   * Binary indicators: 1 = No, 2 = Yes.
   */

  const assessmentSamples = {
    yes: {
      gender: "M",
      age: "74",
      smoking: "2",
      yellow_fingers: "1",
      anxiety: "1",
      peer_pressure: "1",
      chronic_disease: "2",
      fatigue: "2",
      allergy: "2",
      wheezing: "1",
      alcohol_consuming: "1",
      coughing: "1",
      shortness_of_breath: "2",
      swallowing_difficulty: "2",
      chest_pain: "2",
    },

    no: {
      gender: "F",
      age: "59",
      smoking: "1",
      yellow_fingers: "1",
      anxiety: "1",
      peer_pressure: "1",
      chronic_disease: "2",
      fatigue: "1",
      allergy: "2",
      wheezing: "1",
      alcohol_consuming: "2",
      coughing: "1",
      shortness_of_breath: "2",
      swallowing_difficulty: "2",
      chest_pain: "1",
    },
  };

  const setAssessmentNotice = (message) => {
    if (!sampleNotice) return;

    sampleNotice.textContent = message;
    sampleNotice.hidden = !message;
  };

  const populateAssessmentForm = (sample) => {
    if (!assessmentForm) {
      console.error("LungScreen AI: #assessment-form was not found.");
      return false;
    }

    const missingFields = [];
    const invalidValues = [];

    Object.entries(sample).forEach(([name, value]) => {
      const field = assessmentForm.elements.namedItem(name);

      if (!field) {
        missingFields.push(name);
        return;
      }

      if (field instanceof RadioNodeList) {
        let matched = false;

        field.forEach((option) => {
          if (option.value === String(value)) {
            option.checked = true;
            matched = true;
          }
        });

        if (!matched) invalidValues.push(name);
      } else {
        field.value = String(value);

        if (field.value !== String(value)) {
          invalidValues.push(name);
        }
      }

      field.dispatchEvent(new Event("input", { bubbles: true }));

      field.dispatchEvent(new Event("change", { bubbles: true }));
    });

    if (missingFields.length || invalidValues.length) {
      console.error("LungScreen AI autofill issue:", {
        missingFields,
        invalidValues,
      });

      setAssessmentNotice(
        "Some sample fields could not be filled. Check the browser console.",
      );

      return false;
    }

    console.info("LungScreen AI: all sample fields filled successfully.");

    return true;
  };

  if (assessmentForm) {
    if (fillYesButton) {
      fillYesButton.addEventListener("click", () => {
        const success = populateAssessmentForm(assessmentSamples.yes);

        setAssessmentNotice(
          success
            ? "Dataset example A loaded. This educational model output is not a medical diagnosis."
            : "Sample A could not be filled completely. Check the browser console.",
        );
      });
    }

    if (fillNoButton) {
      fillNoButton.addEventListener("click", () => {
        const success = populateAssessmentForm(assessmentSamples.no);

        setAssessmentNotice(
          success
            ? "Dataset example B loaded. This educational model output is not a medical diagnosis."
            : "Sample B could not be filled completely. Check the browser console.",
        );
      });
    }

    if (clearFormButton) {
      clearFormButton.addEventListener("click", () => {
        assessmentForm.reset();
        setAssessmentNotice("");

        const firstField = assessmentForm.querySelector(
          "input, select, textarea",
        );

        if (firstField) firstField.focus();
      });
    }
  }

  /* -----------------------------------------
     10. FORM SCROLL REVEAL
  ----------------------------------------- */

  const formRevealElements = document.querySelectorAll(".form-reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    formRevealElements.forEach((element) => {
      element.classList.add("is-visible");
    });
  } else if (formRevealElements.length > 0) {
    document.body.classList.add("form-animations-ready");

    const formRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -20px 0px",
      },
    );

    formRevealElements.forEach((element) => {
      formRevealObserver.observe(element);
    });
  }

  /* -----------------------------------------
     11. AJAX PREDICTION — NO PAGE RELOAD
  ----------------------------------------- */

  if (assessmentForm) {
    const submitButton = document.getElementById("assessment-submit");

    const originalSubmitMarkup = submitButton ? submitButton.innerHTML : "";

    let resultContainer = document.getElementById("prediction-result");

    if (!resultContainer) {
      resultContainer = document.createElement("section");
      resultContainer.id = "prediction-result";
      resultContainer.className = "prediction-result-section";
      resultContainer.setAttribute("aria-live", "polite");
      resultContainer.setAttribute("aria-atomic", "true");
      resultContainer.hidden = true;

      const card = assessmentForm.closest(".assessment-card");

      if (card) {
        card.insertAdjacentElement("afterend", resultContainer);
      } else {
        assessmentForm.insertAdjacentElement("afterend", resultContainer);
      }
    }

    const escapeHTML = (value) => {
      const node = document.createElement("span");
      node.textContent = String(value ?? "");
      return node.innerHTML;
    };

    const scrollToResult = () => {
      const headerElement = document.getElementById("site-header");

      const headerHeight = headerElement
        ? headerElement.getBoundingClientRect().height
        : 0;

      const top =
        resultContainer.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        18;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    };

    const showResult = (markup) => {
      resultContainer.innerHTML = markup;
      resultContainer.hidden = false;

      resultContainer.classList.remove("prediction-result-visible");

      void resultContainer.offsetWidth;

      resultContainer.classList.add("prediction-result-visible");

      scrollToResult();
    };

    const showError = (message) => {
      showResult(`
        <div class="prediction-result-card prediction-error">
          <div class="prediction-result-icon" aria-hidden="true">!</div>

          <div class="prediction-result-content">
            <span class="prediction-result-eyebrow">
              ASSESSMENT NOTICE
            </span>

            <h3>Unable to Process Input</h3>

            <p>${escapeHTML(
              message || "Prediction could not be completed. Please try again.",
            )}</p>

            <p class="prediction-result-note">
              Please review your entries and try again.
            </p>
          </div>
        </div>
      `);
    };

    const clearResult = () => {
      resultContainer.hidden = true;
      resultContainer.innerHTML = "";

      resultContainer.classList.remove("prediction-result-visible");
    };

    if (fillYesButton) {
      fillYesButton.addEventListener("click", clearResult);
    }

    if (fillNoButton) {
      fillNoButton.addEventListener("click", clearResult);
    }

    if (clearFormButton) {
      clearFormButton.addEventListener("click", clearResult);
    }

    assessmentForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!assessmentForm.checkValidity()) {
        assessmentForm.reportValidity();
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");

        submitButton.innerHTML = `
          <span
            class="prediction-spinner"
            aria-hidden="true"
          ></span>
          <span>Analyzing…</span>
        `;
      }

      showResult(`
        <div class="prediction-loading" role="status">
          <span
            class="prediction-spinner"
            aria-hidden="true"
          ></span>

          <div>
            <strong>Analyzing health indicators…</strong>
            <p>
              The machine learning model is processing your input.
            </p>
          </div>
        </div>
      `);

      try {
        const response = await fetch(assessmentForm.action, {
          method: "POST",
          body: new FormData(assessmentForm),
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
          },
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            "The server did not return JSON. Check the Flask terminal for an error.",
          );
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Prediction could not be completed.");
        }

        const isPositive = data.prediction === "Yes";

        const percentage = Math.min(
          100,
          Math.max(0, Number(data.probability) * 100),
        );

        if (!Number.isFinite(percentage)) {
          throw new Error("The server returned an invalid probability.");
        }

        const percentageText = percentage.toFixed(1);

        showResult(`
          <div class="prediction-result-card ${
            isPositive ? "prediction-positive" : "prediction-negative"
          }">
            <div
              class="prediction-result-icon"
              aria-hidden="true"
            >${isPositive ? "!" : "✓"}</div>

            <div class="prediction-result-content">
              <span class="prediction-result-eyebrow">
                MODEL OUTPUT
              </span>

              <h3>
                Model Prediction: ${isPositive ? "Positive" : "Negative"}
              </h3>

              <p class="prediction-result-description">
                The model classified the submitted indicators
                into its ${
                  isPositive ? "positive" : "negative"
                } prediction class.
              </p>

              <div class="prediction-probability">
                <div class="prediction-probability-header">
                  <span>
                    Estimated probability for positive class
                  </span>
                  <strong>${percentageText}%</strong>
                </div>

                <div
                  class="prediction-probability-track"
                  role="progressbar"
                  aria-label="Estimated probability for positive class"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow="${percentageText}"
                >
                  <div
                    class="prediction-probability-fill"
                    style="width:${percentageText}%"
                  ></div>
                </div>
              </div>

              <p class="prediction-result-note">
                This is a machine learning output, not a confirmed
                diagnosis or a definitive estimate of individual
                medical risk. It should not replace assessment by
                a qualified healthcare professional.
              </p>

              <button
                type="button"
                class="prediction-retry-button"
                id="prediction-retry-button"
              >
                Edit Indicators
              </button>
            </div>
          </div>
        `);

        const retryButton = document.getElementById("prediction-retry-button");

        if (retryButton) {
          retryButton.addEventListener("click", () => {
            const firstField = assessmentForm.querySelector(
              "input:not([type='hidden']), select, textarea",
            );

            if (firstField) {
              firstField.focus({ preventScroll: true });
            }

            const headerElement = document.getElementById("site-header");

            const headerHeight = headerElement
              ? headerElement.getBoundingClientRect().height
              : 0;

            const top =
              assessmentForm.getBoundingClientRect().top +
              window.scrollY -
              headerHeight -
              18;

            window.scrollTo({
              top: Math.max(0, top),
              behavior: prefersReducedMotion ? "auto" : "smooth",
            });
          });
        }
      } catch (error) {
        showError(error.message);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
          submitButton.innerHTML = originalSubmitMarkup;
        }
      }
    });
  }

  /* -----------------------------------------
     12. AUTOMATIC COPYRIGHT YEAR
  ----------------------------------------- */

  const yearElement = document.getElementById("current-year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
})();
