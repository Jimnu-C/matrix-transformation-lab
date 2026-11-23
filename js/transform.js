(() => {
  "use strict";
  const math = globalThis.MatrixLabMath;
  const shapes = {
    triangle: [[1, 0, 1], [3, 0, 1], [1, 2, 1]],
    square: [[0, 0, 1], [2, 0, 1], [2, 2, 1], [0, 2, 1]],
  };
  for (const points of Object.values(shapes)) {
    points.forEach(Object.freeze);
    Object.freeze(points);
  }

  const definitions = {
    translation: { name: "平移", symbol: "T", make: math.translation, neutral: [0, 0],
      controls: [["tx", -5, 5, 0.1, 2], ["ty", -5, 5, 0.1, 1]],
      note: "每个顶点沿 x、y 轴移动相同的距离。" },
    rotation: { name: "旋转", symbol: "R", make: math.rotation, neutral: [0],
      controls: [["θ", -180, 180, 1, 45, "°"]],
      note: "绕原点旋转。正角逆时针，负角顺时针。" },
    scaling: { name: "缩放", symbol: "S", make: math.scaling, neutral: [1, 1],
      controls: [["sx", -3, 3, 0.1, 1.5], ["sy", -3, 3, 0.1, 0.8]],
      note: "以原点为中心。负比例使对应分量反向，零比例压缩一个维度。" },
    shear: { name: "错切", symbol: "H", make: math.shear, neutral: [0, 0],
      controls: [["kx", -2, 2, 0.1, 0.5], ["ky", -2, 2, 0.1, 0]],
      note: "新分量 x′、y′ 都由同一个原始顶点计算。" },
  };

  function atProgress(type, values, progress) {
    const { neutral, make } = definitions[type];
    return make(...values.map((value, index) =>
      neutral[index] + (value - neutral[index]) * progress));
  }

  function aroundCenter(degrees, [x, y]) {
    return math.compose([math.translation(-x, -y), math.rotation(degrees), math.translation(x, y)]);
  }

  globalThis.MatrixLabTransform = { shapes, definitions, atProgress, aroundCenter };
})();
