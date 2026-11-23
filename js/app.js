(() => {
  "use strict";
  const math = globalThis.MatrixLabMath;
  const { shapes, definitions, atProgress, aroundCenter } = globalThis.MatrixLabTransform;
  const { html, number, pair, createPlot, matrix, vertices, equations } = globalThis.MatrixLabRenderer;
  const { timeline } = globalThis.MatrixLabAnimation;
  const byId = (id) => document.getElementById(id);

  function sliders(host, specs, update) {
    const bindings = specs.map(([name, min, max, step, initial, unit = ""]) => {
      const label = html("label", undefined, "slider");
      const caption = html("span", undefined, "slider-caption");
      const value = html("span", undefined, "slider-value");
      const input = html("input");
      input.type = "range";
      input.min = min;
      input.max = max;
      input.step = step;
      input.value = initial;
      input.setAttribute("aria-label", name);
      caption.append(html("span", name), value);
      label.append(caption, input);
      input.addEventListener("input", () => {
        showValues();
        update();
      });
      return { label, input, value, unit };
    });

    function showValues() {
      for (const { input, value, unit } of bindings) {
        value.textContent = number(input.valueAsNumber) + unit;
        input.setAttribute("aria-valuetext", value.textContent);
      }
    }

    host.replaceChildren(...bindings.map(({ label }) => label));
    showValues();
    return () => bindings.map(({ input }) => input.valueAsNumber);
  }

  function playback(host, progressHost, settings) {
    const button = (label, className) => html("button", label, className);
    const play = button("播放", "primary");
    const pause = button("暂停");
    const replay = button("重播");
    const step = button("单步");
    const progress = html("progress");
    const status = html("span");
    progress.setAttribute("aria-label", "播放进度");
    progressHost.className = "progress-line";
    progressHost.replaceChildren(progress, status);
    host.replaceChildren(play, pause, replay, step);
    let complete = false;
    const player = timeline({
      ...settings,
      onState(playing, position, total) {
        complete = position === total;
        play.disabled = playing;
        play.textContent = position > 0 && !complete ? "继续" : "播放";
        pause.disabled = !playing;
        step.disabled = complete && !settings.cycleSteps;
        progress.max = total;
        progress.value = position;
        status.textContent = settings.describe(position, total);
      },
    });
    play.addEventListener("click", player.play);
    pause.addEventListener("click", player.pause);
    replay.addEventListener("click", player.replay);
    step.addEventListener("click", () => {
      if (complete && settings.cycleSteps) player.seek(1);
      else player.step();
    });
    return player;
  }

  function initLesson() {
    const point = [2, 1, 1];
    const draw = createPlot(byId("lesson-plot"), "二维点及其平移结果", 7);
    const lift = byId("lift");
    const step = byId("lesson-step");
    let lifted = false;
    let rows = 0;
    let read;

    function render() {
      const values = math.translation(...read());
      const result = math.applyToPoint(values, point);
      const complete = rows === 3;
      lift.disabled = lifted;
      step.disabled = !lifted || complete;
      byId("lift-result").textContent = lifted ? "[2, 1]ᵀ → [2, 1, 1]ᵀ" : "[2, 1]ᵀ";
      byId("lesson-coordinate").textContent = complete
        ? "P′ = " + pair(result) + "，w′ = " + result[2]
        : "P = " + pair(point) + (lifted ? "，w = 1" : "");
      matrix(byId("lesson-matrix"), values, "T");
      equations(byId("lesson-rows"), values, point, rows);
      draw([point], complete ? [result] : []);
    }

    function reset() {
      lifted = false;
      rows = 0;
      read = sliders(byId("lesson-inputs"), definitions.translation.controls, () => {
        rows = 0;
        render();
      });
      render();
    }

    lift.addEventListener("click", () => { lifted = true; render(); });
    step.addEventListener("click", () => { rows++; render(); });
    byId("lesson-reset").addEventListener("click", reset);
    reset();
  }

  function initLab() {
    const shape = byId("lab-shape");
    const draw = createPlot(byId("lab-plot"), "原始图形与变换后的图形");
    const buttons = byId("lab-types");
    const progress = byId("lab-progress");
    let type = "translation";
    let read;
    const player = timeline({
      steps: 1,
      duration: 1400,
      render(position) {
        const before = shapes[shape.value];
        const current = atProgress(type, read(), position);
        const after = math.applyToVertices(current, before);
        draw(before, after);
        matrix(byId("lab-matrix"), current, definitions[type].symbol);
        vertices(byId("lab-vertices"), before, after);
        progress.hidden = position === 1;
        progress.textContent = "动画进度 " + Math.round(position * 100) + "% · 计算区显示当前帧";
      },
    });

    function configure(neutral = false) {
      const definition = definitions[type];
      const specs = definition.controls.map((spec, index) => {
        if (!neutral) return spec;
        const [name, min, max, step, , unit] = spec;
        return [name, min, max, step, definition.neutral[index], unit];
      });
      for (const input of buttons.querySelectorAll("input")) input.checked = input.value === type;
      byId("lab-note").textContent = definition.note;
      read = sliders(byId("lab-inputs"), specs, () => player.seek(1));
      player.seek(1);
    }

    for (const [key, { name }] of Object.entries(definitions)) {
      const label = html("label");
      const input = html("input");
      input.type = "radio";
      input.name = "transform";
      input.value = key;
      input.addEventListener("change", () => { type = key; configure(); });
      label.append(input, html("span", name));
      buttons.append(label);
    }
    shape.addEventListener("change", () => player.seek(1));
    byId("lab-play").addEventListener("click", player.replay);
    byId("lab-reset").addEventListener("click", () => {
      shape.value = "triangle";
      type = "translation";
      configure(true);
    });
    configure();
    return { pause() { if (player.playing) player.seek(1); } };
  }

  function initAnimation() {
    const select = byId("animation-mode");
    const speed = byId("animation-speed");
    const draw = createPlot(byId("animation-plot"), "动态显示矩阵变换", 7);
    const values = { translation: [4, 2], rotation: [90], scaling: [1.8, 0.5] };
    const before = shapes.triangle;
    const player = playback(byId("animation-playback"), byId("animation-progress"), {
      steps: 3,
      duration: 3000,
      speed: () => Number(speed.value),
      describe(position, total) {
        return select.value === "product"
          ? "已计算 " + Math.floor(position) + " / " + total + " 行"
          : Math.round(position / total * 100) + "%";
      },
      render(position, total) {
        const mode = select.value;
        const worksheet = mode === "product";
        const transform = worksheet ? math.translation(...values.translation) : atProgress(mode, values[mode], position / total);
        const result = math.applyToPoint(transform, before[0]);
        const ready = !worksheet || position === total;
        draw(worksheet ? [before[0]] : before, ready ? math.applyToVertices(transform, worksheet ? [before[0]] : before) : [], { pointLabel: "A" });
        matrix(byId("animation-matrix"), transform, worksheet ? "T" : definitions[mode].symbol);
        equations(byId("animation-rows"), transform, before[0], worksheet ? Math.floor(position) : 3);
        byId("animation-point").textContent = "A = " + pair(before[0]) + (ready ? " → A′ = " + pair(result) : " · 等待三行计算完成");
      },
    });

    select.addEventListener("change", () => player.seek(0));
    player.seek(0);
    return player;
  }

  function initComposition() {
    const [left, right] = ["experiment-a", "experiment-b"].map((id) => {
      const card = byId(id);
      const draw = createPlot(card.querySelector(".experiment-plot"), card.querySelector("h2").textContent, 13);
      const point = card.querySelector(".experiment-point");
      const current = html("div");
      const final = html("div");
      card.querySelector(".experiment-matrices").append(current, final);
      return { draw, point, current, final };
    });
    const useCenter = byId("use-center");
    const centerHost = byId("center-inputs");
    const note = byId("center-note");
    const source = shapes.triangle;
    let settings;

    function update() {
      const [tx, ty, angle] = read();
      const center = useCenter.checked ? readCenter() : null;
      const rotate = (progress) => center ? aroundCenter(angle * progress, center) : math.rotation(angle * progress);
      const move = (progress) => math.translation(tx * progress, ty * progress);
      settings = { rotate, move, center, final: [math.compose([move(1), rotate(1)]), math.compose([rotate(1), move(1)])] };
      centerHost.hidden = !center;
      note.hidden = !center;
      if (center) note.textContent = "C = " + pair(center) + "。R꜀ = T(C) × R × T(−C)，先将中心移至原点。";
      const symbol = center ? "R꜀" : "R";
      matrix(left.final, settings.final[0], symbol + " × T");
      matrix(right.final, settings.final[1], "T × " + symbol);
      const [pointA, pointB] = settings.final.map((value) => math.applyToPoint(value, source[0]));
      const same = settings.final[0].every((row, i) =>
        row.every((value, j) => Math.abs(value - settings.final[1][i][j]) < 1e-9));
      byId("composition-explanation").textContent =
        "先执行 M₁，再执行 M₂，列向量的总矩阵为 M₂ × M₁。"
        + " 顶点 A 的最终坐标为 " + pair(pointA) + "（实验 A）与 " + pair(pointB) + "（实验 B）。"
        + (same ? " 当前参数恰好使两种顺序得到相同结果。改变平移量或旋转角可观察不相同的情形。"
          : " 两个结果不同，说明矩阵乘法一般不满足交换律。");
      player.seek(2);
    }

    const read = sliders(byId("composition-inputs"), [
      ["tx", -4, 4, 0.25, 2], ["ty", -4, 4, 0.25, 0], ["θ", -180, 180, 1, 90, "°"],
    ], update);
    const readCenter = sliders(centerHost, [["cx", -3, 3, 0.25, 1], ["cy", -3, 3, 0.25, 1]], update);
    const player = playback(byId("composition-playback"), byId("composition-progress"), {
      steps: 2,
      duration: 3200,
      cycleSteps: true,
      describe(position) {
        if (position === 0) return "初始图形 · 0 / 2";
        if (position === 2) return "最终结果 · 2 / 2";
        if (position === 1) return "第一步完成 · 1 / 2";
        return position < 1 ? "正在执行第一步" : "正在执行第二步";
      },
      render(position) {
        const { move, rotate, center } = settings;
        const first = Math.min(1, position);
        const second = Math.max(0, position - 1);
        const current = [math.compose([move(first), rotate(second)]), math.compose([rotate(first), move(second)])];
        [left, right].forEach((panel, index) => {
          const after = math.applyToVertices(current[index], source);
          panel.draw(source, after, { center });
          panel.point.textContent = "当前 A′ = " + pair(after[0]);
          if (position < 2) matrix(panel.current, current[index], "当前 M");
          else panel.current.replaceChildren();
        });
      },
    });
    useCenter.addEventListener("change", update);
    update();
    return player;
  }

  initLesson();
  const lab = initLab();
  const animation = initAnimation();
  const composition = initComposition();
  globalThis.MatrixLabQuiz.init(byId("quiz-form"));

  const links = [...document.querySelectorAll("nav a")];
  function navigate() {
    const active = links.find((link) => link.hash === location.hash) || links[1];
    for (const link of links) {
      byId(link.hash.slice(1)).hidden = link !== active;
      if (link === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (active.hash !== "#lab") lab.pause();
    if (active.hash !== "#animation") animation.pause();
    if (active.hash !== "#composition") composition.pause();
  }

  window.addEventListener("hashchange", () => {
    navigate();
    window.scrollTo(0, 0);
  });
  navigate();
})();
