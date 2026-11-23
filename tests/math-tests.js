"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  multiply, applyToPoint, applyToVertices, compose,
  translation, rotation, scaling, shear, toSvgPoint,
} = require("../js/matrix.js");

function assertPoint(actual, expected) {
  assert.equal(actual.length, expected.length);
  expected.forEach((value, index) => {
    assert.ok(Math.abs(actual[index] - value) <= 1e-9,
      `component ${index}: expected ${value}, got ${actual[index]}`);
  });
}

test("matrix product uses rows of the left operand and columns of the right", () => {
  const left = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
  const right = [[-2, 1, 0], [3, 0, 0], [4, 5, 1]];
  assert.deepEqual(multiply(left, right), [[16, 16, 3], [19, 20, 4], [8, 5, 0]]);
});

test("a matrix left-multiplies a homogeneous column vector", () => {
  const matrix = [[2, -1, 3], [4, 5, -2], [0, 0, 1]];
  assert.deepEqual(applyToPoint(matrix, [2, -1, 1]), [8, 1, 1]);
});

test("translation shifts both axes and preserves w", () => {
  assert.deepEqual(translation(-3, 4), [[1, 0, -3], [0, 1, 4], [0, 0, 1]]);
  assert.deepEqual(applyToPoint(translation(-3, 4), [2, -1, 1]), [-1, 3, 1]);
});

test("positive 90 degrees rotates counterclockwise", () => {
  assertPoint(applyToPoint(rotation(90), [1, 0, 1]), [0, 1, 1]);
  assertPoint(applyToPoint(rotation(90), [0, 1, 1]), [-1, 0, 1]);
});

test("negative 90 degrees rotates clockwise", () => {
  assertPoint(applyToPoint(rotation(-90), [1, 0, 1]), [0, -1, 1]);
});

test("scaling supports independent factors, reflection and collapse", () => {
  assert.deepEqual(applyToPoint(scaling(2, 3), [3, -5, 1]), [6, -15, 1]);
  assert.deepEqual(applyToPoint(scaling(-2, 0), [3, -5, 1]), [-6, 0, 1]);
});

test("each shear component uses the original coordinates", () => {
  assert.deepEqual(shear(2, -1), [[1, 2, 0], [-1, 1, 0], [0, 0, 1]]);
  assert.deepEqual(applyToPoint(shear(2, -1), [3, 4, 1]), [11, 1, 1]);
});

test("composition accepts transforms in execution order", () => {
  const move = translation(2, 0);
  const turn = rotation(90);
  const point = [1, 0, 1];
  assert.deepEqual(compose([move, turn]), multiply(turn, move));
  assertPoint(applyToPoint(compose([move, turn]), point), [0, 3, 1]);
  assertPoint(applyToPoint(compose([turn, move]), point), [2, 1, 1]);
  assertPoint(applyToPoint(compose([move, turn, scaling(2, 3)]), point), [0, 9, 1]);
  assert.deepEqual(applyToPoint(compose([]), point), point);
});

test("all transformed triangle vertices are correct and the source is preserved", () => {
  const vertices = Object.freeze([[0, 0, 1], [2, 0, 1], [0, 1, 1]].map(Object.freeze));
  const result = applyToVertices(compose([rotation(90), translation(2, -1)]), vertices);
  const expected = [[2, -1, 1], [2, 1, 1], [1, -1, 1]];
  assert.equal(result.length, expected.length);
  result.forEach((vertex, index) => assertPoint(vertex, expected[index]));
  assert.deepEqual(vertices, [[0, 0, 1], [2, 0, 1], [0, 1, 1]]);
});

test("SVG mapping offsets and scales coordinates and flips the y-axis once", () => {
  const viewport = { originX: 100, originY: 80, scale: 10 };
  assert.deepEqual(toSvgPoint([0, 0, 1], viewport), [100, 80]);
  assert.deepEqual(toSvgPoint([2, 3, 1], viewport), [120, 50]);
  assert.deepEqual(toSvgPoint([-2, -3, 1], viewport), [80, 110]);
  assertPoint(toSvgPoint(applyToPoint(rotation(90), [1, 0, 1]), viewport), [100, 70]);
});

test("invalid matrix, point, angle and SVG scale are rejected", () => {
  assert.throws(() => multiply([[1]], translation(0, 0)), TypeError);
  assert.throws(() => applyToPoint(scaling(1, 1), [1, NaN, 1]), TypeError);
  assert.throws(() => rotation(Infinity), TypeError);
  assert.throws(() => toSvgPoint([1, 2, 0], { originX: 0, originY: 0, scale: 1 }), RangeError);
  assert.throws(() => toSvgPoint([1, 2, 1], { originX: 0, originY: 0, scale: 0 }), RangeError);
});
