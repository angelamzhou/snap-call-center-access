(function () {
  const root = document.querySelector("[data-congestion-demo]");
  if (!root) return;

  const frames = [
    {
      step: "Same daily demand reaches the same staffed queue.",
      erlangEnroll: 92,
      feedbackEnroll: 92,
      erlangAbandon: 8,
      feedbackAbandon: 8,
      feedbackReturn: 0,
      erlangLoad: 100,
      feedbackLoad: 100
    },
    {
      step: "Some callers abandon before reaching an agent.",
      erlangEnroll: 88,
      feedbackEnroll: 84,
      erlangAbandon: 12,
      feedbackAbandon: 16,
      feedbackReturn: 7,
      erlangLoad: 100,
      feedbackLoad: 119
    },
    {
      step: "Redials and follow-ups recycle demand back into the queue.",
      erlangEnroll: 84,
      feedbackEnroll: 77,
      erlangAbandon: 16,
      feedbackAbandon: 23,
      feedbackReturn: 17,
      erlangLoad: 100,
      feedbackLoad: 142
    },
    {
      step: "Omitting endogenous congestion makes current staffing guidance too optimistic.",
      erlangEnroll: 84,
      feedbackEnroll: 70,
      erlangAbandon: 16,
      feedbackAbandon: 30,
      feedbackReturn: 31,
      erlangLoad: 100,
      feedbackLoad: 166
    }
  ];

  const els = {
    step: root.querySelector("[data-demo-step]"),
    toggle: root.querySelector("[data-demo-toggle]"),
    erlangEnroll: root.querySelector("[data-erlang-enroll]"),
    feedbackEnroll: root.querySelector("[data-feedback-enroll]"),
    erlangAbandon: root.querySelector("[data-erlang-abandon]"),
    feedbackAbandon: root.querySelector("[data-feedback-abandon]"),
    feedbackReturn: root.querySelector("[data-feedback-return]"),
    erlangLoad: root.querySelector("[data-erlang-load]"),
    feedbackLoad: root.querySelector("[data-feedback-load]"),
    svg: root.querySelector(".queue-animation")
  };

  const numericKeys = [
    "erlangEnroll",
    "feedbackEnroll",
    "erlangAbandon",
    "feedbackAbandon",
    "feedbackReturn",
    "erlangLoad",
    "feedbackLoad"
  ];
  const segmentDuration = 2600;
  const totalDuration = (frames.length - 1) * segmentDuration;

  let paused = false;
  let complete = false;
  let timerId = null;
  let cycleStart = window.performance.now();
  let pausedElapsed = 0;
  const tickDelay = 80;

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function interpolate(from, to, t) {
    return from + (to - from) * t;
  }

  function setIntegerText(el, value) {
    const next = String(Math.round(value));
    if (el.textContent !== next) {
      el.textContent = next;
    }
  }

  function interpolatedFrame(elapsed) {
    const clampedElapsed = Math.min(elapsed, totalDuration);
    const scaled = clampedElapsed / segmentDuration;
    const fromIndex = Math.min(Math.floor(scaled), frames.length - 1);
    const toIndex = Math.min(fromIndex + 1, frames.length - 1);
    const localProgress = fromIndex === toIndex ? 1 : smoothstep(scaled - fromIndex);
    const from = frames[fromIndex];
    const to = frames[toIndex];
    const frame = { step: from.step };

    numericKeys.forEach(function (key) {
      frame[key] = interpolate(from[key], to[key], localProgress);
    });

    return {
      frame,
      stage: fromIndex
    };
  }

  function renderFrame(frame, stage) {
    root.dataset.stage = String(stage);
    els.step.textContent = frame.step;
    setIntegerText(els.erlangEnroll, frame.erlangEnroll);
    setIntegerText(els.feedbackEnroll, frame.feedbackEnroll);
    setIntegerText(els.erlangAbandon, frame.erlangAbandon);
    setIntegerText(els.feedbackAbandon, frame.feedbackAbandon);
    setIntegerText(els.feedbackReturn, frame.feedbackReturn);
    els.erlangLoad.style.width = `${frame.erlangLoad / 1.8}%`;
    els.feedbackLoad.style.width = `${frame.feedbackLoad / 1.8}%`;
  }

  function renderElapsed(elapsed) {
    const state = interpolatedFrame(elapsed);
    renderFrame(state.frame, state.stage);
  }

  function tick() {
    const elapsed = window.performance.now() - cycleStart;
    renderElapsed(elapsed);
    if (elapsed >= totalDuration) {
      complete = true;
      pausedElapsed = totalDuration;
      stopTimer();
      els.toggle.textContent = "Replay";
      els.toggle.setAttribute("aria-pressed", "false");
      return;
    }
    timerId = window.setTimeout(tick, tickDelay);
  }

  function stopTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    els.toggle.textContent = "Pause";
    els.toggle.setAttribute("aria-pressed", "false");
    timerId = window.setTimeout(tick, tickDelay);
  }

  function setPaused(nextPaused) {
    if (complete && !nextPaused) {
      replay();
      return;
    }
    if (paused === nextPaused) return;
    if (nextPaused) {
      pausedElapsed = window.performance.now() - cycleStart;
      stopTimer();
    } else {
      cycleStart = window.performance.now() - pausedElapsed;
      startTimer();
    }

    paused = nextPaused;
    root.classList.toggle("is-paused", paused);
    els.toggle.textContent = paused ? "Play" : "Pause";
    els.toggle.setAttribute("aria-pressed", String(paused));
    if (els.svg && typeof els.svg.pauseAnimations === "function") {
      if (paused) {
        els.svg.pauseAnimations();
      } else {
        els.svg.unpauseAnimations();
      }
    }
  }

  function replay() {
    complete = false;
    paused = false;
    pausedElapsed = 0;
    cycleStart = window.performance.now();
    root.classList.remove("is-paused");
    renderElapsed(0);
    if (els.svg && typeof els.svg.unpauseAnimations === "function") {
      els.svg.unpauseAnimations();
    }
    startTimer();
  }

  renderElapsed(0);
  startTimer();

  els.toggle.addEventListener("click", function () {
    if (complete) {
      replay();
      return;
    }
    setPaused(!paused);
  });
})();

(function () {
  const root = document.querySelector("[data-evaluation-panel]");
  if (!root) return;

  const states = {
    staffing: {
      parameter: "Capacity lever: staff c",
      title: "More agents move callers out of wait.",
      copy: "More staffed capacity directly increases the rate at which callers connect. The downstream effect is smaller abandonment piles and fewer redials feeding back into tomorrow's queue.",
      enroll: "+14",
      abandon: "-9",
      recycle: "-11",
      load: "-18%"
    },
    aht: {
      parameter: "Service-time lever: lower AHT / higher service rate",
      title: "Shorter handling time drains the queue faster.",
      copy: "Lower average handling time directly frees agent capacity. Indirectly, shorter waits mean fewer callers abandon and fewer people have to redial to complete required steps.",
      enroll: "+11",
      abandon: "-7",
      recycle: "-9",
      load: "-15%"
    },
    resolution: {
      parameter: "Return-demand lever: θS, θL, completion share",
      title: "First-call resolution weakens the return loop.",
      copy: "When more contacts resolve the case, fewer successful callers need follow-ups and fewer incomplete contacts recycle. That removes demand before it can re-enter the same staffed queue.",
      enroll: "+9",
      abandon: "-5",
      recycle: "-16",
      load: "-21%"
    },
    recertification: {
      parameter: "Arrival-pressure lever: recertification timing",
      title: "Smoother deadlines reduce avoidable peaks.",
      copy: "Recertification timing and waiver choices can directly reduce peak arrival pressure. The indirect gain is that fewer peak-day failures become repeat calls later.",
      enroll: "+7",
      abandon: "-6",
      recycle: "-10",
      load: "-17%"
    },
    bundle: {
      parameter: "Scenario lever: staffing + service design",
      title: "Bundles can outperform one-off fixes.",
      copy: "The evaluation framework compares bundles on the same outcomes. Staffing can raise capacity while process changes reduce the feedback that makes staffing guidance too optimistic.",
      enroll: "+19",
      abandon: "-13",
      recycle: "-22",
      load: "-30%"
    }
  };

  const els = {
    title: root.querySelector("[data-eval-title]"),
    parameter: root.querySelector("[data-eval-parameter]"),
    copy: root.querySelector("[data-eval-copy]"),
    enroll: root.querySelector("[data-eval-enroll]"),
    abandon: root.querySelector("[data-eval-abandon]"),
    recycle: root.querySelector("[data-eval-recycle]"),
    load: root.querySelector("[data-eval-load]")
  };
  const buttons = Array.from(root.querySelectorAll("[data-intervention]"));
  const effectEls = Array.from(root.querySelectorAll("[data-effects]"));

  function setActive(id) {
    const state = states[id] || states.staffing;
    root.dataset.active = id;
    els.title.textContent = state.title;
    els.parameter.textContent = state.parameter;
    els.copy.textContent = state.copy;
    els.enroll.textContent = state.enroll;
    els.abandon.textContent = state.abandon;
    els.recycle.textContent = state.recycle;
    els.load.textContent = state.load;

    buttons.forEach(function (button) {
      const active = button.dataset.intervention === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    effectEls.forEach(function (el) {
      const active = el.dataset.effects.split(" ").includes(id);
      el.classList.toggle("is-active", active);
    });
  }

  buttons.forEach(function (button) {
    const id = button.dataset.intervention;
    button.addEventListener("mouseenter", function () {
      setActive(id);
    });
    button.addEventListener("focus", function () {
      setActive(id);
    });
    button.addEventListener("click", function () {
      setActive(id);
    });
  });

  setActive("staffing");
})();
