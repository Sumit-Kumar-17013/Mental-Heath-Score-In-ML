"use strict";

/* =========================================================
   Configuration
   ========================================================= */
const API_URL = "https://mental-heath-score-in-ml.onrender.com";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   Small helpers
   ========================================================= */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Animate a numeric value from `from` to `to` over `duration` ms,
 * calling onUpdate(currentValue) on every frame.
 */
function animateValue(from, to, duration, onUpdate, onComplete) {
  if (REDUCED_MOTION) {
    onUpdate(to);
    if (onComplete) onComplete();
    return;
  }
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = clamp(elapsed / duration, 0, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    onUpdate(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   Mobile nav toggle
   ========================================================= */
const navToggle = $("#navToggle");
const mobileNav = $("#mobileNav");
navToggle.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});
$$("#mobileNav a").forEach((a) =>
  a.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  })
);

/* =========================================================
   Hero score ring (decorative sample, never sent to API)
   ========================================================= */
(function initHeroRing() {
  const ring = $("#heroRingProgress");
  const numberEl = $("#heroScoreNumber");
  const RADIUS = 68;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const SAMPLE_SCORE = 78;

  ring.style.strokeDasharray = String(CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(CIRCUMFERENCE);

  // Animate in shortly after page load
  window.requestAnimationFrame(() => {
    setTimeout(() => {
      const offset = CIRCUMFERENCE * (1 - SAMPLE_SCORE / 100);
      ring.style.strokeDashoffset = String(offset);
      animateValue(0, SAMPLE_SCORE, 1200, (v) => {
        numberEl.textContent = Math.round(v);
      });
    }, 400);
  });
})();

/* =========================================================
   Sliders — live value display
   ========================================================= */
const sliderConfig = [
  { id: "avg_daily_usage_hours", suffix: "hours/day", decimals: 1 },
  { id: "study_hours", suffix: "hours/day", decimals: 1 },
  { id: "physical_activity_hours", suffix: "hours/day", decimals: 1 },
  { id: "sleep_hours_per_night", suffix: "hours/night", decimals: 1 },
];

function formatSliderValue(value, decimals) {
  const num = Number(value);
  // Show whole numbers without a trailing .0
  const formatted = decimals > 0 ? num.toFixed(decimals).replace(/\.0$/, "") : String(num);
  return formatted;
}

sliderConfig.forEach(({ id, suffix, decimals }) => {
  const input = $(`#${id}`);
  const display = $(`#val-${id}`);
  const update = () => {
    display.textContent = `${formatSliderValue(input.value, decimals)} ${suffix}`;
  };
  input.addEventListener("input", update);
  update();
});

/* =========================================================
   Stress level selector
   ========================================================= */
const stressCards = $$(".stress-card");
const stressHidden = $("#stress_level");

function selectStress(value, { focus = false } = {}) {
  stressCards.forEach((card) => {
    const isMatch = card.dataset.value === value;
    card.setAttribute("aria-checked", String(isMatch));
    if (isMatch && focus) card.focus();
  });
  stressHidden.value = value;
  clearFieldError("stress_level");
}

stressCards.forEach((card) => {
  card.addEventListener("click", () => selectStress(card.dataset.value));
  card.addEventListener("keydown", (e) => {
    const idx = stressCards.indexOf(card);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = stressCards[(idx + 1) % stressCards.length];
      selectStress(next.dataset.value, { focus: true });
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = stressCards[(idx - 1 + stressCards.length) % stressCards.length];
      selectStress(prev.dataset.value, { focus: true });
    }
  });
});

/* =========================================================
   Validation
   ========================================================= */
const VALIDATORS = {
  age: (v) => v !== "" && Number(v) >= 10 && Number(v) <= 100,
  gender: (v) => v !== "",
  country: (v) => v.trim().length > 0,
  academic_level: (v) => v !== "",
  most_used_platform: (v) => v !== "",
  purpose_of_use: (v) => v !== "",
  avg_daily_usage_hours: (v) => v !== "" && Number(v) >= 0 && Number(v) <= 24,
  daily_unlocks: (v) => v !== "" && Number(v) >= 0,
  study_hours: (v) => v !== "" && Number(v) >= 0 && Number(v) <= 24,
  physical_activity_hours: (v) => v !== "" && Number(v) >= 0 && Number(v) <= 24,
  sleep_hours_per_night: (v) => v !== "" && Number(v) >= 0 && Number(v) <= 24,
  stress_level: (v) => v !== "",
};

const ERROR_MESSAGES = {
  age: "Enter an age between 10 and 100.",
  gender: "Please select a gender.",
  country: "Please enter your country.",
  academic_level: "Please select an academic level.",
  most_used_platform: "Please select a platform.",
  purpose_of_use: "Please select a purpose.",
  avg_daily_usage_hours: "Usage must be between 0 and 24 hours.",
  daily_unlocks: "Enter 0 or more unlocks.",
  study_hours: "Study hours must be between 0 and 24.",
  physical_activity_hours: "Activity hours must be between 0 and 24.",
  sleep_hours_per_night: "Sleep hours must be between 0 and 24.",
  stress_level: "Please select a stress level.",
};

function setFieldError(name, message) {
  const errorEl = $(`#err-${name}`);
  const inputEl = $(`#${name}`) || $(`[name="${name}"]`);
  if (errorEl) errorEl.textContent = message;
  const fieldWrap = inputEl ? inputEl.closest(".field") : null;
  if (fieldWrap) fieldWrap.classList.add("invalid");
}

function clearFieldError(name) {
  const errorEl = $(`#err-${name}`);
  const inputEl = $(`#${name}`) || $(`[name="${name}"]`);
  if (errorEl) errorEl.textContent = "";
  const fieldWrap = inputEl ? inputEl.closest(".field") : null;
  if (fieldWrap) fieldWrap.classList.remove("invalid");
}

function validateForm(payload) {
  let isValid = true;
  let firstInvalidField = null;

  Object.entries(VALIDATORS).forEach(([name, validate]) => {
    const value = payload[name];
    const ok = validate(typeof value === "number" ? String(value) : value ?? "");
    if (!ok) {
      setFieldError(name, ERROR_MESSAGES[name]);
      isValid = false;
      if (!firstInvalidField) firstInvalidField = name;
    } else {
      clearFieldError(name);
    }
  });

  return { isValid, firstInvalidField };
}

/* =========================================================
   Score interpretation
   ========================================================= */
function interpretScore(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Very Good";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

function insightForScore(score) {
  if (score >= 75) {
    return {
      emoji: "✨",
      title: "Positive Balance",
      text: "Your current lifestyle pattern shows a strong overall wellness balance. Keep maintaining healthy sleep, activity and study habits.",
    };
  }
  if (score >= 40) {
    return {
      emoji: "🌱",
      title: "Room to Improve",
      text: "Your wellness pattern appears fairly balanced, but there may be some lifestyle areas worth improving gradually.",
    };
  }
  return {
    emoji: "💙",
    title: "Take Care of Yourself",
    text: "Your current wellness score suggests that some lifestyle habits may deserve more attention. Consider improving rest, activity, study balance and stress management.",
  };
}

/* =========================================================
   Form submission
   ========================================================= */
const form = $("#assessmentForm");
const submitBtn = $("#submitBtn");
const assessmentCard = $(".assessment-card");
const resultCard = $("#resultCard");
const errorCard = $("#errorCard");

let lastPayload = null;

function setSubmitLoading(isLoading) {
  submitBtn.disabled = isLoading;
  $(".btn-submit-label", submitBtn).hidden = isLoading;
  $(".btn-submit-loading", submitBtn).hidden = !isLoading;
}

function buildPayload() {
  const fd = new FormData(form);
  return {
    age: Number(fd.get("age")),
    gender: fd.get("gender") || "",
    country: (fd.get("country") || "").trim(),
    academic_level: fd.get("academic_level") || "",
    most_used_platform: fd.get("most_used_platform") || "",
    purpose_of_use: fd.get("purpose_of_use") || "",
    avg_daily_usage_hours: Number(fd.get("avg_daily_usage_hours")),
    daily_unlocks: Number(fd.get("daily_unlocks")),
    study_hours: Number(fd.get("study_hours")),
    physical_activity_hours: Number(fd.get("physical_activity_hours")),
    sleep_hours_per_night: Number(fd.get("sleep_hours_per_night")),
    stress_level: fd.get("stress_level") || "",
  };
}

async function submitAssessment(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(timeout);
    throw { kind: "network", original: networkErr };
  }
  clearTimeout(timeout);

  if (!response.ok) {
    let detail = null;
    try {
      detail = await response.json();
    } catch (_) {
      /* body wasn't JSON */
    }
    throw { kind: "http", status: response.status, detail };
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    throw { kind: "parse", original: parseErr };
  }

  if (typeof data.predicted_mental_health_score !== "number" || Number.isNaN(data.predicted_mental_health_score)) {
    throw { kind: "invalid", data };
  }

  return data;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = buildPayload();
  const { isValid, firstInvalidField } = validateForm(payload);

  if (!isValid) {
    const el = $(`#${firstInvalidField}`) || $(`[name="${firstInvalidField}"]`) || $("#stressGroup");
    el.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "center" });
    return;
  }

  lastPayload = payload;
  setSubmitLoading(true);
  errorCard.hidden = true;

  try {
    const data = await submitAssessment(payload);
    setSubmitLoading(false);
    showResult(data.predicted_mental_health_score, payload);
  } catch (err) {
    setSubmitLoading(false);
    console.error("MindScore AI — prediction request failed:", err);
    showError(err);
  }
});

/* =========================================================
   Result rendering
   ========================================================= */
const RESULT_RADIUS = 94;
const RESULT_CIRCUMFERENCE = 2 * Math.PI * RESULT_RADIUS;

function showResult(rawScore, payload) {
  assessmentCard.hidden = true;
  errorCard.hidden = true;
  resultCard.hidden = false;
  resultCard.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });

  const clampedScore = clamp(rawScore, 0, 100);
  const category = interpretScore(clampedScore);
  const insight = insightForScore(clampedScore);

  const ring = $("#resultRingProgress");
  const numberEl = $("#resultNumber");
  const tagEl = $("#resultTag");

  ring.style.strokeDasharray = String(RESULT_CIRCUMFERENCE);
  ring.style.strokeDashoffset = String(RESULT_CIRCUMFERENCE);
  numberEl.textContent = "0";
  tagEl.textContent = "";

  // Color the ring based on category
  const ringColorMap = {
    "Needs Attention": "var(--accent-alert)",
    "Fair": "var(--accent-warm)",
    "Good": "var(--accent)",
    "Very Good": "var(--accent-2)",
    "Excellent": "var(--accent-2)",
  };
  ring.style.stroke = ringColorMap[category] || "var(--accent)";

  requestAnimationFrame(() => {
    const offset = RESULT_CIRCUMFERENCE * (1 - clampedScore / 100);
    ring.style.strokeDashoffset = String(offset);
    animateValue(0, rawScore, 1500, (v) => {
      numberEl.textContent = v.toFixed(2);
    }, () => {
      numberEl.textContent = rawScore.toFixed(2);
    });
  });

  setTimeout(() => {
    tagEl.textContent = category;
  }, REDUCED_MOTION ? 0 : 300);

  $("#insightEmoji").textContent = insight.emoji;
  $("#insightTitle").textContent = insight.title;
  $("#insightText").textContent = insight.text;

  renderSnapshot(payload);
}

function renderSnapshot(payload) {
  const grid = $("#snapshotGrid");
  grid.innerHTML = "";

  const items = [
    { label: "Sleep", value: `${payload.sleep_hours_per_night} hrs`, pct: (payload.sleep_hours_per_night / 24) * 100 },
    { label: "Study", value: `${payload.study_hours} hrs`, pct: (payload.study_hours / 24) * 100 },
    { label: "Physical Activity", value: `${payload.physical_activity_hours} hrs`, pct: (payload.physical_activity_hours / 24) * 100 },
    { label: "Social Media", value: `${payload.avg_daily_usage_hours} hrs`, pct: (payload.avg_daily_usage_hours / 24) * 100 },
    { label: "Phone Unlocks", value: `${payload.daily_unlocks}`, pct: clamp((payload.daily_unlocks / 150) * 100, 4, 100) },
    { label: "Stress", value: payload.stress_level, pct: { Low: 25, Medium: 50, High: 75, "Very High": 100 }[payload.stress_level] || 0 },
  ];

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "snap-item";
    el.innerHTML = `
      <span class="snap-label">${item.label}</span>
      <span class="snap-value">${item.value}</span>
      <div class="snap-bar-track"><div class="snap-bar-fill" style="width:0%"></div></div>
    `;
    grid.appendChild(el);
    requestAnimationFrame(() => {
      const fill = $(".snap-bar-fill", el);
      setTimeout(() => { fill.style.width = `${clamp(item.pct, 0, 100)}%`; }, 250);
    });
  });
}

/* =========================================================
   Error rendering
   ========================================================= */
function showError(err) {
  resultCard.hidden = true;
  errorCard.hidden = false;
  errorCard.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "center" });

  const titleEl = $("#errorTitle");
  const textEl = $("#errorText");

  if (err && err.kind === "http" && err.status === 422) {
    titleEl.textContent = "We couldn't process that assessment";
    textEl.textContent = "The backend rejected some of the submitted values. Please review your answers and try again.";
  } else if (err && err.kind === "http") {
    titleEl.textContent = "Something went wrong";
    textEl.textContent = `The AI model returned an unexpected error (status ${err.status}). Please try again in a moment.`;
  } else if (err && (err.kind === "parse" || err.kind === "invalid")) {
    titleEl.textContent = "Unexpected response from AI Model";
    textEl.textContent = "We received a response we couldn't understand. Please try again.";
  } else {
    titleEl.textContent = "Unable to connect to AI Model";
    textEl.textContent = "Please make sure your FastAPI server is running and try again.";
  }
}

$("#errorRetryBtn").addEventListener("click", async () => {
  if (!lastPayload) {
    errorCard.hidden = true;
    assessmentCard.hidden = false;
    return;
  }
  setSubmitLoading(true);
  errorCard.hidden = true;
  assessmentCard.hidden = false;
  assessmentCard.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
  try {
    const data = await submitAssessment(lastPayload);
    setSubmitLoading(false);
    showResult(data.predicted_mental_health_score, lastPayload);
  } catch (err) {
    setSubmitLoading(false);
    console.error("MindScore AI — retry failed:", err);
    showError(err);
  }
});

/* =========================================================
   Result actions
   ========================================================= */
$("#retakeBtn").addEventListener("click", resetToAssessment);
$("#resultBack").addEventListener("click", resetToAssessment);

function resetToAssessment() {
  resultCard.hidden = true;
  errorCard.hidden = true;
  assessmentCard.hidden = false;
  assessmentCard.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
}

$("#saveBtn").addEventListener("click", () => {
  if (!lastPayload) return;
  const score = $("#resultNumber").textContent;
  const category = $("#resultTag").textContent;
  const lines = [
    "MindScore AI — Wellness Result",
    "================================",
    `Score: ${score}`,
    `Category: ${category}`,
    "",
    "Your Inputs",
    "-----------",
    `Age: ${lastPayload.age}`,
    `Gender: ${lastPayload.gender}`,
    `Country: ${lastPayload.country}`,
    `Academic Level: ${lastPayload.academic_level}`,
    `Most Used Platform: ${lastPayload.most_used_platform}`,
    `Purpose of Use: ${lastPayload.purpose_of_use}`,
    `Average Daily Usage: ${lastPayload.avg_daily_usage_hours} hrs`,
    `Daily Phone Unlocks: ${lastPayload.daily_unlocks}`,
    `Study Hours: ${lastPayload.study_hours} hrs`,
    `Physical Activity: ${lastPayload.physical_activity_hours} hrs`,
    `Sleep: ${lastPayload.sleep_hours_per_night} hrs`,
    `Stress Level: ${lastPayload.stress_level}`,
    "",
    "This AI score is an educational wellness indicator and is not a medical diagnosis.",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mindscore-ai-result.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* =========================================================
   Scroll-reveal for "How It Works" steps
   ========================================================= */
if ("IntersectionObserver" in window && !REDUCED_MOTION) {
  const steps = $$(".how-step");
  steps.forEach((el) => { el.style.opacity = "0"; el.style.transform = "translateY(16px)"; });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = Array.from(steps).indexOf(el) * 100;
          setTimeout(() => {
            el.style.transition = "opacity .7s var(--ease), transform .7s var(--ease)";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.2 }
  );

  steps.forEach((el) => observer.observe(el));
}
