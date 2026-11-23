(() => {
  "use strict";

  // The playhead is expressed in teaching steps. Fractions are animation frames.
  function timeline({ steps, duration, render, onState = () => {}, speed = () => 1 }) {
    let position = 0;
    let frame = null;
    let previousTime = null;

    function paint() {
      render(position, steps);
      onState(frame !== null, position, steps);
    }

    function tick(time) {
      if (previousTime !== null) {
        position = Math.min(steps, position + (time - previousTime) * speed() * steps / duration);
      }
      previousTime = time;
      frame = position === steps ? null : requestAnimationFrame(tick);
      paint();
    }

    function pause() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
      onState(false, position, steps);
    }

    function play() {
      if (frame !== null) return;
      if (position === steps) position = 0;
      frame = requestAnimationFrame(tick);
      paint();
    }

    function seek(next) {
      pause();
      position = Math.max(0, Math.min(steps, next));
      paint();
    }

    return {
      play, pause, seek,
      replay() { seek(0); play(); },
      step() { seek(Math.floor(position + 1e-8) + 1); },
      get playing() { return frame !== null; },
    };
  }

  globalThis.MatrixLabAnimation = { timeline };
})();
