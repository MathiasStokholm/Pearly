const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function setPatternVisibility(pattern, visible) {
  pattern.toggleAttribute("hidden", !visible);
}

export function renderBeadSvg(pattern, output, columns, rows, document) {
  const beadSize = 18;
  const padding = 5;
  const width = columns * beadSize + padding * 2;
  const height = rows * beadSize + padding * 2;
  pattern.setAttribute("xmlns", SVG_NAMESPACE);
  pattern.setAttribute("width", width);
  pattern.setAttribute("height", height);
  pattern.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const shapes = document.createDocumentFragment();

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const pixel = (row * columns + column) * 4;
      const x = padding + column * beadSize;
      const y = padding + row * beadSize;
      const fill = colorToHex(output[pixel], output[pixel + 1], output[pixel + 2]);
      appendCircle(document, shapes, x + beadSize / 2, y + beadSize / 2, beadSize * 0.44, fill);
      appendCircle(document, shapes, x + beadSize / 2, y + beadSize / 2, beadSize * 0.13, "#41352d", ".3");
      appendCircle(document, shapes, x + beadSize * 0.43, y + beadSize * 0.41, beadSize * 0.055, "#fff", ".7");
    }
  }
  pattern.replaceChildren(shapes);
}

function appendCircle(document, parent, cx, cy, radius, fill, fillOpacity) {
  const circle = document.createElementNS(SVG_NAMESPACE, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", radius);
  circle.setAttribute("fill", fill);
  if (fillOpacity) circle.setAttribute("fill-opacity", fillOpacity);
  parent.append(circle);
}

function colorToHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
