// js/file.js (最终修正版 - 修复 require is not defined)
import * as state from './state.js';
import { setAnnotations, setOriginalImageSize, saveState, setColor, setSelected } from './app.js';
import { draw, drawAnnotation, resizeCanvas } from './drawing.js';
// ***** 1. 在顶部引入 hideAllMenus *****
import { canvasContainer, colorPicker, updateToolbarState, hideAllMenus } from './ui.js';
import { fitToScreen } from './events.js';

let _brushImage = null;
let _isBrushReady = false;

export function createBrush() {
    const brushCanvas = document.createElement('canvas');
    const brushCtx = brushCanvas.getContext('2d');
    const size = 50;
    brushCanvas.width = size;
    brushCanvas.height = size;
    const gradient = brushCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    brushCtx.fillStyle = gradient;
    brushCtx.fillRect(0, 0, size, size);
    const imageData = brushCtx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
            const noise = (Math.random() - 0.5) * 80;
            pixels[i + 3] = Math.max(0, pixels[i + 3] - noise * (1 - pixels[i + 3] / 255));
        }
    }
    brushCtx.putImageData(imageData, 0, 0);
    _brushImage = new Image();
    _brushImage.onload = () => { _isBrushReady = true; };
    _brushImage.src = brushCanvas.toDataURL();
}

export function isBrushReady() { return _isBrushReady; }
export function getBrushImage() { return _brushImage; }

export function drawBrushStroke(targetCtx, p1, p2, isHead) {
    if (!_isBrushReady) return;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    for (let i = 0; i < dist; i += 2) {
        const t = i / dist, x = p1.x + t * (p2.x - p1.x), y = p1.y + t * (p2.y - p1.y);
        const size = (isHead ? 25 : 20) * (0.8 + Math.random() * 0.4);
        targetCtx.globalAlpha = 0.5 + Math.random() * 0.5;
        targetCtx.drawImage(_brushImage, x - size / 2, y - size / 2, size, size);
    }
}

export function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    if (file.type === 'application/json') {
        reader.onload = e => loadProject(JSON.parse(e.target.result));
        reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
        reader.onload = e => loadImage(e.target.result);
        reader.readAsDataURL(file);
    } else {
        alert('不支援的檔案格式。請選擇圖片檔或 .json 專案檔。');
    }
}

export function loadImage(src, callback) {
    window.img = new window.Image();
    window.img.onload = () => {
        setOriginalImageSize(window.img.width, window.img.height);
        canvasContainer.classList.remove('empty');
        state.setNumberSize(0, false);
        state.setFontSize(0, false);
        calculateDefaultAnnotationSizes();
        if (!callback) { setAnnotations([]); }
        resizeCanvas();
        if (!callback) { saveState(); }
        updateToolbarState();
        if (callback) callback();
    };
    window.img.src = src;
}

function calculateDefaultAnnotationSizes() {
    if (!window.img) return;
    const baseSize = Math.min(state.originalImageSize.width, state.originalImageSize.height);
    const defaultNumberSize = Math.max(12, Math.round(baseSize * 0.025));
    const defaultFontSize = Math.max(16, Math.round(baseSize * 0.03));
    if (!state.numberSizeChangedByUser) state.setNumberSize(defaultNumberSize, false);
    if (!state.fontSizeChangedByUser) state.setFontSize(defaultFontSize, false);
}

export function saveProject() {
    if (!window.img) { alert("請先載入一張圖片才能儲存專案。"); return; }
    const projectAnnotations = state.annotations.map(ann => {
        const newAnn = { ...ann };
        if (state.originalImageSize.width === 0 || state.originalImageSize.height === 0) return newAnn;
        const scaleX = 1 / state.originalImageSize.width;
        const scaleY = 1 / state.originalImageSize.height;
        if (newAnn.x !== undefined) newAnn.x *= scaleX;
        if (newAnn.y !== undefined) newAnn.y *= scaleY;
        if (newAnn.x2 !== undefined) newAnn.x2 *= scaleX;
        if (newAnn.y2 !== undefined) newAnn.y2 *= scaleY;
        if (newAnn.w !== undefined) newAnn.w *= scaleX;
        if (newAnn.h !== undefined) newAnn.h *= scaleY;
        if (newAnn.rx !== undefined) newAnn.rx *= scaleX;
        if (newAnn.ry !== undefined) newAnn.ry *= scaleY;
        if (newAnn.path) newAnn.path = newAnn.path.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
        return newAnn;
    });
    const fileName = prompt("請輸入專案檔名：", "my-annotation-project");
    if (!fileName) return;
    const projectData = { imageData: window.img.src, annotations: projectAnnotations };
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadProject(projectData) {
    if (!projectData.imageData || !projectData.annotations) { alert('無效的專案檔。'); return; }
    loadImage(projectData.imageData, () => {
        const loadedAnnotations = projectData.annotations.map(ann => {
            const newAnn = { ...ann };
            const scaleX = state.originalImageSize.width;
            const scaleY = state.originalImageSize.height;
            if (newAnn.x !== undefined) newAnn.x *= scaleX;
            if (newAnn.y !== undefined) newAnn.y *= scaleY;
            if (newAnn.x2 !== undefined) newAnn.x2 *= scaleX;
            if (newAnn.y2 !== undefined) newAnn.y2 *= scaleY;
            if (newAnn.w !== undefined) newAnn.w *= scaleX;
            if (newAnn.h !== undefined) newAnn.h *= scaleY;
            if (newAnn.rx !== undefined) newAnn.rx *= scaleX;
            if (newAnn.ry !== undefined) newAnn.ry *= scaleY;
            if (newAnn.path) newAnn.path = newAnn.path.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
            return newAnn;
        });
        setAnnotations(loadedAnnotations);
        if (state.annotations.length > 0) {
            const firstAnn = state.annotations.find(a => a.type !== 'highlighter');
            if (firstAnn) {
                setColor(firstAnn.color || '#ff0000');
                colorPicker.value = state.color;
            }
        }
        reindexNumbers();
        saveState();
        fitToScreen();
    });
}

export function downloadImage() {
    const fileName = prompt("請輸入圖片檔名：", "annotated-image");
    if (!fileName || !window.img) return;
    setSelected(null);
    // ***** 2. 移除 require，直接使用 *****
    hideAllMenus();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.originalImageSize.width;
    tempCanvas.height = state.originalImageSize.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(window.img, 0, 0);
    state.annotations.forEach(ann => {
        drawAnnotation.call({ ctx: tempCtx, zoom: 1, selected: null }, ann);
    });
    requestIdleCallback(() => {
        tempCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
        draw();
    });
}

export function copyImage() {
    if (!navigator.clipboard || !navigator.clipboard.write || !window.img) {
        alert('您的瀏覽器不支援此功能或沒有圖片可複製。');
        return;
    }
    setSelected(null);
    // ***** 3. 移除 require，直接使用 *****
    hideAllMenus();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.originalImageSize.width;
    tempCanvas.height = state.originalImageSize.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(window.img, 0, 0);
    state.annotations.forEach(ann => {
        drawAnnotation.call({ ctx: tempCtx, zoom: 1, selected: null }, ann);
    });
    requestIdleCallback(() => {
        tempCanvas.toBlob(blob => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
                alert('影像已複製到剪貼簿！');
            }).catch(err => {
                console.error('Copy failed:', err);
                alert('複製失敗。請檢查瀏覽器權限。');
            });
        }, 'image/png');
        draw();
    });
}

export function reindexNumbers() {
    const numberAnnotations = state.annotations.filter(a => a.type === 'number');
    numberAnnotations.forEach((ann, index) => {
        ann.num = index + 1;
    });
    draw();
}