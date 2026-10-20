import init, { bead_palette, bead_pattern } from "./pkg/pearly.js";
import { renderBeadSvg, setPatternVisibility } from "./pattern.mjs";

const upload = document.querySelector("#image-input");
const original = document.querySelector("#original");
const originalContext = original.getContext("2d");
const emptyOriginal = document.querySelector("#empty-original");
const emptyPattern = document.querySelector("#empty-pattern");
const pattern = document.querySelector("#pattern");
const boardsInput = document.querySelector("#boards");
const boardsDecrementButton = document.querySelector("#boards-decrement");
const boardsIncrementButton = document.querySelector("#boards-increment");
const downloadButton = document.querySelector("#download");
const fileName = document.querySelector("#file-name");
const patternSize = document.querySelector("#pattern-size");
const beadCount = document.querySelector("#bead-count");
const colorCount = document.querySelector("#color-count");
const colorPicker = document.querySelector(".color-picker");
const colorPickerButton = document.querySelector("#color-picker-button");
const colorPickerSummary = document.querySelector("#color-picker-summary");
const colorMenu = document.querySelector("#color-menu");
const colorOptions = document.querySelector("#color-options");

let image = null;
let objectUrl = null;
let wasmReady = false;
let palette = [];

await init();
palette = Array.from(bead_palette()).reduce((colors, value, index, values) => {
  if (index % 3 === 0) colors.push(values.slice(index, index + 3));
  return colors;
}, []);
createColorOptions();
wasmReady = true;

upload.addEventListener("change", () => {
  const file = upload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    fileName.textContent = "Please choose an image file";
    return;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  const nextObjectUrl = URL.createObjectURL(file);
  objectUrl = nextObjectUrl;
  const nextImage = new Image();
  nextImage.onload = () => {
    if (objectUrl !== nextObjectUrl) return;
    image = nextImage;
    const scale = Math.min(1, 600 / Math.max(nextImage.naturalWidth, nextImage.naturalHeight));
    original.width = Math.max(1, Math.round(nextImage.naturalWidth * scale));
    original.height = Math.max(1, Math.round(nextImage.naturalHeight * scale));
    originalContext.drawImage(nextImage, 0, 0, original.width, original.height);
    original.hidden = false;
    emptyOriginal.hidden = true;
    fileName.textContent = file.name;
    renderPattern();
  };
  nextImage.onerror = () => {
    if (objectUrl !== nextObjectUrl) return;
    fileName.textContent = "Could not read that picture. Try another one.";
  };
  nextImage.src = nextObjectUrl;
});

boardsInput.addEventListener("input", () => {
  normalizeBoardCount();
  renderPattern();
});
boardsDecrementButton.addEventListener("click", () => adjustBoardCount(-1));
boardsIncrementButton.addEventListener("click", () => adjustBoardCount(1));
normalizeBoardCount();
downloadButton.addEventListener("click", () => {
  const svg = new XMLSerializer().serializeToString(pattern);
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.download = "pearly-bead-pattern.svg";
  link.href = objectUrl;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
});

colorPickerButton.addEventListener("click", () => {
  const isOpen = colorPickerButton.getAttribute("aria-expanded") === "true";
  colorPickerButton.setAttribute("aria-expanded", String(!isOpen));
  colorMenu.hidden = isOpen;
});

document.addEventListener("click", (event) => {
  if (!colorPicker.contains(event.target)) closeColorMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && colorPickerButton.getAttribute("aria-expanded") === "true") {
    closeColorMenu();
    colorPickerButton.focus();
  }
});

function renderPattern() {
  if (!wasmReady || !image) return;
  const selectedColors = Array.from(colorOptions.querySelectorAll("input:checked"))
    .map((input) => Number(input.value));
  if (selectedColors.length === 0) {
    setPatternVisibility(pattern, false);
    emptyPattern.hidden = false;
    emptyPattern.querySelector("p").textContent = "Select at least one color to make a pattern";
    downloadButton.disabled = true;
    patternSize.textContent = "";
    beadCount.textContent = "0 beads";
    colorCount.textContent = "0 colors";
    return;
  }

  const boardsPerSide = normalizeBoardCount();
  const columns = boardsPerSide * 29;
  const rows = columns;
  const sourceSize = Math.min(1600, Math.max(image.naturalWidth, image.naturalHeight));
  const source = document.createElement("canvas");
  source.width = sourceSize;
  source.height = sourceSize;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, sourceSize, sourceSize);
  const scale = Math.min(sourceSize / image.naturalWidth, sourceSize / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  sourceContext.drawImage(
    image,
    (sourceSize - imageWidth) / 2,
    (sourceSize - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );

  const pixels = sourceContext.getImageData(0, 0, sourceSize, sourceSize).data;
  const availableColors = new Uint8Array(selectedColors.flatMap((index) => palette[index]));
  const output = bead_pattern(pixels, sourceSize, sourceSize, columns, rows, availableColors);
  renderBeadSvg(pattern, output, columns, rows, document);

  const colors = new Set();
  for (let index = 0; index < output.length; index += 4) {
    colors.add(`${output[index]},${output[index + 1]},${output[index + 2]}`);
  }
  setPatternVisibility(pattern, true);
  emptyPattern.hidden = true;
  downloadButton.disabled = false;
  patternSize.textContent = `${boardsPerSide} × ${boardsPerSide} boards · ${columns} × ${rows} beads`;
  beadCount.textContent = `${columns * rows} beads`;
  colorCount.textContent = `${colors.size} ${colors.size === 1 ? "color" : "colors"}`;
}

function adjustBoardCount(change) {
  boardsInput.value = normalizeBoardCount() + change;
  normalizeBoardCount();
  renderPattern();
}

function normalizeBoardCount() {
  const boardsPerSide = Math.max(1, Math.min(4, Number.parseInt(boardsInput.value, 10) || 1));
  boardsInput.value = boardsPerSide;
  boardsDecrementButton.disabled = boardsPerSide === 1;
  boardsIncrementButton.disabled = boardsPerSide === 4;
  return boardsPerSide;
}

function createColorOptions() {
  palette.forEach((color, index) => {
    const hex = colorToHex(...color);
    const label = document.createElement("label");
    label.className = "color-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = index;
    checkbox.checked = true;
    checkbox.setAttribute("aria-label", `Use color ${hex}`);
    checkbox.addEventListener("change", () => {
      updateColorSummary();
      renderPattern();
    });
    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = hex;
    const code = document.createElement("span");
    code.textContent = hex;
    label.append(checkbox, swatch, code);
    colorOptions.append(label);
  });
}

function updateColorSummary() {
  const selectedCount = colorOptions.querySelectorAll("input:checked").length;
  colorPickerSummary.textContent = selectedCount === palette.length
    ? "Any color"
    : `${selectedCount} ${selectedCount === 1 ? "color" : "colors"}`;
}

function closeColorMenu() {
  colorMenu.hidden = true;
  colorPickerButton.setAttribute("aria-expanded", "false");
}

function colorToHex(red, green, blue) {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
