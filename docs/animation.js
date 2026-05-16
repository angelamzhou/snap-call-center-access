(function () {
  const root = document.querySelector("[data-congestion-demo]");
  if (!root) return;

  const frames = [
    {
      step: "Same daily demand reaches the same staffed queue.",
      erlangAbandon: 8,
      feedbackAbandon: 8,
      feedbackReturn: 0,
      erlangLoad: 100,
      feedbackLoad: 100
    },
    {
      step: "Some callers abandon before reaching an agent.",
      erlangAbandon: 12,
      feedbackAbandon: 16,
      feedbackReturn: 7,
      erlangLoad: 100,
      feedbackLoad: 119
    },
    {
      step: "Redials re-enter tomorrow's queue.",
      erlangAbandon: 16,
      feedbackAbandon: 23,
      feedbackReturn: 17,
      erlangLoad: 100,
      feedbackLoad: 142
    },
    {
      step: "The abandonment pile is larger once redials and follow-ups return.",
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
    erlangAbandon: root.querySelector("[data-erlang-abandon]"),
    feedbackAbandon: root.querySelector("[data-feedback-abandon]"),
    feedbackReturn: root.querySelector("[data-feedback-return]"),
    erlangLoad: root.querySelector("[data-erlang-load]"),
    feedbackLoad: root.querySelector("[data-feedback-load]")
  };

  let index = 0;
  let paused = false;
  let complete = false;
  let timer = null;

  function render() {
    const frame = frames[index];
    root.dataset.stage = String(index);
    els.step.textContent = frame.step;
    els.erlangAbandon.textContent = frame.erlangAbandon;
    els.feedbackAbandon.textContent = frame.feedbackAbandon;
    els.feedbackReturn.textContent = frame.feedbackReturn;
    els.erlangLoad.style.width = `${frame.erlangLoad / 1.8}%`;
    els.feedbackLoad.style.width = `${frame.feedbackLoad / 1.8}%`;
  }

  function setPaused(nextPaused) {
    paused = nextPaused;
    root.classList.toggle("is-paused", paused);
    els.toggle.textContent = complete ? "Replay" : paused ? "Play" : "Pause";
    els.toggle.setAttribute("aria-pressed", String(paused));
  }

  function stopTimer() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(function () {
      if (paused) return;
      if (index < frames.length - 1) {
        index += 1;
        render();
        if (index === frames.length - 1) {
          complete = true;
          setPaused(true);
          stopTimer();
        }
        return;
      }

      complete = true;
      setPaused(true);
      stopTimer();
    }, 2600);
  }

  render();
  setPaused(false);
  startTimer();

  els.toggle.addEventListener("click", function () {
    if (complete) {
      index = 0;
      complete = false;
      render();
      setPaused(false);
      startTimer();
      return;
    }

    setPaused(!paused);
  });
})();
