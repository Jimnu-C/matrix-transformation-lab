"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { fileURLToPath, pathToFileURL } = require("node:url");
const math = require("../js/matrix.js");
const root = path.resolve(__dirname, "..");

function loadScript(context, filename) {
  const script = fs.readFileSync(path.join(root, "js", filename), "utf8");
  vm.runInContext(script, context, { filename });
}

test("the entry point loads only project-local assets resolved from a file URL", () => {
  const entry = pathToFileURL(path.join(root, "index.html"));
  const page = fs.readFileSync(entry, "utf8");
  const assets = [...page.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)]
    .filter(([, url]) => url !== "data:,");
  assert.equal(assets.length, 7);
  for (const [, relative] of assets) {
    assert.match(relative, /^(?:css|js)\//);
    const asset = new URL(relative, entry);
    assert.equal(asset.protocol, "file:");
    assert.ok(fs.statSync(fileURLToPath(asset)).isFile(), relative);
  }
});

test("rotation about a chosen center fixes that point and rotates a nearby point", () => {
  const context = vm.createContext({ MatrixLabMath: math });
  loadScript(context, "transform.js");
  const matrix = context.MatrixLabTransform.aroundCenter(90, [2, -1]);
  const fixed = math.applyToPoint(matrix, [2, -1, 1]);
  const rotated = math.applyToPoint(matrix, [3, -1, 1]);
  for (const [actual, expected] of [[fixed, [2, -1, 1]], [rotated, [2, 0, 1]]]) {
    actual.forEach((coordinate, index) => assert.ok(Math.abs(coordinate - expected[index]) < 1e-9));
  }
});

test("timeline pauses, resumes with a new clock, steps, replays and finishes", () => {
  const pending = new Map();
  let nextId = 0;
  let position;
  let speed = 1;
  const context = vm.createContext({
    requestAnimationFrame(callback) {
      const id = ++nextId;
      pending.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { pending.delete(id); },
  });
  loadScript(context, "animation.js");
  const player = context.MatrixLabAnimation.timeline({
    steps: 3, duration: 3000, speed: () => speed,
    render(value) { position = value; },
  });

  function tick(timestamp) {
    assert.equal(pending.size, 1);
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    callback(timestamp);
  }

  player.play();
  tick(100);
  tick(600);
  assert.equal(position, 0.5);
  player.pause();
  assert.equal(pending.size, 0);
  assert.equal(position, 0.5);
  player.play();
  tick(3000);
  assert.equal(position, 0.5);
  speed = 2;
  tick(3250);
  assert.equal(position, 1);
  player.step();
  assert.equal(position, 2);
  assert.equal(player.playing, false);
  player.replay();
  assert.equal(position, 0);
  tick(5000);
  tick(6500);
  assert.equal(position, 3);
  assert.equal(player.playing, false);
  assert.equal(pending.size, 0);
});
