// --- Polyfill ---
window.requestIdleCallback = window.requestIdleCallback || function(cb) { return setTimeout(() => { const start = Date.now(); cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }); }, 1); };
window.cancelIdleCallback = window.cancelIdleCallback || function(id) { clearTimeout(id); };

// --- Global Variables ---
let mode = 'number';
let annotations = [];
let dragging = null, offsetX = 0, offsetY = 0;
let drawing = false, startX = 0, startY = 0, shiftPressed = false;
let img = null;
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

// History for Undo/Redo
let history = [];
let historyIndex = -1;

// Panning/Dragging Variables
let isSpacePressed = false;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// --- DOM Elements ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const textInputBox = document.getElementById('textInputBox');
const moveNumberInput = document.getElementById('moveNumberInput');
const imgInput = document.getElementById('imgInput');
const canvasContainer = document.getElementById('canvas-container');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const numberBtn = document.getElementById('numberBtn');
const textBtn = document.getElementById('textBtn');
const arrowBtn = document.getElementById('arrowBtn');
const highlighterBtn = document.getElementById('highlighterBtn');
const circleMenu = document.getElementById('circleMenu');
const textMenu = document.getElementById('textMenu');
const arrowMenu = document.getElementById('arrowMenu');
const ellipseBtn = document.getElementById('ellipseBtn');
const rectBtn = document.getElementById('rectBtn');


// --- Initialization ---
function initialize() {
    setupIcons();
    setupMenus();
    setupEventListeners();
    createBrush();
    setMode('number');
    updateClearButton();
    saveState(); // Initial state
}

function setupIcons() {
    document.getElementById('undoBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="13 8 9 12 13 16"></polyline></svg>`;
    document.getElementById('redoBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6"></path><polyline points="11 8 15 12 11 16"></polyline></svg>`;
    document.getElementById('ellipseBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>`;
    document.getElementById('rectBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/></svg>`;
    document.getElementById('arrowBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    document.getElementById('highlighterBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    document.getElementById('textBtn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`;
    document.querySelector('button[onclick="saveProject()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    document.querySelector('button[onclick="copyImage()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    document.querySelector('button[onclick="downloadImage()"]').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
}

function setupMenus() {
    circleMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><span>大小</span><span class="preview-area"><input type="range" id="menuNumberSize" min="10" max="50" value="18"><span id="number-size-value" class="size-value">18</span><span id="number-size-preview"></span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="numberBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="numberBgColorPicker" value="#ffffff"></label>`;
    textMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><span>字型</span><select id="menuFontFamily"><option value='"Noto Sans TC", "思源黑體", sans-serif'>思源黑體</option><option value="微軟正黑體">微軟正黑體</option><option value="標楷體">標楷體</option><option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option></select></label><label><span>字體大小</span><span class="preview-area"><input type="range" id="menuFontSize" min="12" max="120" value="24"><span id="font-size-value" class="size-value">24</span><span id="font-size-preview">字</span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="textBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="textBgColorPicker" value="#ffffff"></label>`;
    arrowMenu.innerHTML = `<button class="close-btn" onclick="hideAllMenus()" title="關閉">×</button><label><input type="radio" name="arrowStyle" value="classic" checked><svg width="32" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>經典</label><label><input type="radio" name="arrowStyle" value="curve"><svg width="32" height="16"><path d="M2,14 Q16,2 28,8" fill="none" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>彎曲</label><label><input type="radio" name="arrowStyle" value="chalk-brush"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,14 C10,4 20,4 28,8" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"/><path d="M22,5 L28,8 L22,11" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>曲線筆刷</label><label><input type="radio" name="arrowStyle" value="hatched"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="1.5"/><line x1="4" y1="12" x2="10" y2="4" stroke="#888" stroke-width="1"/><line x1="8" y1="12" x2="14" y2="4" stroke="#888" stroke-width="1"/><line x1="12" y1="12" x2="18" y2="4" stroke="#888" stroke-width="1"/></svg>斜線填充</label><label><input type="radio" name="arrowStyle" value="blocky"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="2"/></svg>空心區塊</label>`;
}

// --- Event Listeners Setup (Robust Version) ---
function setupEventListeners() {
    canvasContainer.addEventListener('click', () => { if (canvasContainer.classList.contains('empty') && !isAnyMenuVisible()) imgInput.click(); });
    imgInput.addEventListener('change', e => handleFile(e.target.files[0]));
    canvasContainer.addEventListener('dragover', e => e.preventDefault());
    canvasContainer.addEventListener('drop', e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
    window.addEventListener('paste', e => { for (const item of e.clipboardData.items) { if (item.type.includes('image')) { handleFile(item.getAsFile()); break; } } });

    numberBtn.addEventListener('contextmenu', e => { if (numberBtn.classList.contains("active")) { e.preventDefault(); showCircleMenu(e); } });
    textBtn.addEventListener('contextmenu', e => { if (textBtn.classList.contains("active")) { e.preventDefault(); showTextMenu(e); } });
    arrowBtn.addEventListener('contextmenu', e => { if (arrowBtn.classList.contains("active")) { e.preventDefault(); showArrowMenu(e); } });

    document.addEventListener('mousedown', e => {
        const isClickingOnMenu = [circleMenu, textMenu, arrowMenu, moveNumberInput].some(menu => menu.contains(e.target));
        const isClickingOnButton = [clearBtn, numberBtn, textBtn, arrowBtn, undoBtn, redoBtn, ellipseBtn, rectBtn].some(btn => btn.contains(e.target));
        if (!isClickingOnMenu && !isClickingOnButton) hideAllMenus();
    });

    circleMenu.addEventListener('input', e => {
        if (e.target.id === 'menuNumberSize') {
            const newSize = parseInt(e.target.value, 10);
            numberSize = newSize;
            document.getElementById('number-size-value').textContent = newSize;
            document.getElementById('number-size-preview').style.width = `${newSize * 2}px`;
            document.getElementById('number-size-preview').style.height = `${newSize * 2}px`;
            if(selected && selected.type === 'number') { selected.size = newSize; draw(); }
        }
        if (e.target.id === 'numberBgColorPicker') {
             numberBgColor = e.target.value;
             if(selected && selected.type === 'number' && selected.bgColor) { selected.bgColor = numberBgColor; draw(); }
        }
    });
    circleMenu.addEventListener('change', e => {
        if (e.target.id === 'numberBgCheckbox') {
            numberBgEnabled = e.target.checked;
            document.getElementById('numberBgColorPicker').disabled = !e.target.checked;
            if(selected && selected.type === 'number') { if (numberBgEnabled) selected.bgColor = numberBgColor; else delete selected.bgColor; draw(); saveState(); }
        }
    });
    textMenu.addEventListener('input', e => {
        if (e.target.id === 'menuFontSize') {
            const newSize = parseInt(e.target.value, 10);
            fontSize = newSize;
            document.getElementById('font-size-value').textContent = newSize;
            document.getElementById('font-size-preview').style.fontSize = `${newSize}px`;
            if(selected && selected.type === 'text') { selected.size = newSize; draw(); }
        }
        if (e.target.id === 'textBgColorPicker') {
            textBgColor = e.target.value;
            if(selected && selected.type === 'text' && selected.bgColor) { selected.bgColor = textBgColor; draw(); }
        }
    });
    textMenu.addEventListener('change', e => {
        if (e.target.id === 'menuFontFamily') {
            fontFamily = e.target.value;
            if(selected && selected.type === 'text') { selected.font = fontFamily; draw(); }
        }
        if (e.target.id === 'textBgCheckbox') {
            textBgEnabled = e.target.checked;
            document.getElementById('textBgColorPicker').disabled = !e.target.checked;
             if(selected && selected.type === 'text') { if (textBgEnabled) selected.bgColor = textBgColor; else delete selected.bgColor; draw(); saveState(); }
        }
    });
    circleMenu.addEventListener('mouseup', saveState);
    textMenu.addEventListener('mouseup', saveState);
    arrowMenu.addEventListener('change', e => { if (e.target.name === 'arrowStyle') arrowStyle = e.target.value; });
    colorPicker.addEventListener('input', function() { if (mode !== 'highlighter') { color = this.value; if (selected) { selected.color = color; draw(); saveState(); } } });

    // Only mousedown and contextmenu are now permanently on the canvas
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('contextmenu', onCanvasContextMenu);

    // Keydown/keyup listeners remain on the window
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
}

// Helper to get correct coordinates
function getCanvasCoordinates(e) {
    const rect = canvasContainer.getBoundingClientRect();
    const x = e.clientX - rect.left + canvasContainer.scrollLeft;
    const y = e.clientY - rect.top + canvasContainer.scrollTop;
    return { x, y };
}

// --- Mouse Event Handlers (Refactored for global listeners) ---

function onCanvasMouseDown(e) {
    if (e.button !== 0 || isAnyMenuVisible()) return;

    if (isSpacePressed) {
        e.preventDefault(); // *** THIS IS THE FIX *** Prevent browser's default drag-to-scroll
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        // Add global listeners for robust pan handling
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return;
    }

    // Add global listeners for robust drag/draw handling
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    const { x, y } = getCanvasCoordinates(e);

    selected = null;
    hideAllMenus();

    // Check for hit on existing annotations
    for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTest(annotations[i], x, y)) {
            const ann = annotations[i];
            annotations.splice(i, 1);
            annotations.push(ann);
            dragging = ann;
            offsetX = x - dragging.x;
            offsetY = y - dragging.y;
            selected = dragging;
            setMode(selected.type);
            if(selected.type !== 'highlighter') { color = selected.color || '#ff0000'; colorPicker.value = color; } else { colorPicker.value = selected.color; }
            if (selected.type === 'arrow') arrowStyle = selected.style;
            if (selected.type === 'text') { fontFamily = selected.font; fontSize = selected.size; }
            if (selected.type === 'number') { numberSize = selected.size; }
            draw();
            return;
        }
    }

    // Start drawing a new shape
    drawing = true;
    startX = x;
    startY = y;
    shiftPressed = e.shiftKey;

    if (mode === 'highlighter') {
        highlighterPath = [{ x, y }];
    } else if (['arrow', 'ellipse', 'rect'].includes(mode)) {
        tempShape = { type: mode, x: startX, y: startY, color: colorPicker.value, style: arrowStyle };
    } else if (mode === 'text') {
        drawing = false; // Text is handled differently
        showTextInput(x, y);
    } else if (mode === 'number') {
        drawing = false; // Numbers are placed on click, not drag
        const numberAnnotations = annotations.filter(a => a.type === 'number');
        const newAnnotation = { type: 'number', x, y, num: numberAnnotations.length + 1, color: colorPicker.value, size: numberSize };
        if (numberBgEnabled) newAnnotation.bgColor = numberBgColor;
        annotations.push(newAnnotation);
        draw();
        saveState();
    }
}

function handleGlobalMouseMove(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (isPanning) {
        const dx = e.clientX - lastPanX;
        const dy = e.clientY - lastPanY;
        canvasContainer.scrollLeft -= dx;
        canvasContainer.scrollTop -= dy;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        return;
    }

    if (!drawing && !dragging) return;

    const { x, y } = getCanvasCoordinates(e);
    shiftPressed = e.shiftKey;

    if (dragging) {
        let dx = x - offsetX - dragging.x;
        let dy = y - offsetY - dragging.y;
        
        if(dragging.type === 'highlighter' && dragging.path) {
            dragging.path.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
        }
        dragging.x += dx;
        dragging.y += dy;
        
        if (dragging.x2) dragging.x2 += dx;
        if (dragging.y2) dragging.y2 += dy;
        
        draw();
    } else if (drawing) {
        if (mode === 'highlighter') {
            highlighterPath.push({ x, y });
            draw();
        } else {
            draw(); // Redraw base image + annotations
            ctx.save();
            ctx.strokeStyle = colorPicker.value;
            ctx.lineWidth = 2.5;
            let dx = x - startX, dy = y - startY;

            if (mode === 'ellipse') {
                let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2);
                let cx = startX + dx / 2, cy = startY + dy / 2;
                if (shiftPressed) rx = ry = Math.max(rx, ry);
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (mode === 'rect') {
                if (shiftPressed) {
                    let side = Math.max(Math.abs(dx), Math.abs(dy));
                    dx = side * Math.sign(dx || 1);
                    dy = side * Math.sign(dy || 1);
                }
                ctx.strokeRect(startX, startY, dx, dy);
            } else if (mode === 'arrow' && tempShape) {
                tempShape.x2 = x;
                tempShape.y2 = y;
                drawArrow(tempShape, true);
            }
            ctx.restore();
        }
    }
}

function handleGlobalMouseUp(e) {
    // Always remove the global listeners
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);

    if (isPanning) {
        isPanning = false;
        return;
    }

    if (dragging) {
        dragging = null;
        saveState();
        return;
    }

    if (!drawing) return;
    
    const { x, y } = getCanvasCoordinates(e);

    drawing = false;
    if (mode === 'highlighter') {
        finalizeHighlighterPath();
    } else {
        let dx = x - startX;
        let dy = y - startY;

        if (Math.hypot(dx, dy) < 5) {
            tempShape = null;
            draw();
            return;
        }

        if (mode === 'ellipse') {
            let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2);
            if (shiftPressed) rx = ry = Math.max(rx, ry);
            annotations.push({ type: 'ellipse', x: startX + dx / 2, y: startY + dy / 2, rx, ry, color: colorPicker.value });
        } else if (mode === 'rect') {
            if (shiftPressed) {
                let side = Math.max(Math.abs(dx), Math.abs(dy));
                dx = side * Math.sign(dx || 1);
                dy = side * Math.sign(dy || 1);
            }
            annotations.push({ type: 'rect', x: startX, y: startY, w: dx, h: dy, color: colorPicker.value });
        } else if (mode === 'arrow' && tempShape) {
            annotations.push({ ...tempShape, x2: x, y2: y });
        }
    }
    tempShape = null;
    saveState();
    draw();
}

function onCanvasContextMenu(e) {
    e.preventDefault();
    if(isAnyMenuVisible()) {
        hideAllMenus();
        return;
    }
    const { x, y } = getCanvasCoordinates(e);
    for (let i = annotations.length - 1; i >= 0; i--) {
        if (hitTest(annotations[i], x, y)) {
            if (annotations[i].type === 'number') {
                showMoveNumberInput(e, annotations[i]);
                return;
            }
        }
    }
}

function onKeyDown(e) {
    if ((e.key === ' ' || e.code === 'Space') && !isSpacePressed) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
        e.preventDefault();
        isSpacePressed = true;
        if (!isPanning) {
            canvasContainer.classList.add('is-panning');
        }
    }

    if (e.key === 'Shift') shiftPressed = true;
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { undo(); e.preventDefault(); }
        if (e.key === 'y') { redo(); e.preventDefault(); }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected && document.activeElement.tagName !== 'INPUT' && !document.activeElement.isContentEditable) {
        const idx = annotations.indexOf(selected);
        if (idx > -1) {
            const type = selected.type;
            annotations.splice(idx, 1);
            selected = null;
            if (type === 'number') reindexNumbers();
            draw();
            saveState();
        }
    }
}

function onKeyUp(e) {
    if (e.key === ' ' || e.code === 'Space') {
        isSpacePressed = false;
        isPanning = false; // Ensure panning stops
        canvasContainer.classList.remove('is-panning');
    }
    if (e.key === 'Shift') shiftPressed = false;
}

function setMode(m) {
    if (drawing) {
        handleGlobalMouseUp({ clientX: lastMouseX, clientY: lastMouseY });
    }
    mode = m;
    hideAllMenus();
    textInputBox.style.display = "none";
    document.querySelectorAll('.toolbar button.active').forEach(b => b.classList.remove('active'));
    
    const btn = document.getElementById({ 'number': 'numberBtn', 'ellipse': 'ellipseBtn', 'rect': 'rectBtn', 'arrow': 'arrowBtn', 'highlighter': 'highlighterBtn', 'text': 'textBtn' }[m]);
    if(btn) btn.classList.add('active');
    
    if (m === 'highlighter') { if (colorPicker.value === color) colorPicker.value = '#ffff00'; }
    else { colorPicker.value = color; }
}

function isAnyMenuVisible() { return [circleMenu, textMenu, arrowMenu, moveNumberInput].some(m => m.style.display === 'block'); }
function hideAllMenus() { [circleMenu, textMenu, arrowMenu, moveNumberInput].forEach(m => m.style.display = 'none'); }
function showCircleMenu(e) { 
    hideAllMenus(); circleMenu.style.display = "block"; const rect = numberBtn.getBoundingClientRect(); circleMenu.style.left = `${rect.left + window.scrollX}px`; circleMenu.style.top = `${rect.bottom + window.scrollY + 4}px`; 
    const sizeInput = document.getElementById('menuNumberSize');
    const checkbox = document.getElementById('numberBgCheckbox');
    const colorInput = document.getElementById('numberBgColorPicker');
    const valueDisplay = document.getElementById('number-size-value');
    const preview = document.getElementById('number-size-preview');
    let currentSize;
    if (selected && selected.type === 'number') {
        currentSize = selected.size;
        checkbox.checked = !!selected.bgColor;
        colorInput.value = selected.bgColor || numberBgColor;
    } else {
        currentSize = numberSize;
        checkbox.checked = numberBgEnabled;
        colorInput.value = numberBgColor;
    }
    sizeInput.value = currentSize;
    valueDisplay.textContent = currentSize;
    preview.style.width = `${currentSize * 2}px`;
    preview.style.height = `${currentSize * 2}px`;
    colorInput.disabled = !checkbox.checked;
}
function showTextMenu(e) {
    hideAllMenus(); textMenu.style.display = "block"; const rect = textBtn.getBoundingClientRect(); textMenu.style.left = `${rect.left + window.scrollX}px`; textMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    const fontSelect = document.getElementById('menuFontFamily');
    const sizeInput = document.getElementById('menuFontSize');
    const checkbox = document.getElementById('textBgCheckbox');
    const colorInput = document.getElementById('textBgColorPicker');
    const valueDisplay = document.getElementById('font-size-value');
    const preview = document.getElementById('font-size-preview');
    let currentSize, currentFont;
    if (selected && selected.type === 'text') {
        currentFont = selected.font;
        currentSize = selected.size;
        checkbox.checked = !!selected.bgColor;
        colorInput.value = selected.bgColor || textBgColor;
    } else {
        currentFont = fontFamily;
        currentSize = fontSize;
        checkbox.checked = textBgEnabled;
        colorInput.value = textBgColor;
    }
    fontSelect.value = currentFont;
    sizeInput.value = currentSize;
    valueDisplay.textContent = currentSize;
    preview.style.fontSize = `${currentSize}px`;
    colorInput.disabled = !checkbox.checked;
}
function showArrowMenu(e) { hideAllMenus(); arrowMenu.style.display = "block"; let rect = arrowBtn.getBoundingClientRect(); arrowMenu.style.left = (rect.left + window.scrollX) + "px"; arrowMenu.style.top = (rect.bottom + window.scrollY + 4) + "px"; const radio = arrowMenu.querySelector(`input[value="${arrowStyle}"]`); if(radio) radio.checked = true; }
function showMoveNumberInput(e, ann) {
    hideAllMenus();
    const menuRect = canvasContainer.getBoundingClientRect();
    moveNumberInput.style.left = `${e.clientX - menuRect.left + 15}px`;
    moveNumberInput.style.top = `${e.clientY - menuRect.top + 15}px`;
    moveNumberInput.style.display = 'block';
    moveNumberInput.value = ann.num;
    moveNumberInput.focus();
    moveNumberInput.select();

    moveNumberInput.onkeydown = (ev) => {
        if (ev.key === 'Enter') {
            const numberAnnotations = annotations.filter(a => a.type === 'number');
            const maxNum = numberAnnotations.length;
            const newPos = parseInt(moveNumberInput.value, 10);

            if (!isNaN(newPos) && newPos > 0 && newPos <= maxNum) {
                const itemToMove = ann;
                const allButItem = annotations.filter(a => a !== itemToMove);
                
                let insertIndex = 0; let numCount = 0;
                for(let i = 0; i <= allButItem.length; i++) {
                    if (numCount === newPos - 1) { insertIndex = i; break; }
                    if (allButItem[i] && allButItem[i].type === 'number') { numCount++; }
                     if(i === allButItem.length) { insertIndex = allButItem.length; }
                }
                
                allButItem.splice(insertIndex, 0, itemToMove);
                annotations = allButItem;
                reindexNumbers();
                saveState();
            }
            hideAllMenus();
        } else if (ev.key === 'Escape') { hideAllMenus(); }
    };
}

function reindexNumbers() { const numberAnnotations = annotations.filter(a => a.type === 'number'); numberAnnotations.forEach((ann, index) => { ann.num = index + 1; }); draw(); }
function finalizeHighlighterPath() { if (highlighterPath.length > 1) { annotations.unshift({ type: 'highlighter', path: [...highlighterPath], color: colorPicker.value, lineWidth: 20 }); saveState();} highlighterPath = []; }

function showTextInput(x, y) { 
    textInputBox.style.display = "block"; 
    textInputBox.value = ""; 
    const containerRect = canvasContainer.getBoundingClientRect();
    textInputBox.style.left = `${x - canvasContainer.scrollLeft}px`; 
    textInputBox.style.top = `${y - canvasContainer.scrollTop}px`;
    textInputBox.style.fontFamily = fontFamily; 
    textInputBox.style.fontSize = `${fontSize}px`; 
    textInputBox.style.color = colorPicker.value; 
    textInputBox.focus(); 
    textInputBox.onkeydown = function(ev) { 
        if (ev.key === "Enter" && textInputBox.value.trim()) { 
            const newAnnotation = {type: 'text', x, y, text: textInputBox.value, color: colorPicker.value, font: fontFamily, size: fontSize }; 
            if (textBgEnabled) newAnnotation.bgColor = textBgColor; 
            annotations.push(newAnnotation); 
            textInputBox.style.display = "none"; 
            draw(); 
            saveState(); 
        } else if (ev.key === "Escape") { 
            textInputBox.style.display = "none"; 
        } 
    }; 
}

function draw() {
    requestIdleCallback(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (img) ctx.drawImage(img, 0, 0);
        
        annotations.filter(a => a.type === 'highlighter').forEach(ann => drawAnnotation(ann));
        annotations.filter(a => a.type !== 'highlighter').forEach(ann => drawAnnotation(ann));

        if (highlighterPath.length > 1) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = colorPicker.value; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); highlighterPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); ctx.restore(); }
    });
}

function drawAnnotation(ann) {
    const isSelected = (selected === ann);
    ctx.save();
    if (ann.type === 'arrow') { drawArrow(ann, false, isSelected); }
    else if (ann.type === 'highlighter') { ctx.globalAlpha = 0.4; ctx.strokeStyle = ann.color; ctx.lineWidth = ann.lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ann.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); if(isSelected){ ctx.globalAlpha=0.7; ctx.setLineDash([4,4]); ctx.lineWidth=1; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.setLineDash([]);} }
    else {
        ctx.strokeStyle = ann.color || "#ff0000"; ctx.fillStyle = ann.color || "#ff0000"; ctx.lineWidth = 2.5;
        if (isSelected) { ctx.shadowColor = "#339af0"; ctx.shadowBlur = 8; }
        if (ann.type === 'number') { const radius = ann.size || 18; ctx.beginPath(); ctx.arc(ann.x, ann.y, radius, 0, 2 * Math.PI); if (ann.bgColor) { ctx.fillStyle = ann.bgColor; ctx.fill(); } ctx.stroke(); ctx.fillStyle = ann.color || "#ff0000"; ctx.font = `bold ${Math.round(radius * 1.1)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0; ctx.fillText(ann.num, ann.x, ann.y); }
        else if (ann.type === 'ellipse') { ctx.beginPath(); ctx.ellipse(ann.x, ann.y, ann.rx, ann.ry, 0, 0, 2 * Math.PI); ctx.stroke(); }
        else if (ann.type === 'rect') { ctx.strokeRect(ann.x, ann.y, ann.w, ann.h); }
        else if (ann.type === 'text') { ctx.font = `${ann.size}px ${ann.font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; if (ann.bgColor) { const metrics = ctx.measureText(ann.text); const padding = 4; const rectH = ann.size + padding; const rectW = metrics.width + padding * 2; const rectX = ann.x - padding; const rectY = ann.y - padding / 2; ctx.fillStyle = ann.bgColor; ctx.fillRect(rectX, rectY, rectW, rectH); } ctx.fillStyle = ann.color || "#ff0000"; ctx.fillText(ann.text, ann.x, ann.y); }
    }
    ctx.restore();
}

function hitTest(ann, x, y) {
    const tolerance = 10;
    if (ann.type === 'highlighter') { for (let i = 0; i < ann.path.length - 1; i++) { if (distToSegment({x,y}, ann.path[i], ann.path[i+1]) < ann.lineWidth / 2) return true; } return false; }
    if (ann.type === 'arrow') return ann.x2 && ann.y2 ? distToSegment({ x, y }, { x: ann.x, y: ann.y }, { x: ann.x2, y: ann.y2 }) < tolerance : false;
    if (ann.type === 'number') return Math.hypot(ann.x - x, ann.y - y) < (ann.size || 18) + tolerance / 2;
    if (ann.type === 'ellipse') { const k = ((x - ann.x) ** 2) / ((ann.rx+tolerance) ** 2) + ((y - ann.y) ** 2) / ((ann.ry+tolerance) ** 2); return k <= 1; }
    if (ann.type === 'rect') { const x1 = Math.min(ann.x, ann.x + ann.w), x2 = Math.max(ann.x, ann.x + ann.w); const y1 = Math.min(ann.y, ann.y + ann.h), y2 = Math.max(ann.y, ann.y + ann.h); return x > x1 - tolerance/2 && x < x2 + tolerance/2 && y > y1 - tolerance/2 && y < y2 + tolerance/2; }
    if (ann.type === 'text') { ctx.save(); ctx.font = `${ann.size}px ${ann.font}`; const metrics = ctx.measureText(ann.text); const padding = ann.bgColor ? 4 : 0; const w = metrics.width + padding * 2; const h = ann.size + padding; const x1 = ann.x - padding; const y1 = ann.y - padding / 2; ctx.restore(); return (x > x1 && x < x1 + w && y > y1 && y < y1 + h); }
    return false;
}

function createBrush() { const brushCanvas = document.createElement('canvas'); const brushCtx = brushCanvas.getContext('2d'); const size = 50; brushCanvas.width = size; brushCanvas.height = size; const gradient = brushCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); brushCtx.fillStyle = gradient; brushCtx.fillRect(0, 0, size, size); const imageData = brushCtx.getImageData(0, 0, size, size); const pixels = imageData.data; for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 0) { const noise = (Math.random() - 0.5) * 80; pixels[i + 3] = Math.max(0, pixels[i + 3] - noise * (1 - pixels[i + 3] / 255)); } } brushCtx.putImageData(imageData, 0, 0); brushImage = new Image(); brushImage.onload = () => { isBrushReady = true; }; brushImage.src = brushCanvas.toDataURL(); }
function handleFile(file) { if (!file) return; const reader = new FileReader(); if (file.type === 'application/json') { reader.onload = e => loadProject(JSON.parse(e.target.result)); reader.readAsText(file); } else if (file.type.startsWith('image/')) { reader.onload = e => loadImage(e.target.result); reader.readAsDataURL(file); } else { alert('不支援的檔案格式。請選擇圖片檔或 .json 專案檔。'); } }
function loadImage(src, callback) { img = new window.Image(); img.onload = () => { canvas.width = img.width; canvas.height = img.height; canvasContainer.classList.remove('empty'); if (!callback) { annotations = []; canvasContainer.scrollTop = 0; canvasContainer.scrollLeft = 0; } saveState(); draw(); updateClearButton(); if (callback) callback(); }; img.src = src; }
function saveProject() { const fileName = prompt("請輸入專案檔名：", "my-annotation-project"); if (!fileName) return; if (!img) { alert("請先載入一張圖片才能儲存專案。"); return; } const projectData = { imageData: img.src, annotations: annotations }; const jsonString = JSON.stringify(projectData, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${fileName}.json`; a.click(); URL.revokeObjectURL(url); }
function loadProject(projectData) { if (!projectData.imageData || !projectData.annotations) { alert('無效的專案檔。'); return; } loadImage(projectData.imageData, () => { annotations = projectData.annotations; if (annotations.length > 0) { const firstAnn = annotations.find(a=>a.type !== 'highlighter'); if(firstAnn) { color = firstAnn.color || '#ff0000'; colorPicker.value = color; }} reindexNumbers(); saveState(); }); }
function downloadImage() { const fileName = prompt("請輸入圖片檔名：", "annotated-image"); if (!fileName) return; selected = null; hideAllMenus(); draw(); requestIdleCallback(() => { canvas.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${fileName}.png`; a.click(); URL.revokeObjectURL(url); }); }); }
function copyImage() { if (!navigator.clipboard || !navigator.clipboard.write) { alert('您的瀏覽器不支援此功能。'); return; } selected = null; hideAllMenus(); draw(); requestIdleCallback(() => { canvas.toBlob(blob => { navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => alert('影像已複製到剪貼簿！')).catch(err => { console.error('Copy failed:', err); alert('複製失敗。請檢查瀏覽器權限。'); }); }, 'image/png'); }); }
function updateClearButton() { if (img) { clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`; clearBtn.title = "清除畫布與標註"; } else { clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`; clearBtn.title = "載入新圖片"; } }
function handleClearOrNew() { if (img) { if (confirm("您確定要清除目前的圖片和所有標註嗎？此操作無法復原。")) { img = null; annotations = []; ctx.clearRect(0, 0, canvas.width, canvas.height); canvasContainer.classList.add('empty'); updateClearButton(); saveState(); } } else { imgInput.click(); } }
function drawArrow(ann, isTemp, isSelected) { const { style = "classic", color: c = "#ff0000", x: x1, y: y1, x2, y2 } = ann; if(!x1 || !y1 || !x2 || !y2) return; ctx.save(); ctx.lineCap = "round"; if (style === 'hatched' || style === 'blocky') { const points = getBlockArrowPolygon(x1, y1, x2, y2); if (points.length > 0) { ctx.lineWidth = 2.5; ctx.strokeStyle = c; if (style === 'hatched') { ctx.save(); drawWobblyPath(ctx, points, 5); ctx.clip(); const hatchWidth = 8; ctx.lineWidth = 1.5; const bounds = points.reduce((acc, p) => ({minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y)}), {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity}); const diag = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY); for(let i = -diag; i < diag; i += hatchWidth) { ctx.beginPath(); ctx.moveTo(bounds.minX + i, bounds.minY); ctx.lineTo(bounds.minX + i + diag, bounds.minY + diag); ctx.stroke(); } ctx.restore(); } drawWobblyPath(ctx, points, 5); ctx.stroke(); } } else if (style === "classic") { ctx.strokeStyle = c; ctx.lineWidth = 5; const dx = x2 - x1; const dy = y2 - y1; const dist = Math.hypot(dx, dy); if (dist > 5) { ctx.beginPath(); const pullback = 5; const x2_line = x2 - pullback * (dx / dist); const y2_line = y2 - pullback * (dy / dist); ctx.moveTo(x1, y1); ctx.lineTo(x2_line, y2_line); ctx.stroke(); } drawArrowHead(x1, y1, x2, y2, c); } else if (style === "curve") { ctx.strokeStyle = c; ctx.lineWidth = 2; let dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); let cx = x1 + dx/2 - dy/4, cy = y1 + dy/2 + dx/4; let tangentAngle; if (len > 5) { let t = 1 - Math.min(5, len/2) / len; let endX = (1-t)**2*x1 + 2*(1-t)*t*cx + t**2*x2; let endY = (1-t)**2*y1 + 2*(1-t)*t*cy + t**2*y2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, endX, endY); ctx.stroke(); tangentAngle = Math.atan2(y2 - endY, x2 - endX); } else { tangentAngle = Math.atan2(dy, dx); } drawArrowHeadAt(x2, y2, tangentAngle, c); } else if (style === "chalk-brush") { if (!isBrushReady) { ctx.restore(); return; } const tempCanvas = document.createElement('canvas'); tempCanvas.width = canvas.width; tempCanvas.height = canvas.height; const tempCtx = tempCanvas.getContext('2d'); const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy); if (dist < 1) { ctx.restore(); return; } const cx = x1 + dx/2 - dy * 0.25, cy = y1 + dy/2 + dx * 0.25; const curvePoints = []; for (let t = 0; t <= 1; t += 0.02) curvePoints.push({x: (1-t)**2*x1 + 2*(1-t)*t*cx + t**2*x2, y: (1-t)**2*y1 + 2*(1-t)*t*cy + t**2*y2}); for(let i=0; i<curvePoints.length-1; i++) drawBrushStroke(tempCtx, curvePoints[i], curvePoints[i+1], false); const lastP = curvePoints[curvePoints.length - 1]; const secondLastP = curvePoints[curvePoints.length - 2] || {x:x1, y:y1}; const angle = Math.atan2(lastP.y - secondLastP.y, lastP.x - secondLastP.x); const headLen = Math.min(30, dist * 0.3); const headAngle = Math.PI / 6; const p_tip = { x: x2, y: y2 }; const p_h1 = { x: x2 - headLen * Math.cos(angle - headAngle), y: y2 - headLen * Math.sin(angle - headAngle) }; const p_h2 = { x: x2 - headLen * Math.cos(angle + headAngle), y: y2 - headLen * Math.sin(angle + headAngle) }; drawBrushStroke(tempCtx, p_tip, p_h1, true); drawBrushStroke(tempCtx, p_tip, p_h2, true); tempCtx.globalCompositeOperation = 'source-in'; tempCtx.fillStyle = c; tempCtx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(tempCanvas, 0, 0); } if (isSelected) { ctx.shadowColor = "#339af0"; ctx.shadowBlur = 8; ctx.setLineDash([4,2]); ctx.strokeStyle = "#339af0"; ctx.lineWidth = 2; if(style !== 'blocky' && style !== 'hatched') { ctx.beginPath(); ctx.arc(x1, y1, 8, 0, 2*Math.PI); ctx.arc(x2, y2, 8, 0, 2*Math.PI); ctx.stroke();} else { const points = getBlockArrowPolygon(x1, y1, x2, y2); if (points.length>0) { ctx.beginPath(); points.forEach((p,i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();} } } ctx.restore(); }
function getBlockArrowPolygon(x1, y1, x2, y2) { const bodyWidth = 12, headWidth = 28, headLength = 25; const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy); if (len < headLength) return []; const angle = Math.atan2(dy, dx), pAngle = angle + Math.PI / 2, bodyLen = len - headLength; const p1 = { x: x1 - Math.cos(pAngle) * bodyWidth / 2, y: y1 - Math.sin(pAngle) * bodyWidth / 2 }; const p2 = { x: p1.x + Math.cos(angle) * bodyLen, y: p1.y + Math.sin(angle) * bodyLen }; const p3 = { x: p2.x - Math.cos(pAngle) * (headWidth - bodyWidth) / 2, y: p2.y - Math.sin(pAngle) * (headWidth - bodyWidth) / 2 }; const p4 = { x: x2, y: y2 }; const p5 = { x: p3.x + Math.cos(pAngle) * headWidth, y: p3.y + Math.sin(pAngle) * headWidth }; const p6 = { x: p1.x + Math.cos(pAngle) * bodyWidth, y: p1.y + Math.sin(pAngle) * bodyWidth }; const p7 = { x: p6.x + Math.cos(angle) * bodyLen, y: p6.y + Math.sin(angle) * bodyLen }; return [p1, p2, p3, p4, p5, p7, p6, p1]; }
function drawWobblyPath(targetCtx, points, randomness) { if (points.length < 2) return; targetCtx.beginPath(); targetCtx.moveTo(points[0].x, points[0].y); for (let i = 0; i < points.length - 1; i++) { const p1 = points[i], p2 = points[i+1]; const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.hypot(dx, dy); const segments = Math.max(2, Math.floor(dist / 15)), pAngle = Math.atan2(dy, dx) + Math.PI/2; for (let j = 1; j <= segments; j++) { const t = j / segments, x = p1.x + t * dx, y = p1.y + t * dy; const rand = (Math.random() - 0.5) * randomness; targetCtx.lineTo(x + Math.cos(pAngle) * rand, y + Math.sin(pAngle) * rand); } } }
function drawBrushStroke(targetCtx, p1, p2, isHead) { if (!isBrushReady) return; const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y); for (let i = 0; i < dist; i += 2) { const t = i / dist, x = p1.x + t * (p2.x - p1.x), y = p1.y + t * (p2.y - p1.y); const size = (isHead ? 25 : 20) * (0.8 + Math.random() * 0.4); targetCtx.globalAlpha = 0.5 + Math.random() * 0.5; targetCtx.drawImage(brushImage, x - size / 2, y - size / 2, size, size); } }
function drawArrowHead(x1, y1, x2, y2, color) { drawArrowHeadAt(x2, y2, Math.atan2(y2 - y1, x2 - x1), color); }
function drawArrowHeadAt(x, y, angle, color) { let len = 18; const angleOffset = Math.PI / 6; ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * Math.cos(angle - angleOffset), y - len * Math.sin(angle - angleOffset)); ctx.lineTo(x - len * Math.cos(angle + angleOffset), y - len * Math.sin(angle + angleOffset)); ctx.closePath(); ctx.fill(); ctx.restore(); }
function distToSegment(p, v, w) { let l2 = (w.x-v.x)**2 + (w.y-v.y)**2; if (l2 === 0) return Math.hypot(p.x-v.x,p.y-v.y); let t = ((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t = Math.max(0,Math.min(1,t)); return Math.hypot(p.x - (v.x + t*(w.x-v.x)), p.y - (v.y + t*(w.y-v.y))); }

// --- Undo/Redo Logic ---
function saveState() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    const state = JSON.stringify(annotations);
    // Don't save if it's identical to the previous state
    if(history.length > 0 && history[historyIndex] === state) return;
    history.push(state);
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        annotations = JSON.parse(history[historyIndex]);
        draw();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        annotations = JSON.parse(history[historyIndex]);
        draw();
        updateUndoRedoButtons();
    }
}

function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

// Run the application
initialize();