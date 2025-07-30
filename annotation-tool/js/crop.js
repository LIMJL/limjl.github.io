// js/crop.js (最終修正版 - 導出事件處理函式)

import * as state from './state.js';
import { setMode, saveState, setSelected, setAnnotations } from './app.js';
// Import cropToolbar to manipulate it directly
import { cropToolbar, updateCursor, updateToolbarState, canvas, applyCropBtn, cancelCropBtn } from './ui.js';
import { draw } from './drawing.js';
import { screenToImageCoords } from './utils.js';
import { loadImage } from './file.js';

let cropRect = null;
let dragHandle = null;
let dragStart = { x: 0, y: 0 };
let originalCropRect = null;

// --- NEW FUNCTION: To calculate and set the toolbar's position ---
export function updateCropToolbarPosition() {
    if (!cropRect || !cropToolbar) return;

    // Calculate the center of the crop box in image coordinates
    const centerX = cropRect.x + cropRect.w / 2;
    const centerY = cropRect.y + cropRect.h / 2;

    // Calculate the position relative to the canvas container, accounting for pan and zoom
    const relativeX = centerX * state.zoom + state.viewX;
    const relativeY = centerY * state.zoom + state.viewY;

    // Apply the new position. The CSS transform will handle the centering.
    cropToolbar.style.left = `${relativeX}px`;
    cropToolbar.style.top = `${relativeY}px`;
}


export function initCrop() {
    applyCropBtn.addEventListener('click', applyCrop);
    cancelCropBtn.addEventListener('click', cancelCrop);
}

export function startCrop() {
    if (!window.img) return;
    setMode('crop');
    setSelected(null);
    const w = state.originalImageSize.width * 0.8;
    const h = state.originalImageSize.height * 0.8;
    const x = (state.originalImageSize.width - w) / 2;
    const y = (state.originalImageSize.height - h) / 2;
    cropRect = { x, y, w, h };
    cropToolbar.classList.add('visible');
    
    // --- MODIFIED: Update toolbar position on start ---
    updateCropToolbarPosition();

    updateCursorForCrop({ clientX: 0, clientY: 0 });
    updateToolbarState();
    draw();
}

export function cancelCrop() {
    cropRect = null;
    dragHandle = null;
    cropToolbar.classList.remove('visible');
    setMode('number');
    updateCursor();
    updateToolbarState();
    draw();
}

export function applyCrop() {
    if (!cropRect || !window.img) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.w;
    tempCanvas.height = cropRect.h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(window.img, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, cropRect.w, cropRect.h);
    const newAnnotations = state.annotations.map(ann => {
        const newAnn = JSON.parse(JSON.stringify(ann));
        newAnn.x -= cropRect.x;
        newAnn.y -= cropRect.y;
        if (newAnn.x2 !== undefined) newAnn.x2 -= cropRect.x;
        if (newAnn.y2 !== undefined) newAnn.y2 -= cropRect.y;
        if (newAnn.path) {
            newAnn.path = newAnn.path.map(p => ({ x: p.x - cropRect.x, y: p.y - cropRect.y }));
        }
        return newAnn;
    }).filter(ann => {
        const padding = 50;
        if (ann.type === 'rect') {
            return ann.x + ann.w > -padding && ann.y + ann.h > -padding && ann.x < cropRect.w + padding && ann.y < cropRect.h + padding;
        }
        return ann.x > -padding && ann.y > -padding && ann.x < cropRect.w + padding && ann.y < cropRect.h + padding;
    });
    const newDataUrl = tempCanvas.toDataURL();
    cropRect = null;
    dragHandle = null;
    cropToolbar.classList.remove('visible');
    loadImage(newDataUrl, () => {
        setAnnotations(newAnnotations);
        saveState();
        draw();
        setMode('number');
    });
}

function getCropHandleAt(imgX, imgY) {
    if (!cropRect) return null;
    const handleSize = 10 / state.zoom;
    const handles = getCropHandles();
    for (const handle in handles) {
        const h = handles[handle];
        if (Math.abs(imgX - h.x) < handleSize && Math.abs(imgY - h.y) < handleSize) {
            return handle;
        }
    }
    if (imgX > cropRect.x && imgX < cropRect.x + cropRect.w && imgY > cropRect.y && imgY < cropRect.y + cropRect.h) {
        return 'body';
    }
    return null;
}

export function onCropMouseDown(e) {
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    dragHandle = getCropHandleAt(x, y);
    if (dragHandle) {
        dragStart = { x, y };
        originalCropRect = { ...cropRect };
    }
}

export function onCropMouseMove(e) {
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    if (dragHandle) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        let { x: newX, y: newY, w: newW, h: newH } = originalCropRect;
        if (dragHandle.includes('e')) { newW += dx; }
        if (dragHandle.includes('w')) { newW -= dx; newX += dx; }
        if (dragHandle.includes('s')) { newH += dy; }
        if (dragHandle.includes('n')) { newH -= dy; newY += dy; }
        if (dragHandle === 'body') { newX += dx; newY += dy; }
        if (newW < 20) { if (dragHandle.includes('w')) newX = cropRect.x + cropRect.w - 20; newW = 20; }
        if (newH < 20) { if (dragHandle.includes('n')) newY = cropRect.y + cropRect.h - 20; newH = 20; }
        if (newX < 0) { newW += newX; newX = 0; }
        if (newY < 0) { newH += newY; newY = 0; }
        if (newX + newW > state.originalImageSize.width) { newW = state.originalImageSize.width - newX; }
        if (newY + newH > state.originalImageSize.height) { newH = state.originalImageSize.height - newY; }
        cropRect = { x: newX, y: newY, w: newW, h: newH };
        
        // --- MODIFIED: Update toolbar position while dragging/resizing ---
        updateCropToolbarPosition();
        draw();

    } else {
        updateCursorForCrop(e);
    }
}

export function onCropMouseUp() {
    dragHandle = null;
    originalCropRect = null;
}

export function updateCursorForCrop(e) {
    if (!e || state.mode !== 'crop') return;
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    const handle = getCropHandleAt(x, y);
    if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
    else if (handle === 'e' || handle === 'w') canvas.style.cursor = 'ew-resize';
    else if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
    else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
    else if (handle === 'body') canvas.style.cursor = 'move';
    else canvas.style.cursor = 'crosshair';
}

export function getCropHandles() {
    if (!cropRect) return {};
    return {
        'nw': { x: cropRect.x, y: cropRect.y }, 'n': { x: cropRect.x + cropRect.w / 2, y: cropRect.y }, 'ne': { x: cropRect.x + cropRect.w, y: cropRect.y },
        'e': { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h / 2 }, 'se': { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h },
        's': { x: cropRect.x + cropRect.w / 2, y: cropRect.y + cropRect.h }, 'sw': { x: cropRect.x, y: cropRect.y + cropRect.h },
        'w': { x: cropRect.x, y: cropRect.y + cropRect.h / 2 },
    };
}

// Pass the whole context object
export function drawCropOverlay(ctx, zoom) {
    if (!cropRect) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    // Path for the outer dimming area
    ctx.rect(0, 0, state.originalImageSize.width, state.originalImageSize.height);
    // Create a hole for the crop area
    ctx.rect(cropRect.x + cropRect.w, cropRect.y, -cropRect.w, cropRect.h);
    ctx.fill();

    // Draw the border and handles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const handleSize = 8 / zoom;
    const handles = getCropHandles();
    for (const handle in handles) {
        const h = handles[handle];
        ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }
    ctx.restore();
}