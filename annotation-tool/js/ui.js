// js/ui.js
import * as state from './state.js';
import { saveState, setMode } from './app.js';
import { draw } from './drawing.js';
import { imageToScreenCoords } from './utils.js';

// --- DOM Elements Declaration (as let, not const) ---
export let canvasContainer, canvas, ctx, imgInput, clearBtn, undoBtn, redoBtn, cropBtn,
    numberBtn, ellipseBtn, rectBtn, arrowBtn, highlighterBtn, textBtn, colorPicker,
    zoomOutBtn, zoomInBtn, zoomFitBtn, saveProjectBtn, copyImageBtn, downloadImageBtn,
    textInputContainer, textInputArea, textConfirmBtn, textCancelBtn,
    moveNumberInput, circleMenu, textMenu, arrowMenu, cropToolbar, applyCropBtn, cancelCropBtn,
    // START: 新增的 DOM 元素宣告
    contactBtn, contactModalOverlay, closeModalBtn, googleFormIframe;
    // END: 新增的 DOM 元素宣告

// --- Initialization Function ---
export function initUI() {
    canvasContainer = document.getElementById('canvas-container');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    imgInput = document.getElementById('imgInput');
    clearBtn = document.getElementById('clearBtn');
    undoBtn = document.getElementById('undoBtn');
    redoBtn = document.getElementById('redoBtn');
    cropBtn = document.getElementById('cropBtn');
    numberBtn = document.getElementById('numberBtn');
    ellipseBtn = document.getElementById('ellipseBtn');
    rectBtn = document.getElementById('rectBtn');
    arrowBtn = document.getElementById('arrowBtn');
    highlighterBtn = document.getElementById('highlighterBtn');
    textBtn = document.getElementById('textBtn');
    colorPicker = document.getElementById('colorPicker');
    zoomOutBtn = document.getElementById('zoomOutBtn');
    zoomInBtn = document.getElementById('zoomInBtn');
    zoomFitBtn = document.getElementById('zoomFitBtn');
    saveProjectBtn = document.getElementById('saveProjectBtn');
    copyImageBtn = document.getElementById('copyImageBtn');
    downloadImageBtn = document.getElementById('downloadImageBtn');
    textInputContainer = document.getElementById('textInputContainer');
    textInputArea = document.getElementById('textInputArea');
    textConfirmBtn = document.getElementById('textConfirmBtn');
    textCancelBtn = document.getElementById('textCancelBtn');
    moveNumberInput = document.getElementById('moveNumberInput');
    circleMenu = document.getElementById('circleMenu');
    textMenu = document.getElementById('textMenu');
    arrowMenu = document.getElementById('arrowMenu');
    cropToolbar = document.getElementById('crop-toolbar');
    applyCropBtn = document.getElementById('applyCropBtn');
    cancelCropBtn = document.getElementById('cancelCropBtn');
    // START: 在這裡初始化新增的 DOM 元素
    contactBtn = document.getElementById('contactBtn');
    contactModalOverlay = document.getElementById('contactModalOverlay');
    closeModalBtn = document.getElementById('closeModalBtn');
    googleFormIframe = document.getElementById('googleFormIframe');
    // END: 在這裡初始化新增的 DOM 元素
}


export function setupIcons() {
    clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    undoBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="13 8 9 12 13 16"></polyline></svg>`;
    redoBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6"></path><polyline points="11 8 15 12 11 16"></polyline></svg>`;
    cropBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>`;
    ellipseBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>`;
    rectBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/></svg>`;
    arrowBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    highlighterBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
    textBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`;
    saveProjectBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    copyImageBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    downloadImageBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    zoomInBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
    zoomOutBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
    zoomFitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M3 9V3h6M21 15v6h-6"/></svg>`;
    // START: 聯絡我們按鈕圖示
    contactBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>聯絡我們`;
    // END: 聯絡我們按鈕圖示
}

export function setupMenus() {
    circleMenu.innerHTML = `<button class="close-btn" onclick="this.parentElement.style.display='none'" title="關閉">×</button><label><span>大小</span><span class="preview-area"><input type="range" id="menuNumberSize" min="10" max="100" value="18"><span id="number-size-value" class="size-value">18</span><span id="number-size-preview"></span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="numberBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="numberBgColorPicker" value="#ffffff"></label>`;
    textMenu.innerHTML = `<button class="close-btn" onclick="this.parentElement.style.display='none'" title="關閉">×</button><label><span>字型</span><select id="menuFontFamily"><option value='"Noto Sans TC", "思源黑體", sans-serif'>思源黑體</option><option value="微軟正黑體">微軟正黑體</option><option value="標楷體">標楷體</option><option value="Arial">Arial</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option></select></label><label><span>字體大小</span><span class="preview-area"><input type="range" id="menuFontSize" min="12" max="200" value="24"><span id="font-size-value" class="size-value">24</span><span id="font-size-preview">字</span></span></label><hr style="border:none; border-top: 1px solid #eee; margin: 8px 0;"><label><span>啟用背景</span><input type="checkbox" id="textBgCheckbox"></label><label><span>背景顏色</span><input type="color" id="textBgColorPicker" value="#ffffff"></label>`;
    arrowMenu.innerHTML = `<button class="close-btn" onclick="this.parentElement.style.display='none'" title="關閉">×</button><label><input type="radio" name="arrowStyle" value="classic" checked><svg width="32" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>經典</label><label><input type="radio" name="arrowStyle" value="curve"><svg width="32" height="16"><path d="M2,14 Q16,2 28,8" fill="none" stroke="#888" stroke-width="3"/><polygon points="28,8 22,5 22,11" fill="#888"/></svg>彎曲</label><label><input type="radio" name="arrowStyle" value="chalk-brush"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,14 C10,4 20,4 28,8" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"/><path d="M22,5 L28,8 L22,11" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>曲線筆刷</label><label><input type="radio" name="arrowStyle" value="hatched"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="1.5"/><line x1="4" y1="12" x2="10" y2="4" stroke="#888" stroke-width="1"/><line x1="8" y1="12" x2="14" y2="4" stroke="#888" stroke-width="1"/><line x1="12" y1="12" x2="18" y2="4" stroke="#888" stroke-width="1"/></svg>斜線填充</label><label><input type="radio" name="arrowStyle" value="blocky"><svg width="32" height="16" viewBox="0 0 32 16"><path d="M2,6 L22,6 L22,4 L30,8 L22,12 L22,10 L2,10 Z" fill="none" stroke="#888" stroke-width="2"/></svg>空心區塊</label>`;
}

export function updateToolbarState() {
    const hasImage = !!window.img;
    if (hasImage) {
        clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        clearBtn.title = "清除畫布與標註";
    } else {
        clearBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        clearBtn.title = "載入新圖片";
    }
    undoBtn.disabled = state.historyIndex <= 0;
    redoBtn.disabled = state.historyIndex >= state.history.length - 1;
    [cropBtn, zoomInBtn, zoomOutBtn, zoomFitBtn, saveProjectBtn, copyImageBtn, downloadImageBtn].forEach(btn => btn.disabled = !hasImage);
    document.querySelectorAll('.toolbar button.active').forEach(b => b.classList.remove('active'));
    const activeBtn = {
        'number': numberBtn,
        'ellipse': ellipseBtn,
        'rect': rectBtn,
        'arrow': arrowBtn,
        'highlighter': highlighterBtn,
        'text': textBtn,
        'crop': cropBtn
    }[state.mode];
    if (activeBtn) activeBtn.classList.add('active');
}

export function updateCursor() {
    if (state.isPanning) {
        canvas.style.cursor = 'grabbing';
    } else if (state.spacebarDown) {
        canvas.style.cursor = 'grab';
    } else if (state.mode === 'text') {
        canvas.style.cursor = 'text';
    } else if (state.mode === 'crop') {
        // Crop cursor logic is in crop.js
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

export function isAnyMenuVisible() {
    const popups = [circleMenu, textMenu, arrowMenu, moveNumberInput, textInputContainer, contactModalOverlay]; // Add contactModalOverlay here
    return popups.some(p => p.style.display === 'block' || p.style.display === 'flex');
}

export function hideAllMenus() {
    [circleMenu, textMenu, arrowMenu, moveNumberInput, textInputContainer, contactModalOverlay].forEach(m => m.style.display = 'none'); // Add contactModalOverlay here
}

function positionMenu(menu, triggerElement) {
    const rect = triggerElement.getBoundingClientRect();
    menu.style.display = "block";
    const menuRect = menu.getBoundingClientRect();
    const margin = 8;
    
    let left = rect.left;
    let top = rect.bottom + 4;

    if (left + menuRect.width > window.innerWidth - margin) {
        left = window.innerWidth - menuRect.width - margin;
    }
    if (top + menuRect.height > window.innerHeight - margin) {
        top = rect.top - menuRect.height - 4;
    }
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

export function showCircleMenu() {
    hideAllMenus();
    positionMenu(circleMenu, numberBtn);
    const sizeInput = document.getElementById('menuNumberSize');
    const checkbox = document.getElementById('numberBgCheckbox');
    const colorInput = document.getElementById('numberBgColorPicker');
    const valueDisplay = document.getElementById('number-size-value');
    const preview = document.getElementById('number-size-preview');
    let currentSize;
    if (state.selected && state.selected.type === 'number') {
        currentSize = state.selected.size;
    } else {
        currentSize = state.numberSize;
    }
    sizeInput.value = currentSize;
    valueDisplay.textContent = currentSize;
    preview.style.width = `${currentSize * 2}px`;
    preview.style.height = `${currentSize * 2}px`;
    checkbox.checked = state.selected ? !!state.selected.bgColor : state.numberBgEnabled;
    colorInput.value = state.selected ? (state.selected.bgColor || state.numberBgColor) : state.numberBgColor;
    colorInput.disabled = !checkbox.checked;
}

export function showTextMenu() {
    hideAllMenus();
    positionMenu(textMenu, textBtn);
    const fontSelect = document.getElementById('menuFontFamily');
    const sizeInput = document.getElementById('menuFontSize');
    const checkbox = document.getElementById('textBgCheckbox');
    const colorInput = document.getElementById('textBgColorPicker');
    const valueDisplay = document.getElementById('font-size-value');
    const preview = document.getElementById('font-size-preview');
    let currentSize, currentFont;
    if (state.selected && state.selected.type === 'text') {
        currentFont = state.selected.font;
        currentSize = state.selected.size;
    } else {
        currentFont = state.fontFamily;
        currentSize = state.fontSize;
    }
    fontSelect.value = currentFont;
    sizeInput.value = currentSize;
    valueDisplay.textContent = currentSize;
    preview.style.fontSize = `${currentSize}px`;
    checkbox.checked = state.selected ? !!state.selected.bgColor : state.textBgEnabled;
    colorInput.value = state.selected ? (state.selected.bgColor || state.textBgColor) : state.textBgColor;
    colorInput.disabled = !checkbox.checked;
}

export function showArrowMenu() {
    hideAllMenus();
    positionMenu(arrowMenu, arrowBtn);
    const radio = arrowMenu.querySelector(`input[value="${state.arrowStyle}"]`);
    if (radio) radio.checked = true;
}

export function showMoveNumberInput(e, ann) {
    hideAllMenus();
    const screenCoords = imageToScreenCoords(ann.x, ann.y);
    const containerRect = canvasContainer.getBoundingClientRect();
    const left = screenCoords.x;
    const top = screenCoords.y;
    moveNumberInput.style.left = `${left}px`;
    moveNumberInput.style.top = `${top}px`;
    moveNumberInput.style.display = 'block';
    moveNumberInput.value = ann.num;
    moveNumberInput.dataset.num = ann.num;
    moveNumberInput.focus();
    moveNumberInput.select();
}

export function showTextInput(event, imageX, imageY, existingAnnotation = null) {
    hideAllMenus();
    textInputContainer.style.display = "flex";

    let left, top;

    if (existingAnnotation) {
        // --- EDITING MODE ---
        textInputArea.value = existingAnnotation.text;
        textInputContainer.dataset.editing = "true";
        // Position the input box over the existing text annotation
        const screenCoords = imageToScreenCoords(existingAnnotation.x, existingAnnotation.y);
        left = screenCoords.x;
        top = screenCoords.y;
    } else {
        // --- CREATING MODE ---
        textInputArea.value = "";
        delete textInputContainer.dataset.editing;
        textInputContainer.dataset.coords = JSON.stringify({ x: imageX, y: imageY });
        // Position at the mouse click location
        left = event.clientX;
        top = event.clientY;
    }

    // Position initially off-screen to measure, then place correctly
    textInputContainer.style.left = '-9999px';
    textInputContainer.style.top = '-9999px';
    
    requestAnimationFrame(() => {
        const menuRect = textInputContainer.getBoundingClientRect();
        // Adjust if the menu would go off-screen
        if (left + menuRect.width > window.innerWidth - 8) {
            left = window.innerWidth - menuRect.width - 8;
        }
        if (top + menuRect.height > window.innerHeight - 8) {
            top = window.innerHeight - menuRect.height - 8;
        }
        textInputContainer.style.left = `${left}px`;
        textInputContainer.style.top = `${top}px`;
    });

    textInputArea.style.fontFamily = state.fontFamily;
    textInputArea.style.fontSize = `${state.fontSize}px`;
    textInputArea.style.color = state.color;
    textInputArea.style.height = 'auto';
    textInputArea.style.height = (textInputArea.scrollHeight) + 'px';
    textInputArea.focus();
}