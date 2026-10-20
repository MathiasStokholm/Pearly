import assert from "node:assert/strict";
import test from "node:test";
import { renderBeadSvg } from "./pattern.mjs";

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

test("renders an SVG image containing three circles for each bead", () => {
  const pattern = new SvgNode(SVG_NAMESPACE, "svg");

  renderBeadSvg(pattern, [255, 0, 0, 255, 0, 255, 0, 255], 2, 1, document);

  assert.equal(pattern.attributes.get("xmlns"), SVG_NAMESPACE);
  assert.equal(pattern.attributes.get("width"), "46");
  assert.equal(pattern.attributes.get("height"), "28");
  assert.equal(pattern.attributes.get("viewBox"), "0 0 46 28");
  assert.equal(pattern.children.length, 6);
  assert.ok(pattern.children.every((circle) => (
    circle.namespace === SVG_NAMESPACE && circle.name === "circle"
  )));
  assert.deepEqual(
    pattern.children.filter((circle) => circle.attributes.get("r") === "7.92")
      .map((circle) => circle.attributes.get("fill")),
    ["#ff0000", "#00ff00"],
  );
});
