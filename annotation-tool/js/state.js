// js/state.js
export let mode = 'number';
export let annotations = [];
export let selected = null;
export let originalImageSize = { width: 0, height: 0 };
export let dragging = null;
export let drawing = false;
export let isPanning = false;
export let spacebarDown = false;
export let shiftPressed = false;
export let panStart = { x: 0, y: 0 };
export let startPos = { x: 0, y: 0 };
export let tempShape = null;
export let color = "#ff0000";
export let arrowStyle = "classic";
export let numberSize = 18;
export let numberSizeChangedByUser = false;
export let fontFamily = '"Noto Sans TC", "思源黑體", sans-serif';
export let fontSize = 24;
export let fontSizeChangedByUser = false;
export let textBgEnabled = false;
export let textBgColor = "#ffffff";
export let numberBgEnabled = false;
export let numberBgColor = "#ffffff";
export let highlighterPath = [];
export let zoom = 1.0;
export let viewX = 0, viewY = 0;
export const MIN_ZOOM = 0.1, MAX_ZOOM = 10;
export let history = [];
export let historyIndex = -1;
export function setMode(newMode) { mode = newMode; }
export function setAnnotations(newAnns) { annotations = newAnns; }
export function setSelected(newSelected) { selected = newSelected; }
export function setOriginalImageSize(width, height) { originalImageSize = { width, height }; }
export function setDragging(d) { dragging = d; }
export function setDrawing(d) { drawing = d; }
export function setPanning(p) { isPanning = p; }
export function setSpacebarDown(s) { spacebarDown = s; }
export function setShiftPressed(s) { shiftPressed = s; }
export function setPanStart(x, y) { panStart = { x, y }; }
export function setStartPos(x, y) { startPos = { x, y }; }
export function setTempShape(s) { tempShape = s; }
export function setColor(c) { color = c; }
export function setArrowStyle(style) { arrowStyle = style; }
export function setNumberSize(size, byUser = true) { numberSize = size; numberSizeChangedByUser = byUser; }
export function setFontSize(size, byUser = true) { fontSize = size; fontSizeChangedByUser = byUser; }
export function setNumberBg(enabled, bgColor) { numberBgEnabled = enabled; if (bgColor) numberBgColor = bgColor; }
export function setTextBg(enabled, bgColor) { textBgEnabled = enabled; if (bgColor) textBgColor = bgColor; }
export function setHighlighterPath(path) { highlighterPath = path; }
export function setFontFamily(font) { fontFamily = font; }
export function setZoom(z) { zoom = z; }
export function setView(x, y) { viewX = x; viewY = y; }
export function setHistory(h, i) { history = h; historyIndex = i; }