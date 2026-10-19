import init, { bead_pattern } from "./pkg/pearly.js";

const upload = document.querySelector("#image-input");
const original = document.querySelector("#original");
const emptyOriginal = document.querySelector("#empty-original");
const emptyPattern = document.querySelector("#empty-pattern");
const canvas = document.querySelector("#pattern");
const columnsInput = document.querySelector("#columns");
const downloadButton = document.querySelector("#download");
const fileName = document.querySelector("#file-name");
const patternSize = document.querySelector("#pattern-size");
const beadCount = document.querySelector("#bead-count");
const colorCount = document.querySelector("#color-count");
const context = canvas.getContext("2d");

let image = null;
let objectUrl = null;
let wasmReady = false;

await init();
wasmReady = true;

upload.addEventListener("change", () => {
  const file = upload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    fileName.textContent = "Please choose an image file";
    return;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  const nextImage = new Image();
  nextImage.onload = () => {
    image = nextImage;
    original.src = objectUrl;
    original.hidden = false;
    emptyOriginal.hidden = true;
    fileName.textContent = file.name;
    renderPattern();
  };
  nextImage.onerror = () => {
    fileName.textContent = "Could not read that picture. Try another one.";
  };
  nextImage.src = objectUrl;
});

columnsInput.addEventListener("input", renderPattern);
downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "pearly-bead-pattern.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

function renderPattern() {
  if (!wasmReady || !image) return;
  const columns = Math.max(8, Math.min(100, Number.parseInt(columnsInput.value, 10) || 30));
  columnsInput.value = columns;
  const rows = Math.max(1, Math.round(columns * image.naturalHeight / image.naturalWidth));
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const source = document.createElement("canvas");
  source.width = sourceWidth;
  source.height = sourceHeight;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, sourceWidth, sourceHeight);
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const pixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
  const pattern = bead_pattern(pixels, sourceWidth, sourceHeight, columns, rows);
  const output = new ImageData(new Uint8ClampedArray(pattern), columns, rows);
  const beadSize = 18;
  const padding = 5;
  canvas.width = columns * beadSize + padding * 2;
  canvas.height = rows * beadSize + padding * 2;
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const pixel = (row * columns + column) * 4;
      const x = padding + column * beadSize;
      const y = padding + row * beadSize;
      context.beginPath();
      context.arc(x + beadSize / 2, y + beadSize / 2, beadSize * 0.44, 0, Math.PI * 2);
      context.fillStyle = `rgb(${output.data[pixel]},${output.data[pixel + 1]},${output.data[pixel + 2]})`;
      context.fill();
      context.beginPath();
      context.arc(x + beadSize / 2, y + beadSize / 2, beadSize * 0.13, 0, Math.PI * 2);
      context.fillStyle = "rgba(65, 53, 45, .3)";
      context.fill();
      context.beginPath();
      context.arc(x + beadSize * 0.43, y + beadSize * 0.41, beadSize * 0.055, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, .7)";
      context.fill();
    }
  }

  const colors = new Set();
  for (let index = 0; index < output.data.length; index += 4) {
    colors.add(`${output.data[index]},${output.data[index + 1]},${output.data[index + 2]}`);
  }
  canvas.hidden = false;
  emptyPattern.hidden = true;
  downloadButton.disabled = false;
  patternSize.textContent = `${columns} × ${rows}`;
  beadCount.textContent = `${columns * rows} beads`;
  colorCount.textContent = `${colors.size} ${colors.size === 1 ? "color" : "colors"}`;
}
