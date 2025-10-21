// js/events.js
import * as state from './state.js';
import * as ui from './ui.js';
import { screenToImageCoords, hitTest, addLongPress, isLongPressTriggered, resetLongPress, getHandleAtPoint } from './utils.js';
import { draw, debouncedResize } from './drawing.js';
import { handleFile, saveProject, copyImage, downloadImage, reindexNumbers } from './file.js';
import { startCrop, onCropMouseDown, onCropMouseMove, onCropMouseUp, updateCursorForCrop } from './crop.js';
import { setMode, saveState, undo, redo, setAnnotations, setSelected, setDragging, setDrawing, setPanning, setSpacebarDown, setShiftPressed, setPanStart, setStartPos, setTempShape, setHighlighterPath, setColor, setArrowStyle, setNumberSize, setFontSize, setFontFamily, setNumberBg, setTextBg, setZoom, setView } from './app.js';

let lastMousePos = { x: 0, y: 0 };
let pinchStartDist = 0;
let longPressTimer = null;

export function setupEventListeners() {
    window.addEventListener('resize', debouncedResize);
    ui.canvasContainer.addEventListener('click', () => { if (ui.canvasContainer.classList.contains('empty') && !ui.isAnyMenuVisible()) ui.imgInput.click(); });
    ui.imgInput.addEventListener('change', e => handleFile(e.target.files[0]));
    ui.canvasContainer.addEventListener('dragover', e => e.preventDefault());
    ui.canvasContainer.addEventListener('drop', e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
    window.addEventListener('paste', e => { for (const item of e.clipboardData.items) { if (item.type.includes('image')) { handleFile(item.getAsFile()); break; } } });
    
    ui.clearBtn.addEventListener('click', handleClearOrNew);
    ui.undoBtn.addEventListener('click', undo);
    ui.redoBtn.addEventListener('click', redo);
    ui.cropBtn.addEventListener('click', startCrop);
    addLongPress(ui.numberBtn, ui.showCircleMenu, () => setMode('number'));
    ui.ellipseBtn.addEventListener('click', () => setMode('ellipse'));
    ui.rectBtn.addEventListener('click', () => setMode('rect'));
    addLongPress(ui.arrowBtn, ui.showArrowMenu, () => setMode('arrow'));
    ui.highlighterBtn.addEventListener('click', () => setMode('highlighter'));
    addLongPress(ui.textBtn, ui.showTextMenu, () => setMode('text'));
    ui.colorPicker.addEventListener('input', handleColorChange);
    ui.colorPicker.addEventListener('contextmenu', e => e.preventDefault());

    ui.zoomInBtn.addEventListener('click', zoomIn);
    ui.zoomOutBtn.addEventListener('click', zoomOut);
    ui.zoomFitBtn.addEventListener('click', fitToScreen);
    ui.saveProjectBtn.addEventListener('click', saveProject);
    ui.copyImageBtn.addEventListener('click', copyImage);
    ui.downloadImageBtn.addEventListener('click', downloadImage);

    ui.canvas.addEventListener('mousedown', onCanvasMouseDown);
    ui.canvas.addEventListener('mousemove', onCanvasMouseMove);
    ui.canvas.addEventListener('mouseup', onCanvasMouseUp);
    ui.canvas.addEventListener('mouseleave', onCanvasMouseLeave);
    ui.canvas.addEventListener('contextmenu', onCanvasContextMenu);
    ui.canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    ui.canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    ui.canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    ui.canvas.addEventListener('touchend', onCanvasTouchEnd);
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    ui.contactBtn.addEventListener('click', showContactModal);
    ui.closeModalBtn.addEventListener('click', hideContactModal);
    ui.contactModalOverlay.addEventListener('click', (e) => {
        if (e.target === ui.contactModalOverlay) {
            hideContactModal();
        }
    });

    window.addEventListener('contextmenu', e => {
        const target = e.target;
        const isEditable = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;
        const onCanvas = target === ui.canvas;
        if (!onCanvas && !isEditable) {
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousedown', e => {
        if (e.button !== 0) {
            return;
        }
        const isClickingOnMenu = [ui.circleMenu, ui.textMenu, ui.arrowMenu, ui.moveNumberInput, ui.textInputContainer, ui.contactModalOverlay].some(menu => menu.contains(e.target));
        const isClickingOnButton = [...document.querySelectorAll('.toolbar button, .toolbar input, #crop-toolbar button')].some(btn => btn.contains(e.target));
        if (!isClickingOnMenu && !isClickingOnButton) {
            ui.hideAllMenus();
        }
    });

    setupMenuEventListeners();
}

function setupMenuEventListeners() {
    ui.circleMenu.addEventListener('input', e => {
        if (e.target.id === 'menuNumberSize') {
            const newSize = parseInt(e.target.value, 10);
            setNumberSize(newSize);
            document.getElementById('number-size-value').textContent = newSize;
            document.getElementById('number-size-preview').style.width = `${newSize * 2}px`;
            document.getElementById('number-size-preview').style.height = `${newSize * 2}px`;
            if (state.selected && state.selected.type === 'number') { state.selected.size = newSize; draw(); }
        }
        if (e.target.id === 'numberBgColorPicker') {
            setNumberBg(true, e.target.value);
            if (state.selected && state.selected.type === 'number' && state.selected.bgColor) { state.selected.bgColor = state.numberBgColor; draw(); }
        }
    });
    ui.circleMenu.addEventListener('change', e => {
        if (e.target.id === 'numberBgCheckbox') {
            setNumberBg(e.target.checked);
            document.getElementById('numberBgColorPicker').disabled = !e.target.checked;
            if (state.selected && state.selected.type === 'number') {
                if (state.numberBgEnabled) state.selected.bgColor = state.numberBgColor;
                else delete state.selected.bgColor;
                draw();
                saveState();
            }
        }
    });
    ui.circleMenu.addEventListener('mouseup', saveState);

    ui.textMenu.addEventListener('input', e => {
        if (e.target.id === 'menuFontSize') {
            const newSize = parseInt(e.target.value, 10);
            setFontSize(newSize);
            document.getElementById('font-size-value').textContent = newSize;
            document.getElementById('font-size-preview').style.fontSize = `${newSize}px`;
            if (state.selected && state.selected.type === 'text') { state.selected.size = newSize; draw(); }
        }
        if (e.target.id === 'textBgColorPicker') {
            setTextBg(true, e.target.value);
            if (state.selected && state.selected.type === 'text' && state.selected.bgColor) { state.selected.bgColor = state.textBgColor; draw(); }
        }
    });
    ui.textMenu.addEventListener('change', e => {
        if (e.target.id === 'menuFontFamily') {
            setFontFamily(e.target.value);
            if (state.selected && state.selected.type === 'text') { state.selected.font = state.fontFamily; draw(); }
        }
        if (e.target.id === 'textBgCheckbox') {
            setTextBg(e.target.checked);
            document.getElementById('textBgColorPicker').disabled = !e.target.checked;
            if (state.selected && state.selected.type === 'text') {
                if (state.textBgEnabled) state.selected.bgColor = state.textBgColor;
                else delete state.selected.bgColor;
                draw();
                saveState();
            }
        }
    });
    ui.textMenu.addEventListener('mouseup', saveState);

    ui.arrowMenu.addEventListener('change', e => {
        if (e.target.name === 'arrowStyle') setArrowStyle(e.target.value);
    });

    ui.textConfirmBtn.addEventListener('click', confirmTextInput);
    ui.textCancelBtn.addEventListener('click', cancelTextInput);
    ui.textInputArea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    ui.textInputArea.addEventListener('keydown', function (ev) {
        if (ev.key === "Enter" && ev.shiftKey) { ev.preventDefault(); confirmTextInput(); }
        else if (ev.key === "Escape") { cancelTextInput(); }
    });
    
    ui.moveNumberInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            const numberAnnotations = state.annotations.filter(a => a.type === 'number');
            const maxNum = numberAnnotations.length;
            const newPos = parseInt(ui.moveNumberInput.value, 10);
            const itemToMove = state.annotations.find(a => a.num == parseInt(ui.moveNumberInput.dataset.num, 10) && a.type === 'number');
            if (itemToMove && !isNaN(newPos) && newPos > 0 && newPos <= maxNum) {
                const allButItem = state.annotations.filter(a => a !== itemToMove);
                let insertIndex = 0;
                let numCount = 0;
                for (let i = 0; i <= allButItem.length; i++) {
                    if (numCount === newPos - 1) { insertIndex = i; break; }
                    if (allButItem[i] && allButItem[i].type === 'number') { numCount++; }
                    if (i === allButItem.length) { insertIndex = allButItem.length; }
                }
                allButItem.splice(insertIndex, 0, itemToMove);
                setAnnotations(allButItem);
                reindexNumbers();
                saveState();
            }
            ui.hideAllMenus();
        } else if (ev.key === 'Escape') {
            ui.hideAllMenus();
        }
    });
}

function handleClearOrNew() {
    if (window.img) {
        if (confirm("您確定要清除目前的圖片和所有標註嗎？此操作無法復原。")) {
            window.img = null;
            setAnnotations([]);
            state.setOriginalImageSize(0, 0);
            ui.canvasContainer.classList.add('empty');
            ui.canvasContainer.style.height = '';
            ui.canvas.style.height = '';
            saveState();
            draw();
            ui.updateToolbarState();
        }
    } else {
        ui.imgInput.click();
    }
}

function handleColorChange(e) {
    if (state.mode !== 'highlighter') {
        setColor(e.target.value);
        if (state.selected) {
            state.selected.color = state.color;
            draw();
            saveState();
        }
    }
}

// [修改] 整個 onCanvasMouseDown 函式被重構
function onCanvasMouseDown(e) {
    clearTimeout(longPressTimer);
    resetLongPress();

    if (e.button !== 0) return;
    if (ui.isAnyMenuVisible()) return;
    if (state.mode === 'crop') { onCropMouseDown(e); return; }
    if (state.spacebarDown) { setPanning(true); setPanStart(e.clientX, e.clientY); ui.updateCursor(); return; }

    const { x, y } = screenToImageCoords(e.clientX, e.clientY);

    // --- 路徑 1: 如果已有物件被選取，優先處理與它的互動 ---
    if (state.selected) {
        const handle = getHandleAtPoint(state.selected, x, y);
        if (handle) {
            // 點中了已選物件或其控點 -> 開始拖曳/縮放
            const ann = state.selected;
            setDragging({
                ann,
                handle,
                startX: ann.x,
                startY: ann.y,
                startW: ann.w,
                startH: ann.h,
                startRx: ann.rx,
                startRy: ann.ry,
                clickX: x,
                clickY: y,
                offsetX: x - ann.x, // 確保 offsetX/Y 在此也被設定
                offsetY: y - ann.y,
            });
            draw();
            return; // 處理完畢，結束函式
        } else {
            // 點擊在已選物件之外 -> 取消選取
            setSelected(null);
            // 注意：不返回，讓程式繼續，看是否點中了其他物件
        }
    }

    // --- 路徑 2: 如果沒有物件被選取（或剛被取消選取），尋找新目標 ---
    let hit = false;
    for (let i = state.annotations.length - 1; i >= 0; i--) {
        if (hitTest(state.annotations[i], x, y)) {
            hit = true;
            const ann = state.annotations[i];
            
            if (ann.type === 'number') {
                longPressTimer = setTimeout(() => {
                    resetLongPress();
                    setDragging(null);
                    ui.showMoveNumberInput(e, ann);
                }, 500);
            }

            state.annotations.splice(i, 1);
            state.annotations.push(ann);
            setSelected(ann);

            setDragging({ ann, handle: 'body', offsetX: x - ann.x, offsetY: y - ann.y });

            setMode(ann.type);
            
            if (ann.type !== 'highlighter') {
                setColor(ann.color || '#ff0000');
                ui.colorPicker.value = state.color;
            } else {
                ui.colorPicker.value = ann.color;
            }
            if (ann.type === 'arrow') setArrowStyle(ann.style);
            if (ann.type === 'text') { setFontSize(ann.size, true); setFontFamily(ann.font); }
            if (ann.type === 'number') setNumberSize(ann.size, true);
            
            draw();
            return; // 找到目標並處理完畢，結束函式
        }
    }

    // --- 路徑 3: 點擊在空白處，開始繪製新圖形 ---
    if (!hit) {
        setDrawing(true);
        setStartPos(x, y);
        setShiftPressed(e.shiftKey);
        
        if (state.mode === 'highlighter') {
            setHighlighterPath([{ x, y }]);
        } else if (['arrow', 'ellipse', 'rect'].includes(state.mode)) {
            setTempShape({ type: state.mode, x, y, x2: x, y2: y, color: state.color, style: state.arrowStyle });
        } else if (state.mode === 'text') {
            setDrawing(false);
            ui.showTextInput(e, x, y, null);
            e.stopPropagation();
        } else if (state.mode === 'number') {
            setDrawing(false);
            const numberAnnotations = state.annotations.filter(a => a.type === 'number');
            const newAnnotation = { type: 'number', x, y, num: numberAnnotations.length + 1, color: state.color, size: state.numberSize };
            if (state.numberBgEnabled) newAnnotation.bgColor = state.numberBgColor;
            state.annotations.push(newAnnotation);
            draw();
            saveState();
        }
    }
}

function onCanvasMouseMove(e) {
    clearTimeout(longPressTimer);
    lastMousePos = { x: e.clientX, y: e.clientY };
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    setShiftPressed(e.shiftKey);

    if (state.isPanning) {
        const dx = e.clientX - state.panStart.x;
        const dy = e.clientY - state.panStart.y;
        setView(state.viewX + dx, state.viewY + dy);
        setPanStart(e.clientX, e.clientY);
        draw();
        return;
    }

    if (state.mode === 'crop') {
        onCropMouseMove(e);
        return;
    }
    
    if (state.dragging) {
        const { ann, handle, startX, startY, startW, startH, startRx, startRy, clickX, clickY, offsetX, offsetY } = state.dragging;
        const dx = x - clickX;
        const dy = y - clickY;

        if (handle && handle !== 'body') {
            if (ann.type === 'rect') {
                let newX = startX, newY = startY, newW = startW, newH = startH;
                if (handle.includes('e')) newW += dx;
                if (handle.includes('w')) { newW -= dx; newX += dx; }
                if (handle.includes('s')) newH += dy;
                if (handle.includes('n')) { newH -= dy; newY += dy; }
                
                ann.x = newX;
                ann.w = newW;
                ann.y = newY;
                ann.h = newH;
                
            } else if (ann.type === 'ellipse') {
                if (handle.includes('e')) ann.rx = Math.max(5, startRx + dx);
                if (handle.includes('w')) ann.rx = Math.max(5, startRx - dx);
                if (handle.includes('s')) ann.ry = Math.max(5, startRy + dy);
                if (handle.includes('n')) ann.ry = Math.max(5, startRy - dy);
            }
        } else if (handle === 'body') {
            ann.x = x - offsetX;
            ann.y = y - offsetY;
            if (ann.type === 'highlighter') ann.path.forEach(p => { p.x += (x - offsetX) - ann.x; p.y += (y - offsetY) - ann.y; });
            if (ann.type === 'arrow') { ann.x2 += (x - offsetX) - ann.x; ann.y2 += (y - offsetY) - ann.y; }
        }
        draw();
    } else if (state.drawing) {
        if (state.mode === 'highlighter') {
            state.highlighterPath.push({ x, y });
        } else if (state.tempShape) {
            state.tempShape.x2 = x;
            state.tempShape.y2 = y;
        }
        draw();
    } else {
        let newCursor = 'crosshair';
        if (state.mode === 'text') newCursor = 'text';
        if (state.selected) {
            const handle = getHandleAtPoint(state.selected, x, y);
            if (handle) {
                if (handle === 'n' || handle === 's') newCursor = 'ns-resize';
                else if (handle === 'e' || handle === 'w') newCursor = 'ew-resize';
                else if (handle === 'nw' || handle === 'se') newCursor = 'nwse-resize';
                else if (handle === 'ne' || handle === 'sw') newCursor = 'nesw-resize';
                else if (handle === 'body') newCursor = 'move';
            }
        }
        ui.canvas.style.cursor = newCursor;
    }
}


export function onCanvasMouseUp(e) {
    clearTimeout(longPressTimer);
    if (isLongPressTriggered()) {
        resetLongPress();
        return;
    }
    
    if (e.button !== 0) {
        return;
    }

    if (state.isPanning) {
        setPanning(false);
        ui.updateCursor();
        return;
    }
    
    if (state.mode === 'crop') {
        onCropMouseUp();
        return;
    }

    if (state.dragging) {
        if (state.dragging.ann.type === 'rect') {
            const ann = state.dragging.ann;
            if (ann.w < 0) {
                ann.x += ann.w;
                ann.w = -ann.w;
            }
            if (ann.h < 0) {
                ann.y += ann.h;
                ann.h = -ann.h;
            }
        }
        setDragging(null);
        saveState();
        draw();
        return;
    }

    if (!state.drawing) return;
    setDrawing(false);

    if (state.mode === 'highlighter') {
        if (state.highlighterPath.length > 1) {
            state.annotations.unshift({ type: 'highlighter', path: [...state.highlighterPath], color: ui.colorPicker.value, lineWidth: 20 });
            saveState();
        }
        setHighlighterPath([]);
    } else {
        const { x, y } = screenToImageCoords(e.clientX, e.clientY);
        let dx = x - state.startPos.x, dy = y - state.startPos.y;

        if (Math.hypot(dx, dy) < (5 / state.zoom)) {
            setTempShape(null);
            draw();
            return;
        }
        
        let newAnn = null;
        if (state.mode === 'ellipse') {
            let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2);
            if (state.shiftPressed) rx = ry = Math.max(rx, ry);
            newAnn = { type: 'ellipse', x: state.startPos.x + dx / 2, y: state.startPos.y + dy / 2, rx, ry, color: state.color };
        } else if (state.mode === 'rect') {
            if (state.shiftPressed) {
                let side = Math.max(Math.abs(dx), Math.abs(dy));
                dx = side * Math.sign(dx || 1);
                dy = side * Math.sign(dy || 1);
            }
            newAnn = { type: 'rect', x: state.startPos.x, y: state.startPos.y, w: dx, h: dy, color: state.color };
        } else if (state.mode === 'arrow' && state.tempShape) {
            newAnn = { ...state.tempShape, x2: x, y2: y };
        }
        
        if (newAnn) {
            state.annotations.push(newAnn);
        }
        setTempShape(null);
        saveState();
    }
    draw();
}

function onCanvasMouseLeave(e) {
    if (state.drawing || state.dragging || state.isPanning || state.mode === 'crop') {
        onCanvasMouseUp({ button: 0, clientX: e.clientX, clientY: e.clientY });
    }
    clearTimeout(longPressTimer);
}

function onCanvasContextMenu(e) {
    e.preventDefault();
    clearTimeout(longPressTimer);
    resetLongPress();

    if (state.drawing) {
        setDrawing(false);
        setTempShape(null);
        draw();
    }
    
    if (ui.isAnyMenuVisible()) {
        ui.hideAllMenus();
    }
    
    const { x, y } = screenToImageCoords(e.clientX, e.clientY);
    
    for (let i = state.annotations.length - 1; i >= 0; i--) {
        const ann = state.annotations[i];
        if (hitTest(ann, x, y)) {
            setSelected(ann);
            if (ann.type === 'number') {
                ui.showMoveNumberInput(e, ann);
            } else if (ann.type === 'text') {
                ui.showTextInput(e, ann.x, ann.y, ann);
            } else if (ann.type === 'rect' || ann.type === 'ellipse') {
                draw();
            }
            return;
        }
    }
}

function onCanvasWheel(e) {
    if (!window.img) return;
    e.preventDefault();
    const rect = ui.canvas.getBoundingClientRect();
    handleZoom(Math.sign(e.deltaY), e.clientX - rect.left, e.clientY - rect.top);
}

function onCanvasTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: touch.target,
        button: 0,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
    };
    if (e.touches.length === 1) {
        onCanvasMouseDown(simulatedEvent);
    } else if (e.touches.length === 2) {
        setPanning(true);
        pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        ui.updateCursor();
    }
}

function onCanvasTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const simulatedEvent = {
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            target: e.touches[0].target,
            button: 0
        };
        onCanvasMouseMove(simulatedEvent);
    } else if (e.touches.length === 2 && state.isPanning) {
        const pinchCurrentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const rect = ui.canvas.getBoundingClientRect();
        const pivotX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const pivotY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        const zoomFactor = pinchCurrentDist / pinchStartDist;
        const oldZoom = state.zoom;
        const newZoom = Math.max(state.MIN_ZOOM, Math.min(state.MAX_ZOOM, state.zoom * zoomFactor));
        const newViewX = pivotX - (pivotX - state.viewX) * (newZoom / oldZoom);
        const newViewY = pivotY - (pivotY - state.viewY) * (newZoom / oldZoom);
        setZoom(newZoom);
        setView(newViewX, newViewY);
        pinchStartDist = pinchCurrentDist;
        draw();
    }
}

function onCanvasTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0] || lastMousePos;
    const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: touch.target,
        button: 0
    };
    onCanvasMouseUp(simulatedEvent);
    setPanning(false);
    ui.updateCursor();
}

function onKeyDown(e) {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (ui.contactModalOverlay.style.display === 'flex' && e.key === 'Escape') {
        hideContactModal();
        e.preventDefault();
        return;
    }

    if (e.key === ' ' && !state.spacebarDown && !ui.isAnyMenuVisible()) {
        setSpacebarDown(true);
        ui.updateCursor();
        e.preventDefault();
    }
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { undo(); e.preventDefault(); }
        if (e.key === 'y') { redo(); e.preventDefault(); }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selected) {
        const idx = state.annotations.indexOf(state.selected);
        if (idx > -1) {
            const type = state.selected.type;
            state.annotations.splice(idx, 1);
            setSelected(null);
            if (type === 'number') {
                reindexNumbers();
            } else {
                draw();
            }
            saveState();
        }
    }
}

function onKeyUp(e) {
    if (e.key === 'Shift') setShiftPressed(false);
    if (e.key === ' ') {
        setSpacebarDown(false);
        if (state.isPanning) {
            setPanning(false);
        }
        ui.updateCursor();
        e.preventDefault();
    }
}

function confirmTextInput() {
    const text = ui.textInputArea.value;
    const isEditing = ui.textInputContainer.dataset.editing === 'true';

    if (isEditing) {
        const annotationToEdit = state.selected;
        if (annotationToEdit && annotationToEdit.type === 'text') {
            if (text.trim()) {
                annotationToEdit.text = text;
            } else {
                const idx = state.annotations.indexOf(annotationToEdit);
                if (idx > -1) {
                    state.annotations.splice(idx, 1);
                    setSelected(null);
                }
            }
        }
    } else {
        if (!text.trim()) {
            cancelTextInput();
            return;
        }
        const { x: imageX, y: imageY } = JSON.parse(ui.textInputContainer.dataset.coords);
        const newAnnotation = {
            type: 'text',
            x: imageX,
            y: imageY,
            text: text,
            color: state.color,
            font: state.fontFamily,
            size: state.fontSize
        };
        if (state.textBgEnabled) {
            newAnnotation.bgColor = state.textBgColor;
        }
        state.annotations.push(newAnnotation);
    }
    
    cancelTextInput();
    draw();
    saveState();
}

function cancelTextInput() {
    ui.textInputContainer.style.display = "none";
    delete ui.textInputContainer.dataset.editing;
    delete ui.textInputContainer.dataset.coords;
}

function handleZoom(delta, pivotX, pivotY) {
    if (!window.img) return;
    const oldZoom = state.zoom;
    const newZoom = Math.max(state.MIN_ZOOM, Math.min(state.MAX_ZOOM, state.zoom - delta * state.zoom * 0.1));
    const newViewX = pivotX - (pivotX - state.viewX) * (newZoom / oldZoom);
    const newViewY = pivotY - (pivotY - state.viewY) * (newZoom / oldZoom);
    setZoom(newZoom);
    setView(newViewX, newViewY);
    draw();
}

export function zoomIn() { handleZoom(-2.5, ui.canvas.width / 2, ui.canvas.height / 2); }
export function zoomOut() { handleZoom(2.5, ui.canvas.width / 2, ui.canvas.height / 2); }
export function fitToScreen() {
    if (!window.img || !state.originalImageSize.width) return;
    const newZoom = Math.min(ui.canvas.width / state.originalImageSize.width, ui.canvas.height / state.originalImageSize.height);
    const newViewX = (ui.canvas.width - state.originalImageSize.width * newZoom) / 2;
    const newViewY = (ui.canvas.height - state.originalImageSize.height * newZoom) / 2;
    setZoom(newZoom);
    setView(newViewX, newViewY);
    draw();
}

export function showContactModal() {
    ui.hideAllMenus();
    const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLScin9rNo5K6F8rHapCGsdBs8wtEDm3W-svCQAvpFnzgdiDfaQ/viewform?embedded=true";
    ui.googleFormIframe.src = googleFormUrl;
    ui.contactModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    ui.googleFormIframe.focus();
}

function hideContactModal() {
    ui.contactModalOverlay.style.display = 'none';
    ui.googleFormIframe.src = '';
    document.body.style.overflow = '';
}