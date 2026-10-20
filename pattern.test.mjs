import assert from "node:assert/strict";
import test from "node:test";
import { renderBeadSvg, setPatternVisibility } from "./pattern.mjs";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

class SvgNode {
  constructor(namespace, name) {
    this.namespace = namespace;
    this.name = name;
    this.attributes = new Map();
    this.children = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  toggleAttribute(name, force) {
    if (force) this.attributes.set(name, "");
    else this.attributes.delete(name);
  }

  append(child) {
    this.children.push(child);
  }

  replaceChildren(fragment) {
    this.children = fragment.children;
  }
}

const document = {
  createDocumentFragment: () => new SvgNode(null, "#document-fragment"),
  createElementNS: (namespace, name) => new SvgNode(namespace, name),
};

test("toggles the hidden attribute on the SVG pattern", () => {
  const pattern = new SvgNode(SVG_NAMESPACE, "svg");
  pattern.setAttribute("hidden", "");

  setPatternVisibility(pattern, true);
  assert.equal(pattern.attributes.has("hidden"), false);

  setPatternVisibility(pattern, false);
  assert.equal(pattern.attributes.has("hidden"), true);
});

test("renders an SVG image containing three circles for each bead", () => {
  const pattern = new SvgNode(SVG_NAMESPACE, "svg");

  renderBeadSvg(pattern, [255, 0, 0, 255, 0, 255, 0, 255], 2, 1, document);

  assert.equal(pattern.attributes.get("xmlns"), SVG_NAMESPACE);
  assert.equal(pattern.attributes.get("width"), "46");
  assert.equal(pattern.attributes.get("height"), "28");
  assert.equal(pattern.attributes.get("viewBox"), "0 0 46 28");
  assert.equal(pattern.children.filter((shape) => shape.name === "circle").length, 6);
  assert.ok(pattern.children.filter((shape) => shape.name === "circle").every((circle) => (
    circle.namespace === SVG_NAMESPACE && circle.name === "circle"
  )));
  assert.deepEqual(
    pattern.children.filter((circle) => circle.attributes.get("r") === "8.64")
      .map((circle) => circle.attributes.get("fill")),
    ["#ff0000", "#00ff00"],
  );
});

test("renders a visible square grid of 29-by-29 bead boards", () => {
  const pattern = new SvgNode(SVG_NAMESPACE, "svg");
  const beadsPerSide = 58;
  const output = new Uint8Array(beadsPerSide * beadsPerSide * 4);

  renderBeadSvg(pattern, output, beadsPerSide, beadsPerSide, document);

  assert.equal(pattern.attributes.get("width"), "1054");
  assert.equal(pattern.attributes.get("height"), "1054");
  const boards = pattern.children.filter((shape) => shape.name === "rect");
  assert.equal(boards.length, 4);
  assert.deepEqual(
    boards.map((board) => [
      board.attributes.get("x"),
      board.attributes.get("y"),
      board.attributes.get("width"),
      board.attributes.get("height"),
    ]),
    [
      ["5", "5", "522", "522"],
      ["527", "5", "522", "522"],
      ["5", "527", "522", "522"],
      ["527", "527", "522", "522"],
    ],
  );
});
