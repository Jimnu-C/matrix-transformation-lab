(() => {
  "use strict";

  function assertFinite(value, name) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
  }

  function isVector3(vector) {
    return Array.isArray(vector) && vector.length === 3
      && Number.isFinite(vector[0]) && Number.isFinite(vector[1]) && Number.isFinite(vector[2]);
  }

  function assertMatrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 3
      || !isVector3(matrix[0]) || !isVector3(matrix[1]) || !isVector3(matrix[2])) {
      throw new TypeError("matrix must contain three rows of three finite numbers");
    }
  }

  function assertPoint(point) {
    if (!isVector3(point)) {
      throw new TypeError("point must contain three finite numbers");
    }
  }

  function identity() {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }

  function dot(left, right) {
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
  }

  function multiply(left, right) {
    assertMatrix(left);
    assertMatrix(right);
    const columns = right[0].map((_, column) =>
      [right[0][column], right[1][column], right[2][column]]);
    return left.map((row) => columns.map((column) => dot(row, column)));
  }

  function applyToPoint(matrix, point) {
    assertMatrix(matrix);
    assertPoint(point);
    return matrix.map((row) => dot(row, point));
  }

  function applyToVertices(matrix, vertices) {
    assertMatrix(matrix);
    return Array.from(vertices, (point) => {
      assertPoint(point);
      return matrix.map((row) => dot(row, point));
    });
  }

  // The input is ordered by execution: [M1, M2, …] applies M1 first.
  function compose(matrices) {
    return matrices.reduce((combined, next) => multiply(next, combined), identity());
  }

  function translation(tx, ty) {
    assertFinite(tx, "tx");
    assertFinite(ty, "ty");
    return [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
  }

  function rotation(degrees) {
    assertFinite(degrees, "degrees");
    const radians = degrees * (Math.PI / 180);
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return [[cosine, -sine, 0], [sine, cosine, 0], [0, 0, 1]];
  }

  function scaling(sx, sy) {
    assertFinite(sx, "sx");
    assertFinite(sy, "sy");
    return [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
  }

  function shear(kx, ky) {
    assertFinite(kx, "kx");
    assertFinite(ky, "ky");
    return [[1, kx, 0], [ky, 1, 0], [0, 0, 1]];
  }

  function toSvgPoint(point, { originX, originY, scale }) {
    assertPoint(point);
    assertFinite(originX, "originX");
    assertFinite(originY, "originY");
    assertFinite(scale, "scale");
    const [x, y, w] = point;
    if (w !== 1 || scale <= 0) {
      throw new RangeError("SVG mapping requires w = 1 and scale > 0");
    }
    return [originX + scale * x, originY - scale * y];
  }

  const math = Object.freeze({
    identity, multiply, applyToPoint, applyToVertices, compose,
    translation, rotation, scaling, shear, toSvgPoint,
  });

  if (typeof module === "object" && module.exports) {
    module.exports = math;
  } else {
    globalThis.MatrixLabMath = math;
  }
})();
