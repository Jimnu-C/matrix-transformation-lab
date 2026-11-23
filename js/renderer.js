(() => {
  "use strict";
  const math = globalThis.MatrixLabMath;
  const formatter = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 3, useGrouping: false });
  const number = (value) => formatter.format(Math.abs(value) < 0.0005 ? 0 : value);
  const pair = ([x, y]) => "(" + number(x) + ", " + number(y) + ")";
  const vertex = (index) => String.fromCharCode(65 + index);
  const html = (tag, content, className) => {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    if (className) node.className = className;
    return node;
  };

  function svg(tag, attributes, content) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function createPlot(host, title, extent = 10) {
    const width = 560;
    const height = 420;
    const viewport = { originX: width / 2, originY: height / 2, scale: 185 / extent };
    const map = (point) => math.toSvgPoint(point, viewport);
    const canvas = svg("svg", { viewBox: "0 0 " + width + " " + height, class: "plot", role: "img", "aria-label": title });
    const grid = svg("g", { "aria-hidden": "true" });
    const layers = svg("g", { "aria-hidden": "true" });
    canvas.append(grid, layers);
    host.replaceChildren(canvas);
    const limitX = Math.floor(252 / viewport.scale);
    const labelStep = extent >= 8 ? 2 : 1;

    function line(x1, y1, x2, y2, className) {
      const [sx, sy] = map([x1, y1, 1]);
      const [ex, ey] = map([x2, y2, 1]);
      grid.append(svg("line", { x1: sx, y1: sy, x2: ex, y2: ey, class: className }));
    }

    function label(x, y, text, dx, dy) {
      const [sx, sy] = map([x, y, 1]);
      grid.append(svg("text", { x: sx + dx, y: sy + dy, class: "tick" }, text));
    }

    for (let x = -limitX; x <= limitX; x++) {
      if (x === 0) continue;
      line(x, -extent, x, extent, "grid-line");
      if (x % labelStep === 0) {
        line(x, -0.14, x, 0.14, "axis");
        label(x, 0, x, -6, 17);
      }
    }
    for (let y = -extent; y <= extent; y++) {
      if (y === 0) continue;
      line(-limitX, y, limitX, y, "grid-line");
      if (y % labelStep === 0) {
        line(-0.14, y, 0.14, y, "axis");
        label(0, y, y, -20, 4);
      }
    }
    line(-limitX, 0, limitX, 0, "axis");
    line(0, -extent, 0, extent, "axis");
    line(limitX, 0, limitX - 0.3, 0.18, "axis");
    line(limitX, 0, limitX - 0.3, -0.18, "axis");
    line(0, extent, 0.18, extent - 0.3, "axis");
    line(0, extent, -0.18, extent - 0.3, "axis");
    label(0, 0, 0, -14, 17);
    label(limitX, 0, "x", 8, -6);
    label(0, extent, "y", 8, -4);

    function shape(points, target, firstLabel) {
      if (!points.length) return;
      const group = svg("g", { class: target ? "plot-target" : "plot-source" });
      const pixels = points.map(map);
      const labels = [];
      if (points.length > 1) {
        group.append(svg("polygon", { points: pixels.map((point) => point.join(",")).join(" ") }));
      }
      pixels.forEach(([x, y], index) => {
        group.append(svg("circle", { cx: x, cy: y, r: target ? 3.4 : 5.5 }));
        const name = (points.length === 1 ? firstLabel : vertex(index)) + (target ? "′" : "");
        const nearby = labels.find((entry) => Math.hypot(x - entry.x, y - entry.y) < 16);
        if (nearby) nearby.names.push(name);
        else labels.push({ x, y, names: [name] });
      });
      for (const { x, y, names } of labels) {
        group.append(svg("text", { x: x + 8, y: y + (target ? -8 : 16) }, names.join(" / ")));
      }
      layers.append(group);
    }

    return (before, after, { center, pointLabel = "P" } = {}) => {
      layers.replaceChildren();
      shape(before, false, pointLabel);
      shape(after, true, pointLabel);
      if (center) {
        const [x, y] = map([...center, 1]);
        layers.append(svg("path", { d: "M " + (x - 5) + " " + y + " h 10 M " + x + " " + (y - 5) + " v 10", class: "center-mark" }));
        layers.append(svg("text", { x: x + 8, y: y - 8, class: "tick" }, "C"));
      }
    };
  }

  function matrix(host, values, name) {
    const display = html("div", undefined, "matrix-display");
    const brackets = html("div", undefined, "matrix-brackets");
    brackets.setAttribute("role", "img");
    brackets.setAttribute("aria-label", values.map((row) => row.map(number).join("，")).join("；"));
    brackets.append(...values.flat().map((value) => html("span", number(value))));
    display.append(html("span", name + " ="), brackets);
    host.replaceChildren(display);
  }

  function vertices(host, before, after) {
    const table = html("table");
    table.innerHTML = "<thead><tr><th scope='col'>顶点</th><th scope='col'>原始</th><th scope='col'>变换后</th></tr></thead>";
    const body = table.createTBody();
    before.forEach((point, index) => {
      const row = body.insertRow();
      const heading = html("th", vertex(index));
      heading.scope = "row";
      row.append(heading, html("td", pair(point)), html("td", pair(after[index]), "target-value"));
    });
    host.replaceChildren(table);
  }

  function equations(host, values, point, revealed) {
    const result = math.applyToPoint(values, point);
    host.replaceChildren(...["x′", "y′", "w′"].map((symbol, index) => {
      if (index >= revealed) return html("p", symbol + " = …", "pending");
      const terms = values[index].map((value, column) => "(" + number(value) + ") × " + number(point[column]));
      const exact = [...values[index], ...point, result[index]].every((value) => Number(number(value)) === value);
      return html("p", symbol + " = " + terms.join(" + ") + (exact ? " = " : " ≈ ") + number(result[index]));
    }));
  }

  globalThis.MatrixLabRenderer = { html, number, pair, createPlot, matrix, vertices, equations };
})();
