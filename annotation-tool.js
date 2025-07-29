// --- Polyfill ---
window.requestIdleCallback = window.requestIdleCallback || function(cb) { return setTimeout(() => { const start = Date.now(); cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }); }, 1); };
window.cancelIdleCallback = window.cancelIdleCallback || function(id) { clearTimeout(id); };

// --- Global Variables ---
let mode = 'number';
let annotations = [];
let dragging = null, offsetX = 0, offsetY = 0;
let drawing = false, startX = 0, startY = 0, shiftPressed = false;
let img = null;
let originalImageSize = { width: 0, height: 0 };
let selected = null;
let tempShape = null;
let color = "#ff0000";
let arrowStyle = "classic";
let numberSize = 18;
let numberBgEnabled = false;
let numberBgColor = "#ffffff";
let fontFamily = '"Noto Sans TC", "思源黑體", sans-serif';
let fontSize = 24;
let textBgEnabled = false;
let textBgColor = "#ffffff";
let highlighterPath = [];
let brushImage = null;
let isBrushReady = false;
let lastMouseX = 0, lastMouseY = 0;

// --- Mobile & Long Press Variables ---
let longPressTimer = null;
let longPressTriggered = false;

// History for Undo/Redo
let history = [];
let historyIndex = -1;

// --- Zoom and Pan Variables ---
let zoom = 1.0;
let viewX = 0, viewY = 0;
let isPanning = false;
let spacebarDown = false;
let panStart = { x: 0, y: 0 };
let pinchStartDist = 0;
const MIN_ZOOM = 0.1, MAX_ZOOM = 10;

// --- DOM Elements ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const textInputContainer = document.getElementById('textInputContainer');
const textInputArea = document.getElementById('textInputArea');
const textConfirmBtn = document.getElementById('textConfirmBtn');
const textCancelBtn = document.getElementById('textCancelBtn');
const moveNumberInput = document.getElementById('moveNumberInput');
const imgInput = document.getElementById('imgInput');
const canvasContainer = document.getElementById('canvas-container');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const numberBtn = document.getElementById('numberBtn');
const ellipseBtn = document.getElementById('ellipseBtn');
const rectBtn = document.getElementById('rectBtn');
const textBtn = document.getElementById('textBtn');
const arrowBtn = document.getElementById('arrowBtn');
const highlighterBtn = document.getElementById('highlighterBtn');
const circleMenu = document.getElementById('circleMenu');
const textMenu = document.getElementById('textMenu');
const arrowMenu = document.getElementById('arrowMenu');
let zoomInBtn, zoomOutBtn, zoomFitBtn;

// --- Initialization ---
function initialize() {
    setupIcons();
    setupMenus();
    setupEventListeners();
    createBrush();
    setMode('number');
    resizeCanvas();
    updateToolbarState();
    saveState();
}

function setupIcons() {
    document.getElementById('undoBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="13 8 9 12 13 16"></polyline></svg>`;
    document.getElementById('redoBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6"></path><polyline points="11 8 15 12 11 16"></polyline></svg>`;
    ellipseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>`;
    rectBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/></svg>`;
    arrowBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    highlighterBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    textBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`;
    document.querySelector('button[onclick="saveProject()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    document.querySelector('button[onclick="copyImage()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    document.querySelector('button[onclick="downloadImage()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    zoomInBtn = document.getElementById('zoomInBtn');
    zoomOutBtn = document.getElementById('zoomOutBtn');
    zoomFitBtn = document.getElementById('zoomFitBtn');
    zoomInBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
    zoomOutBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
    zoomFitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M3 9V3h6M21 15v6h-6"/></svg>`;
}

function setupMenus() {
    circleMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><span>大小</span><span class="preview-area"><input type="range" id="menuNumberSize" min="10" max="50" value="18"><span id="number-size-value" class="size-value">18</span><span id="number-size-preview"></span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="numberBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="numberBgColorPicker" value="#ffffff"></label>`;
    textMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><span>字型</span><select id="menuFontFamily"><option value='"Noto Sans TC", "思源黑體", sans-serif'>思源黑體</option><option value="微軟正黑體">微軟正黑體</option><option value="標楷體">標楷體</option><option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option></select></label><label><span>字體大小</span><span class="preview-area"><input type="range" id="menuFontSize" min="12" max="120" value="24"><span id="font-size-value" class="size-value">24</span><span id="font-size-preview">字</span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="textBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="textBgColorPicker" value="#ffffff"></label>`;
    arrowMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><input type="radio" name="arrowStyle" value="classic" checked><svg width="32" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>經典</label><label><input type="radio" name="arrowStyle" value="curve"><svg width="32" height="16"><path d="M2,14 Q16,2 28,8" fill="none" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>彎曲</label><label><input type="radio" name="arrowStyle" value="chalk-brush"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,14 C10,4 20,4 28,8" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"/><path d="M22,5 L28,8 L22,11" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>曲線筆刷</label><label><input type="radio" name="arrowStyle" value="hatched"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="1.5"/><line x1="4" y1="12" x2="10" y2="4" stroke="#888" stroke-width="1"/><line x1="8" y1="12" x2="14" y2="4" stroke="#888" stroke-width="1"/><line x1="12" y1="12" x2="18" y2="4" stroke="#888" stroke-width="1"/></svg>斜線填充</label><label><input type="radio" name="arrowStyle" value="blocky"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="2"/></svg>空心區塊</label>`;
}

let resizeTimeout;
function debouncedResize() { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resizeCanvas, 100); }

function resizeCanvas() {
    if (img) {
        const containerWidth = canvasContainer.clientWidth;
        if (containerWidth > 0 && originalImageSize.width > 0) {
            const targetHeight = containerWidth * (originalImageSize.height / originalImageSize.width);
            canvasContainer.style.height = `${targetHeight}px`;
            canvas.style.height = `${targetHeight}px`;
            if (canvas.width !== containerWidth || canvas.height !== targetHeight) {
                canvas.width = containerWidth;
                canvas.height = targetHeight;
            }
            fitToScreen();
        }
    } else {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
        draw();
    }
}

function addLongPress(element, longPressAction, clickAction) {
    let timer;
    const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return; // Only for left mouse button
        longPressTriggered = false;
        timer = setTimeout(() => {
            longPressTriggered = true;
            if (longPressAction) longPressAction(e);
        }, 500);
    };
    const end = (e) => {
        clearTimeout(timer);
        if (longPressTriggered) e.preventDefault();
    };
    const click = (e) => {
        if (longPressTriggered) { e.preventDefault(); e.stopPropagation(); }
        else if(clickAction) { clickAction(e); }
    };
    element.addEventListener("mousedown", start);
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("mouseup", end);
    element.addEventListener("mouseleave", end);
    element.addEventListener("touchend", end);
    element.addEventListener("click", click, true);
}

function setupEventListeners() {
    window.addEventListener('resize', debouncedResize);
    canvasContainer.addEventListener('click', () => { if (canvasContainer.classList.contains('empty') && !isAnyMenuVisible()) imgInput.click(); });
    imgInput.addEventListener('change', e => handleFile(e.target.files[0]));
    canvasContainer.addEventListener('dragover', e => e.preventDefault());
    canvasContainer.addEventListener('drop', e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
    window.addEventListener('paste', e => { for (const item of e.clipboardData.items) { if (item.type.includes('image')) { handleFile(item.getAsFile()); break; } } });

    // --- Toolbar Buttons: Click/Long Press for Mobile, Click/Right-click for Desktop ---
    addLongPress(numberBtn, showCircleMenu, () => setMode('number'));
    numberBtn.addEventListener('contextmenu', e => { e.preventDefault(); showCircleMenu(e); });

    addLongPress(textBtn, showTextMenu, () => setMode('text'));
    textBtn.addEventListener('contextmenu', e => { e.preventDefault(); showTextMenu(e); });

    addLongPress(arrowBtn, showArrowMenu, () => setMode('arrow'));
    arrowBtn.addEventListener('contextmenu', e => { e.preventDefault(); showArrowMenu(e); });
    
    ellipseBtn.addEventListener('click', () => setMode('ellipse'));
    rectBtn.addEventListener('click', () => setMode('rect'));
    highlighterBtn.addEventListener('click', () => setMode('highlighter'));
    
    document.addEventListener('mousedown', e => { const isClickingOnMenu = [circleMenu, textMenu, arrowMenu, moveNumberInput, textInputContainer].some(menu => menu.contains(e.target)); const isClickingOnButton = [...document.querySelectorAll('.toolbar button')].some(btn => btn.contains(e.target)); if (!isClickingOnMenu && !isClickingOnButton) hideAllMenus(); });
    circleMenu.addEventListener('input', e => { if (e.target.id === 'menuNumberSize') { const newSize = parseInt(e.target.value, 10); numberSize = newSize; document.getElementById('number-size-value').textContent = newSize; document.getElementById('number-size-preview').style.width = `${newSize * 2}px`; document.getElementById('number-size-preview').style.height = `${newSize * 2}px`; if(selected && selected.type === 'number') { selected.size = newSize; draw(); } } if (e.target.id === 'numberBgColorPicker') { numberBgColor = e.target.value; if(selected && selected.type === 'number' && selected.bgColor) { selected.bgColor = numberBgColor; draw(); } } });
    circleMenu.addEventListener('change', e => { if (e.target.id === 'numberBgCheckbox') { numberBgEnabled = e.target.checked; document.getElementById('numberBgColorPicker').disabled = !e.target.checked; if(selected && selected.type === 'number') { if (numberBgEnabled) selected.bgColor = numberBgColor; else delete selected.bgColor; draw(); saveState(); } } });
    textMenu.addEventListener('input', e => { if (e.target.id === 'menuFontSize') { const newSize = parseInt(e.target.value, 10); fontSize = newSize; document.getElementById('font-size-value').textContent = newSize; document.getElementById('font-size-preview').style.fontSize = `${newSize}px`; if(selected && selected.type === 'text') { selected.size = newSize; draw(); } } if (e.target.id === 'textBgColorPicker') { textBgColor = e.target.value; if(selected && selected.type === 'text' && selected.bgColor) { selected.bgColor = textBgColor; draw(); } } });
    textMenu.addEventListener('change', e => { if (e.target.id === 'menuFontFamily') { fontFamily = e.target.value; if(selected && selected.type === 'text') { selected.font = fontFamily; draw(); } } if (e.target.id === 'textBgCheckbox') { textBgEnabled = e.target.checked; document.getElementById('textBgColorPicker').disabled = !e.target.checked; if(selected && selected.type === 'text') { if (textBgEnabled) selected.bgColor = textBgColor; else delete selected.bgColor; draw(); saveState(); } } });
    circleMenu.addEventListener('mouseup', saveState);
    textMenu.addEventListener('mouseup', saveState);
    arrowMenu.addEventListener('change', e => { if (e.target.name === 'arrowStyle') arrowStyle = e.target.value; });
    colorPicker.addEventListener('input', function() { if (mode !== 'highlighter') { color = this.value; if (selected) { selected.color = color; draw(); saveState(); } } });

    // --- Canvas Event Listeners ---
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseLeave);
    canvas.addEventListener('contextmenu', onCanvasContextMenu); // Add back for desktop
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', onCanvasTouchEnd);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
}

function screenToImageCoords(clientX, clientY) { const rect = canvas.getBoundingClientRect(); return { x: (clientX - rect.left - viewX) / zoom, y: (clientY - rect.top - viewY) / zoom }; }
function imageToScreenCoords(imageX, imageY) { const rect = canvas.getBoundingClientRect(); return { x: imageX * zoom + viewX + rect.left, y: imageY * zoom + viewY + rect.top }; }
function handleZoom(delta, pivotX, pivotY) { if (!img) return; const oldZoom = zoom; const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom - delta * zoom * 0.1)); viewX = pivotX - (pivotX - viewX) * (newZoom / oldZoom); viewY = pivotY - (pivotY - viewY) * (newZoom / oldZoom); zoom = newZoom; draw(); }
function zoomIn() { handleZoom(-2.5, canvas.width / 2, canvas.height / 2); }
function zoomOut() { handleZoom(2.5, canvas.width / 2, canvas.height / 2); }
function fitToScreen() { if (!img || !originalImageSize.width) return; zoom = Math.min(canvas.width / originalImageSize.width, canvas.height / originalImageSize.height); viewX = (canvas.width - originalImageSize.width * zoom) / 2; viewY = (canvas.height - originalImageSize.height * zoom) / 2; draw(); }

function setMode(m) {
    if (drawing) onCanvasMouseUp({ clientX: lastMouseX, clientY: lastMouseY });
    mode = m;
    hideAllMenus();
    textInputContainer.style.display = "none";
    document.querySelectorAll('.toolbar button.active').forEach(b => b.classList.remove('active'));
    const activeBtn = { 'number': numberBtn, 'ellipse': ellipseBtn, 'rect': rectBtn, 'arrow': arrowBtn, 'highlighter': highlighterBtn, 'text': textBtn }[m];
    if(activeBtn) activeBtn.classList.add('active');
    if (m === 'highlighter') { if (colorPicker.value === color) colorPicker.value = '#ffff00'; }
    else { colorPicker.value = color; }
    updateCursor();
}

function updateCursor() { if (isPanning) { canvas.style.cursor = 'grabbing'; } else if (spacebarDown) { canvas.style.cursor = 'grab'; } else if (mode === 'text') { canvas.style.cursor = 'text'; } else { canvas.style.cursor = 'crosshair'; } }
function isAnyMenuVisible() { const popups = [circleMenu, textMenu, arrowMenu, moveNumberInput, textInputContainer]; return popups.some(p => p.style.display === 'block' || p.style.display === 'flex'); }
function hideAllMenus() { [circleMenu, textMenu, arrowMenu, moveNumberInput, textInputContainer].forEach(m => m.style.display = 'none'); }
function showCircleMenu(e) { hideAllMenus(); circleMenu.style.display = "block"; const rect = numberBtn.getBoundingClientRect(); circleMenu.style.left = `${rect.left + window.scrollX}px`; circleMenu.style.top = `${rect.bottom + window.scrollY + 4}px`; const sizeInput = document.getElementById('menuNumberSize'); const checkbox = document.getElementById('numberBgCheckbox'); const colorInput = document.getElementById('numberBgColorPicker'); const valueDisplay = document.getElementById('number-size-value'); const preview = document.getElementById('number-size-preview'); let currentSize; if (selected && selected.type === 'number') { currentSize = selected.size; checkbox.checked = !!selected.bgColor; colorInput.value = selected.bgColor || numberBgColor; } else { currentSize = numberSize; checkbox.checked = numberBgEnabled; colorInput.value = numberBgColor; } sizeInput.value = currentSize; valueDisplay.textContent = currentSize; preview.style.width = `${currentSize * 2}px`; preview.style.height = `${currentSize * 2}px`; colorInput.disabled = !checkbox.checked; }
function showTextMenu(e) { hideAllMenus(); textMenu.style.display = "block"; const rect = textBtn.getBoundingClientRect(); textMenu.style.left = `${rect.left + window.scrollX}px`; textMenu.style.top = `${rect.bottom + window.scrollY + 4}px`; const fontSelect = document.getElementById('menuFontFamily'); const sizeInput = document.getElementById('menuFontSize'); const checkbox = document.getElementById('textBgCheckbox'); const colorInput = document.getElementById('textBgColorPicker'); const valueDisplay = document.getElementById('font-size-value'); const preview = document.getElementById('font-size-preview'); let currentSize, currentFont; if (selected && selected.type === 'text') { currentFont = selected.font; currentSize = selected.size; checkbox.checked = !!selected.bgColor; colorInput.value = selected.bgColor || textBgColor; } else { currentFont = fontFamily; currentSize = fontSize; checkbox.checked = textBgEnabled; colorInput.value = textBgColor; } fontSelect.value = currentFont; sizeInput.value = currentSize; valueDisplay.textContent = currentSize; preview.style.fontSize = `${currentSize}px`; colorInput.disabled = !checkbox.checked; }
function showArrowMenu(e) { hideAllMenus(); arrowMenu.style.display = "block"; let rect = arrowBtn.getBoundingClientRect(); arrowMenu.style.left = (rect.left + window.scrollX) + "px"; arrowMenu.style.top = (rect.bottom + window.scrollY + 4) + "px"; const radio = arrowMenu.querySelector(`input[value="${arrowStyle}"]`); if(radio) radio.checked = true; }
function showMoveNumberInput(e, ann) { hideAllMenus(); const screenCoords = imageToScreenCoords(ann.x, ann.y); const containerRect = canvasContainer.getBoundingClientRect(); const left = screenCoords.x - containerRect.left + 15; const top = screenCoords.y - containerRect.top + 15; moveNumberInput.style.left = `${left}px`; moveNumberInput.style.top = `${top}px`; moveNumberInput.style.display = 'block'; moveNumberInput.value = ann.num; moveNumberInput.focus(); moveNumberInput.select(); moveNumberInput.onkeydown = (ev) => { if (ev.key === 'Enter') { const numberAnnotations = annotations.filter(a => a.type === 'number'); const maxNum = numberAnnotations.length; const newPos = parseInt(moveNumberInput.value, 10); if (!isNaN(newPos) && newPos > 0 && newPos <= maxNum) { const itemToMove = ann; const allButItem = annotations.filter(a => a !== itemToMove); let insertIndex = 0; let numCount = 0; for(let i = 0; i <= allButItem.length; i++) { if (numCount === newPos - 1) { insertIndex = i; break; } if (allButItem[i] && allButItem[i].type === 'number') { numCount++; } if(i === allButItem.length) { insertIndex = allButItem.length; } } allButItem.splice(insertIndex, 0, itemToMove); annotations = allButItem; reindexNumbers(); saveState(); } hideAllMenus(); } else if (ev.key === 'Escape') { hideAllMenus(); } }; }

function onCanvasMouseDown(e) {
    clearTimeout(longPressTimer); longPressTriggered = false;
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (isAnyMenuVisible()) return;
    if (spacebarDown) { isPanning = true; panStart.x = e.clientX; panStart.y = e.clientY; updateCursor(); return; }
    
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    selected = null; hideAllMenus();
    for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTest(annotations[i], x, y)) {
            const ann = annotations[i];
            if (ann.type === 'number') {
                longPressTimer = setTimeout(() => { longPressTriggered = true; dragging = null; showMoveNumberInput(e, ann); }, 500);
            }
            annotations.splice(i, 1); annotations.push(ann); dragging = ann;
            offsetX = x - dragging.x; offsetY = y - dragging.y; selected = dragging; setMode(selected.type);
            if(selected.type !== 'highlighter') { color = selected.color || '#ff0000'; colorPicker.value = color; } else { colorPicker.value = selected.color; }
            if (selected.type === 'arrow') arrowStyle = selected.style; if (selected.type === 'text') { fontFamily = selected.font; fontSize = selected.size; } if (selected.type === 'number') { numberSize = selected.size; }
            draw(); return;
        }
    }
    drawing = true; startX = x; startY = y; shiftPressed = e.shiftKey;
    if (mode === 'highlighter') { highlighterPath = [{x,y}]; }
    else if (['arrow', 'ellipse', 'rect'].includes(mode)) { tempShape = { type: mode, x: startX, y: startY, color: colorPicker.value, style: arrowStyle }; }
    else if (mode === 'text') { drawing = false; showTextInput(e, x, y); e.stopPropagation(); }
    else if (mode === 'number') { drawing = false; const numberAnnotations = annotations.filter(a => a.type === 'number'); const newAnnotation = { type: 'number', x, y, num: numberAnnotations.length + 1, color: colorPicker.value, size: numberSize }; if (numberBgEnabled) newAnnotation.bgColor = numberBgColor; annotations.push(newAnnotation); draw(); saveState(); }
}

function onCanvasMouseMove(e) {
    clearTimeout(longPressTimer);
    lastMouseX = e.clientX; lastMouseY = e.clientY;
    if (isPanning) { const dx = e.clientX - panStart.x; const dy = e.clientY - panStart.y; viewX += dx; viewY += dy; panStart.x = e.clientX; panStart.y = e.clientY; draw(); return; }
    if (!drawing && !dragging) return;
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    shiftPressed = e.shiftKey;
    if (dragging) { const dx = x - offsetX - dragging.x; const dy = y - offsetY - dragging.y; dragging.x += dx; dragging.y += dy; if (dragging.type === 'highlighter' && dragging.path) { dragging.path.forEach(p => { p.x += dx; p.y += dy; }); } draw(); }
    else if (drawing) { if (mode === 'highlighter') { highlighterPath.push({x, y}); draw(); } else { draw(); ctx.save(); ctx.translate(viewX, viewY); ctx.scale(zoom, zoom); ctx.strokeStyle = colorPicker.value; ctx.lineWidth = 2.5 / zoom; let dx = x - startX, dy = y - startY; if (mode === 'ellipse') { let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2); let cx = startX + dx / 2, cy = startY + dy / 2; if (shiftPressed) rx = ry = Math.max(rx, ry); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI); ctx.stroke(); } else if (mode === 'rect') { if (shiftPressed) { let side = Math.max(Math.abs(dx), Math.abs(dy)); dx = side * Math.sign(dx || 1); dy = side * Math.sign(dy || 1); } ctx.strokeRect(startX, startY, dx, dy); } else if (mode === 'arrow' && tempShape) { tempShape.x2 = x; tempShape.y2 = y; drawArrow.call({ctx: ctx, zoom: zoom}, tempShape, true, false); } ctx.restore(); } }
}

function onCanvasMouseUp(e) {
    clearTimeout(longPressTimer);
    if (longPressTriggered) { longPressTriggered = false; return; }
    if (isPanning) { isPanning = false; updateCursor(); return; }
    if (dragging) { dragging = null; saveState(); return; }
    if (!drawing) return; drawing = false;
    if (mode === 'highlighter') { finalizeHighlighterPath(); }
    else { const { x, y } = screenToImageCoords(e.clientX, e.clientY); let dx = x - startX, dy = y - startY; if (Math.hypot(dx, dy) < (5/zoom) && mode !== 'number') { tempShape = null; draw(); return; } if (mode === 'ellipse') { let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2); if (shiftPressed) rx = ry = Math.max(rx, ry); annotations.push({ type: 'ellipse', x: startX + dx / 2, y: startY + dy / 2, rx, ry, color: colorPicker.value }); } else if (mode === 'rect') { if (shiftPressed) { let side = Math.max(Math.abs(dx), Math.abs(dy)); dx = side * Math.sign(dx || 1); dy = side * Math.sign(dy || 1); } annotations.push({ type: 'rect', x: startX, y: startY, w: dx, h: dy, color: colorPicker.value }); } else if (mode === 'arrow' && tempShape) { annotations.push({ ...tempShape, x2: x, y2: y }); } tempShape = null; saveState(); }
    draw();
}

function onCanvasMouseLeave(e) { clearTimeout(longPressTimer); onCanvasMouseUp(e); }
function onCanvasContextMenu(e) { e.preventDefault(); if(isAnyMenuVisible()) { hideAllMenus(); return; } const {x,y} = screenToImageCoords(e.clientX, e.clientY); for (let i = annotations.length - 1; i >= 0; i--) { if (hitTest(annotations[i], x, y)) { if (annotations[i].type === 'number') { showMoveNumberInput(e, annotations[i]); return; } } } }
function onCanvasWheel(e) { if (!img) return; e.preventDefault(); const rect = canvas.getBoundingClientRect(); handleZoom(Math.sign(e.deltaY), e.clientX - rect.left, e.clientY - rect.top); }
function onCanvasTouchStart(e) { e.preventDefault(); if (e.touches.length === 1) { onCanvasMouseDown(e.touches[0]); } else if (e.touches.length === 2) { isPanning = true; pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); updateCursor(); } }
function onCanvasTouchMove(e) { e.preventDefault(); if (e.touches.length === 1) { onCanvasMouseMove(e.touches[0]); } else if (e.touches.length === 2 && isPanning) { const pinchCurrentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); const rect = canvas.getBoundingClientRect(); const pivotX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left; const pivotY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top; const zoomFactor = pinchCurrentDist / pinchStartDist; const oldZoom = zoom; const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor)); viewX = pivotX - (pivotX - viewX) * (newZoom / oldZoom); viewY = pivotY - (pivotY - viewY) * (newZoom / oldZoom); zoom = newZoom; pinchStartDist = pinchCurrentDist; draw(); } }
function onCanvasTouchEnd(e) { e.preventDefault(); onCanvasMouseUp(e.changedTouches[0] || lastMouseX); isPanning = false; updateCursor(); }
function onKeyDown(e) { if (e.key === ' ' && !spacebarDown && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !isAnyMenuVisible()) { spacebarDown = true; updateCursor(); e.preventDefault(); } if (e.ctrlKey || e.metaKey) { if (e.key === 'z') { undo(); e.preventDefault(); } if (e.key === 'y') { redo(); e.preventDefault(); } } if ((e.key === 'Delete' || e.key === 'Backspace') && selected && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { const idx = annotations.indexOf(selected); if (idx > -1) { const type = selected.type; annotations.splice(idx, 1); selected = null; if (type === 'number') reindexNumbers(); else draw(); saveState(); } } }
function onKeyUp(e) { if (e.key === 'Shift') shiftPressed = false; if (e.key === ' ') { spacebarDown = false; updateCursor(); e.preventDefault(); } }

function reindexNumbers() { const numberAnnotations = annotations.filter(a => a.type === 'number'); numberAnnotations.forEach((ann, index) => { ann.num = index + 1; }); draw(); }
function finalizeHighlighterPath() { if (highlighterPath.length > 1) { annotations.unshift({ type: 'highlighter', path: [...highlighterPath], color: colorPicker.value, lineWidth: 20 }); saveState();} highlighterPath = []; }
function confirmTextInput() { const text = textInputArea.value; if (!text.trim()) { cancelTextInput(); return; } const { x: imageX, y: imageY } = JSON.parse(textInputContainer.dataset.coords); const newAnnotation = { type: 'text', x: imageX, y: imageY, text: text, color: colorPicker.value, font: fontFamily, size: fontSize }; if (textBgEnabled) newAnnotation.bgColor = textBgColor; annotations.push(newAnnotation); cancelTextInput(); draw(); saveState(); }
function cancelTextInput() { textInputContainer.style.display = "none"; }
function showTextInput(event, imageX, imageY) { hideAllMenus(); textInputContainer.style.display = "flex"; textInputArea.value = ""; textInputContainer.style.left = `${event.clientX}px`; textInputContainer.style.top = `${event.clientY}px`; textInputContainer.dataset.coords = JSON.stringify({ x: imageX, y: imageY }); textInputArea.style.fontFamily = fontFamily; textInputArea.style.fontSize = `${fontSize * zoom}px`; textInputArea.style.color = colorPicker.value; textInputArea.style.height = 'auto'; textInputArea.style.height = (textInputArea.scrollHeight) + 'px'; textInputArea.focus(); textConfirmBtn.onclick = confirmTextInput; textCancelBtn.onclick = cancelTextInput; textInputArea.oninput = function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; }; textInputArea.onkeydown = function(ev) { if (ev.key === "Enter" && ev.shiftKey) { ev.preventDefault(); confirmTextInput(); } else if (ev.key === "Escape") { cancelTextInput(); } }; }

function draw() { requestIdleCallback(() => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.translate(viewX, viewY); ctx.scale(zoom, zoom); if (img) { ctx.drawImage(img, 0, 0, originalImageSize.width, originalImageSize.height); } annotations.filter(a => a.type === 'highlighter').forEach(ann => drawAnnotation(ann)); annotations.filter(a => a.type !== 'highlighter').forEach(ann => drawAnnotation(ann)); if (highlighterPath.length > 1) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = colorPicker.value; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); highlighterPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); ctx.restore(); } ctx.restore(); }); }
function drawAnnotation(ann) { const renderCtx = this && this.ctx ? this.ctx : ctx; const renderZoom = this && this.zoom ? this.zoom : zoom; const isSelected = this && this.hasOwnProperty('selected') ? this.selected === ann : selected === ann; const lw = 2.5 / renderZoom; renderCtx.save(); if (ann.type === 'arrow') { drawArrow.call({ctx: renderCtx, zoom: renderZoom, selected: isSelected}, ann, false, isSelected); } else if (ann.type === 'highlighter') { renderCtx.globalAlpha = 0.4; renderCtx.strokeStyle = ann.color; renderCtx.lineWidth = ann.lineWidth; renderCtx.lineCap = 'round'; renderCtx.lineJoin = 'round'; renderCtx.beginPath(); ann.path.forEach((p, i) => i === 0 ? renderCtx.moveTo(p.x, p.y) : renderCtx.lineTo(p.x, p.y)); renderCtx.stroke(); if(isSelected){ renderCtx.globalAlpha=0.7; renderCtx.setLineDash([4/renderZoom, 4/renderZoom]); renderCtx.lineWidth=1/renderZoom; renderCtx.strokeStyle = '#000'; renderCtx.stroke(); renderCtx.setLineDash([]);} } else { renderCtx.strokeStyle = ann.color || "#ff0000"; renderCtx.fillStyle = ann.color || "#ff0000"; renderCtx.lineWidth = lw; if (isSelected) { renderCtx.shadowColor = "#339af0"; renderCtx.shadowBlur = 8 / renderZoom; } if (ann.type === 'number') { const radius = ann.size; renderCtx.beginPath(); renderCtx.arc(ann.x, ann.y, radius, 0, 2 * Math.PI); if (ann.bgColor) { renderCtx.fillStyle = ann.bgColor; renderCtx.fill(); } renderCtx.stroke(); renderCtx.fillStyle = ann.color || "#ff0000"; renderCtx.font = `bold ${Math.round(radius * 1.1)}px Arial`; renderCtx.textAlign = 'center'; renderCtx.textBaseline = 'middle'; renderCtx.shadowBlur = 0; renderCtx.fillText(ann.num, ann.x, ann.y); } else if (ann.type === 'ellipse') { renderCtx.beginPath(); renderCtx.ellipse(ann.x, ann.y, ann.rx, ann.ry, 0, 0, 2 * Math.PI); renderCtx.stroke(); } else if (ann.type === 'rect') { renderCtx.strokeRect(ann.x, ann.y, ann.w, ann.h); } else if (ann.type === 'text') { renderCtx.font = `${ann.size}px ${ann.font}`; renderCtx.textAlign = 'left'; renderCtx.textBaseline = 'top'; const lines = ann.text.split('\n'); const lineHeight = ann.size * 1.2; if (ann.bgColor) { const padding = 4; let maxWidth = 0; lines.forEach(line => { const metrics = renderCtx.measureText(line); if (metrics.width > maxWidth) { maxWidth = metrics.width; } }); const rectW = maxWidth + padding * 2; const rectH = (lines.length * lineHeight) - (ann.size * 0.2) + padding; const rectX = ann.x - padding; const rectY = ann.y - padding / 2; renderCtx.fillStyle = ann.bgColor; renderCtx.fillRect(rectX, rectY, rectW, rectH); } renderCtx.fillStyle = ann.color || "#ff0000"; lines.forEach((line, index) => { renderCtx.fillText(line, ann.x, ann.y + (index * lineHeight)); }); } } renderCtx.restore(); }
function hitTest(ann, x, y) { const tolerance = 10 / zoom; if (ann.type === 'highlighter') { for (let i = 0; i < ann.path.length - 1; i++) { if (distToSegment({x,y}, ann.path[i], ann.path[i+1]) < ann.lineWidth / 2) return true; } return false; } if (ann.type === 'arrow') return ann.x2 && ann.y2 ? distToSegment({ x, y }, { x: ann.x, y: ann.y }, { x: ann.x2, y: ann.y2 }) < tolerance : false; if (ann.type === 'number') return Math.hypot(ann.x - x, ann.y - y) < (ann.size || 18) + tolerance / 2; if (ann.type === 'ellipse') return ((x - ann.x) ** 2) / ((ann.rx || 1) ** 2) + ((y - ann.y) ** 2) / ((ann.ry || 1) ** 2) <= 1.2; if (ann.type === 'rect') { const x1 = Math.min(ann.x, ann.x + ann.w), x2 = Math.max(ann.x, ann.x + ann.w); const y1 = Math.min(ann.y, ann.y + ann.h), y2 = Math.max(ann.y, ann.y + ann.h); return x > x1 - tolerance/2 && x < x2 + tolerance/2 && y > y1 - tolerance/2 && y < y2 + tolerance/2; } if (ann.type === 'text') { ctx.save(); ctx.font = `${ann.size}px ${ann.font}`; const lines = ann.text.split('\n'); const lineHeight = ann.size * 1.2; const padding = ann.bgColor ? 4 : 0; let maxWidth = 0; lines.forEach(line => { const metrics = ctx.measureText(line); if (metrics.width > maxWidth) maxWidth = metrics.width; }); const w = maxWidth + padding * 2; const h = (lines.length * lineHeight) - (ann.size * 0.2) + padding; const x1 = ann.x - padding; const y1 = ann.y - padding / 2; ctx.restore(); return (x > x1 && x < x1 + w && y > y1 && y < y1 + h); } return false; }
function createBrush() { const brushCanvas = document.createElement('canvas'); const brushCtx = brushCanvas.getContext('2d'); const size = 50; brushCanvas.width = size; brushCanvas.height = size; const gradient = brushCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); brushCtx.fillStyle = gradient; brushCtx.fillRect(0, 0, size, size); const imageData = brushCtx.getImageData(0, 0, size, size); const pixels = imageData.data; for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 0) { const noise = (Math.random() - 0.5) * 80; pixels[i + 3] = Math.max(0, pixels[i + 3] - noise * (1 - pixels[i + 3] / 255)); } } brushCtx.putImageData(imageData, 0, 0); brushImage = new Image(); brushImage.onload = () => { isBrushReady = true; }; brushImage.src = brushCanvas.toDataURL(); }
function handleFile(file) { if (!file) return; const reader = new FileReader(); if (file.type === 'application/json') { reader.onload = e => loadProject(JSON.parse(e.target.result)); reader.readAsText(file); } else if (file.type.startsWith('image/')) { reader.onload = e => loadImage(e.target.result); reader.readAsDataURL(file); } else { alert('不支援的檔案格式。請選擇圖片檔或 .json 專案檔。'); } }
function loadImage(src, callback) { img = new window.Image(); img.onload = () => { originalImageSize = { width: img.width, height: img.height }; canvasContainer.classList.remove('empty'); if (!callback) { annotations = []; } resizeCanvas(); if (!callback) { saveState(); } updateToolbarState(); if (callback) callback(); }; img.src = src; }
function saveProject() { if (!img) { alert("請先載入一張圖片才能儲存專案。"); return; } const projectAnnotations = annotations.map(ann => { const newAnn = { ...ann }; if (originalImageSize.width === 0 || originalImageSize.height === 0) return newAnn; const scaleX = 1 / originalImageSize.width; const scaleY = 1 / originalImageSize.height; if (newAnn.x) newAnn.x *= scaleX; if (newAnn.y) newAnn.y *= scaleY; if (newAnn.x2) newAnn.x2 *= scaleX; if (newAnn.y2) newAnn.y2 *= scaleY; if (newAnn.w) newAnn.w *= scaleX; if (newAnn.h) newAnn.h *= scaleY; if (newAnn.rx) newAnn.rx *= scaleX; if (newAnn.ry) newAnn.ry *= scaleY; if (newAnn.path) newAnn.path = newAnn.path.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })); return newAnn; }); const fileName = prompt("請輸入專案檔名：", "my-annotation-project"); if (!fileName) return; const projectData = { imageData: img.src, annotations: projectAnnotations }; const jsonString = JSON.stringify(projectData, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${fileName}.json`; a.click(); URL.revokeObjectURL(url); }
function loadProject(projectData) { if (!projectData.imageData || !projectData.annotations) { alert('無效的專案檔。'); return; } loadImage(projectData.imageData, () => { annotations = projectData.annotations.map(ann => { const newAnn = { ...ann }; const scaleX = originalImageSize.width; const scaleY = originalImageSize.height; if (newAnn.x) newAnn.x *= scaleX; if (newAnn.y) newAnn.y *= scaleY; if (newAnn.x2) newAnn.x2 *= scaleX; if (newAnn.y2) newAnn.y2 *= scaleY; if (newAnn.w) newAnn.w *= scaleX; if (newAnn.h) newAnn.h *= scaleY; if (newAnn.rx) newAnn.rx *= scaleX; if (newAnn.ry) newAnn.ry *= scaleY; if (newAnn.path) newAnn.path = newAnn.path.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })); return newAnn; }); if (annotations.length > 0) { const firstAnn = annotations.find(a=>a.type !== 'highlighter'); if(firstAnn) { color = firstAnn.color || '#ff0000'; colorPicker.value = color; } } reindexNumbers(); saveState(); fitToScreen(); }); }
function downloadImage() { const fileName = prompt("請輸入圖片檔名：", "annotated-image"); if (!fileName || !img) return; selected = null; hideAllMenus(); const tempCanvas = document.createElement('canvas'); tempCanvas.width = originalImageSize.width; tempCanvas.height = originalImageSize.height; const tempCtx = tempCanvas.getContext('2d'); tempCtx.drawImage(img, 0, 0); annotations.forEach(ann => { drawAnnotation.call({ ctx: tempCtx, zoom: 1, selected: null }, ann); }); requestIdleCallback(() => { tempCanvas.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${fileName}.png`; a.click(); URL.revokeObjectURL(url); }); draw(); }); }
function copyImage() { if (!navigator.clipboard || !navigator.clipboard.write || !img) { alert('您的瀏覽器不支援此功能或沒有圖片可複製。'); return; } selected = null; hideAllMenus(); const tempCanvas = document.createElement('canvas'); tempCanvas.width = originalImageSize.width; tempCanvas.height = originalImageSize.height; const tempCtx = tempCanvas.getContext('2d'); tempCtx.drawImage(img, 0, 0); annotations.forEach(ann => { drawAnnotation.call({ ctx: tempCtx, zoom: 1, selected: null }, ann); }); requestIdleCallback(() => { tempCanvas.toBlob(blob => { navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => alert('影像已複製到剪貼簿！')).catch(err => { console.error('Copy failed:', err); alert('複製失敗。請檢查瀏覽器權限。'); }); }, 'image/png'); draw(); }); }
function updateClearButton() { if (img) { clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`; clearBtn.title = "清除畫布與標註"; } else { clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`; clearBtn.title = "載入新圖片"; } }
function handleClearOrNew() { if (img) { if (confirm("您確定要清除目前的圖片和所有標註嗎？此操作無法復原。")) { img = null; annotations = []; originalImageSize = { width: 0, height: 0 }; canvasContainer.classList.add('empty'); canvasContainer.style.height = ''; canvas.style.height = ''; saveState(); resizeCanvas(); updateToolbarState(); } } else { imgInput.click(); } }
function drawArrow(ann, isTemp, isSelected) { const { style = "classic", color: c = "#ff0000", x: x1, y: y1, x2, y2 } = ann; if(!x1 || !y1 || !x2 || !y2) return; const currentCtx = this.ctx; const currentZoom = this.zoom; const lw = 2.5 / currentZoom; currentCtx.save(); currentCtx.lineCap = "round"; if (style === 'hatched' || style === 'blocky') { const points = getBlockArrowPolygon(x1, y1, x2, y2); if (points.length > 0) { currentCtx.lineWidth = lw; currentCtx.strokeStyle = c; if (style === 'hatched') { currentCtx.save(); drawWobblyPath(currentCtx, points, 5); currentCtx.clip(); const hatchWidth = 8; currentCtx.lineWidth = 1.5/currentZoom; const bounds = points.reduce((acc, p) => ({minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y)}), {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity}); const diag = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY); for(let i = -diag; i < diag; i += hatchWidth) { currentCtx.beginPath(); currentCtx.moveTo(bounds.minX + i, bounds.minY); currentCtx.lineTo(bounds.minX + i + diag, bounds.minY + diag); currentCtx.stroke(); } currentCtx.restore(); } drawWobblyPath(currentCtx, points, 5); currentCtx.stroke(); } } else if (style === "classic") { currentCtx.strokeStyle = c; currentCtx.lineWidth = 5/currentZoom; const dx = x2 - x1; const dy = y2 - y1; const dist = Math.hypot(dx, dy); if (dist > 5/currentZoom) { currentCtx.beginPath(); const pullback = 5/currentZoom; const x2_line = x2 - pullback * (dx / dist); const y2_line = y2 - pullback * (dy / dist); currentCtx.moveTo(x1, y1); currentCtx.lineTo(x2_line, y2_line); currentCtx.stroke(); } drawArrowHead.call(this, x1, y1, x2, y2, c); } else if (style === "curve") { currentCtx.strokeStyle = c; currentCtx.lineWidth = lw; let dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); let cx = x1 + dx/2 - dy/4, cy = y1 + dy/2 + dx/4; let tangentAngle; if (len > 5/currentZoom) { let t = 1 - Math.min(5, len/2) / len; let endX = (1-t)**2*x1 + 2*(1-t)*t*cx + t**2*x2; let endY = (1-t)**2*y1 + 2*(1-t)*t*cy + t**2*y2; currentCtx.beginPath(); currentCtx.moveTo(x1, y1); currentCtx.quadraticCurveTo(cx, cy, endX, endY); currentCtx.stroke(); tangentAngle = Math.atan2(y2 - endY, x2 - endX); } else { tangentAngle = Math.atan2(dy, dx); } drawArrowHeadAt.call(this, x2, y2, tangentAngle, c); } else if (style === "chalk-brush") { if (!isBrushReady) { currentCtx.restore(); return; } const tempCanvas = document.createElement('canvas'); tempCanvas.width = currentCtx.canvas.width; tempCanvas.height = currentCtx.canvas.height; const tempCtx = tempCanvas.getContext('2d'); const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy); if (dist < 1) { currentCtx.restore(); return; } const cx = x1 + dx/2 - dy * 0.25, cy = y1 + dy/2 + dx * 0.25; const curvePoints = []; for (let t = 0; t <= 1; t += 0.02) curvePoints.push({x: (1-t)**2*x1 + 2*(1-t)*t*cx + t**2*x2, y: (1-t)**2*y1 + 2*(1-t)*t*cy + t**2*y2}); for(let i=0; i<curvePoints.length-1; i++) drawBrushStroke(tempCtx, curvePoints[i], curvePoints[i+1], false); const lastP = curvePoints[curvePoints.length - 1]; const secondLastP = curvePoints[curvePoints.length - 2] || {x:x1, y:y1}; const angle = Math.atan2(lastP.y - secondLastP.y, lastP.x - secondLastP.x); const headLen = Math.min(30, dist * 0.3); const headAngle = Math.PI / 6; const p_tip = { x: x2, y: y2 }; const p_h1 = { x: x2 - headLen * Math.cos(angle - headAngle), y: y2 - headLen * Math.sin(angle - headAngle) }; const p_h2 = { x: x2 - headLen * Math.cos(angle + headAngle), y: y2 - headLen * Math.sin(angle + headAngle) }; drawBrushStroke(tempCtx, p_tip, p_h1, true); drawBrushStroke(tempCtx, p_tip, p_h2, true); tempCtx.globalCompositeOperation = 'source-in'; tempCtx.fillStyle = c; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); currentCtx.drawImage(tempCanvas, 0, 0); } if (isSelected) { currentCtx.shadowColor = "#339af0"; currentCtx.shadowBlur = 8/currentZoom; currentCtx.setLineDash([4/currentZoom,2/currentZoom]); currentCtx.strokeStyle = "#339af0"; currentCtx.lineWidth = lw; if(style !== 'blocky' && style !== 'hatched') { currentCtx.beginPath(); currentCtx.arc(x1, y1, 8/currentZoom, 0, 2*Math.PI); currentCtx.arc(x2, y2, 8/currentZoom, 0, 2*Math.PI); currentCtx.stroke();} else { const points = getBlockArrowPolygon(x1, y1, x2, y2); if (points.length>0) { currentCtx.beginPath(); points.forEach((p,i) => i === 0 ? currentCtx.moveTo(p.x, p.y) : currentCtx.lineTo(p.x, p.y)); currentCtx.stroke();} } } currentCtx.restore(); }
function getBlockArrowPolygon(x1, y1, x2, y2) { const bodyWidth = 12, headWidth = 28, headLength = 25; const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy); if (len < headLength) return []; const angle = Math.atan2(dy, dx), pAngle = angle + Math.PI / 2, bodyLen = len - headLength; const p1 = { x: x1 - Math.cos(pAngle) * bodyWidth / 2, y: y1 - Math.sin(pAngle) * bodyWidth / 2 }; const p2 = { x: p1.x + Math.cos(angle) * bodyLen, y: p1.y + Math.sin(angle) * bodyLen }; const p3 = { x: p2.x - Math.cos(pAngle) * (headWidth - bodyWidth) / 2, y: p2.y - Math.sin(pAngle) * (headWidth - bodyWidth) / 2 }; const p4 = { x: x2, y: y2 }; const p5 = { x: p3.x + Math.cos(pAngle) * headWidth, y: p3.y + Math.sin(pAngle) * headWidth }; const p6 = { x: p1.x + Math.cos(pAngle) * bodyWidth, y: p1.y + Math.sin(pAngle) * bodyWidth }; const p7 = { x: p6.x + Math.cos(angle) * bodyLen, y: p6.y + Math.sin(angle) * bodyLen }; return [p1, p2, p3, p4, p5, p7, p6, p1]; }
function drawWobblyPath(targetCtx, points, randomness) { if (points.length < 2) return; targetCtx.beginPath(); targetCtx.moveTo(points[0].x, points[0].y); for (let i = 0; i < points.length - 1; i++) { const p1 = points[i], p2 = points[i+1]; const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.hypot(dx, dy); const segments = Math.max(2, Math.floor(dist / 15)), pAngle = Math.atan2(dy, dx) + Math.PI/2; for (let j = 1; j <= segments; j++) { const t = j / segments, x = p1.x + t * dx, y = p1.y + t * dy; const rand = (Math.random() - 0.5) * randomness; targetCtx.lineTo(x + Math.cos(pAngle) * rand, y + Math.sin(pAngle) * rand); } } }
function drawBrushStroke(targetCtx, p1, p2, isHead) { if (!isBrushReady) return; const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y); for (let i = 0; i < dist; i += 2) { const t = i / dist, x = p1.x + t * (p2.x - p1.x), y = p1.y + t * (p2.y - p1.y); const size = (isHead ? 25 : 20) * (0.8 + Math.random() * 0.4); targetCtx.globalAlpha = 0.5 + Math.random() * 0.5; targetCtx.drawImage(brushImage, x - size / 2, y - size / 2, size, size); } }
function drawArrowHead(x1, y1, x2, y2, color) { drawArrowHeadAt.call(this, x2, y2, Math.atan2(y2 - y1, x2 - x1), color); }
function drawArrowHeadAt(x, y, angle, color) { let len = 18/this.zoom; const angleOffset = Math.PI / 6; const currentCtx = this.ctx; currentCtx.save(); currentCtx.fillStyle = color; currentCtx.beginPath(); currentCtx.moveTo(x, y); currentCtx.lineTo(x - len * Math.cos(angle - angleOffset), y - len * Math.sin(angle - angleOffset)); currentCtx.lineTo(x - len * Math.cos(angle + angleOffset), y - len * Math.sin(angle + angleOffset)); currentCtx.closePath(); currentCtx.fill(); currentCtx.restore(); }
function distToSegment(p, v, w) { let l2 = (w.x-v.x)**2 + (w.y-v.y)**2; if (l2 === 0) return Math.hypot(p.x-v.x,p.y-v.y); let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t = Math.max(0,Math.min(1,t)); return Math.hypot(p.x - (v.x + t*(w.x-v.x)), p.y - (v.y + t*(w.y-v.y))); }
function saveState() { if (historyIndex < history.length - 1) { history = history.slice(0, historyIndex + 1); } history.push(JSON.parse(JSON.stringify({annotations, zoom, viewX, viewY}))); historyIndex = history.length - 1; updateToolbarState(); }
function undo() { if (historyIndex > 0) { historyIndex--; const state = JSON.parse(JSON.stringify(history[historyIndex])); annotations = state.annotations; zoom = state.zoom; viewX = state.viewX; viewY = state.viewY; draw(); updateToolbarState(); } }
function redo() { if (historyIndex < history.length - 1) { historyIndex++; const state = JSON.parse(JSON.stringify(history[historyIndex])); annotations = state.annotations; zoom = state.zoom; viewX = state.viewX; viewY = state.viewY; draw(); updateToolbarState(); } }
function updateToolbarState() { const hasImage = !!img; updateClearButton(); undoBtn.disabled = historyIndex <= 0; redoBtn.disabled = historyIndex >= history.length - 1; zoomInBtn.disabled = !hasImage; zoomOutBtn.disabled = !hasImage; zoomFitBtn.disabled = !hasImage; document.querySelector('button[onclick="saveProject()"]').disabled = !hasImage; document.querySelector('button[onclick="copyImage()"]').disabled = !hasImage; document.querySelector('button[onclick="downloadImage()"]').disabled = !hasImage; }

// Run the application
initialize();