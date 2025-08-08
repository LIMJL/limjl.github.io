import * as stateManager from './state.js';
import { initUI, setupIcons, setupMenus, updateToolbarState, colorPicker, textInputContainer, hideAllMenus, updateCursor } from './ui.js';
// --- FIX Step 1: Import onCanvasMouseUp to finalize actions ---
import { setupEventListeners, onCanvasMouseUp } from './events.js';
import { createBrush } from './file.js';
import { draw } from './drawing.js';
import { initCrop } from './crop.js';

// --- Global Variables ---
window.img = null;

// --- State Management Bridge ---
export function setMode(newMode, fromUndoRedo = false) {
    // --- FIX Step 2: Check for 'drawing' OR 'dragging' (resizing/moving) ---
    // If the user is in the middle of any action, simulate a "mouse up" to
    // complete it before changing the tool. This prevents state conflicts.
    if (!fromUndoRedo && (stateManager.drawing || stateManager.dragging)) {
        onCanvasMouseUp({ button: 0 });
    }
    
    stateManager.setMode(newMode);
    
    if (!fromUndoRedo) {
        hideAllMenus();
        textInputContainer.style.display = "none";
    }
    
    if (newMode === 'highlighter') {
        if (colorPicker.value === stateManager.color) {
            colorPicker.value = '#ffff00';
        }
    } else {
        colorPicker.value = stateManager.color;
    }

    updateToolbarState();
    updateCursor();
}

export function saveState() {
    let { history, historyIndex, annotations, zoom, viewX, viewY, color, numberSize, fontSize } = stateManager;
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(JSON.stringify({ annotations, zoom, viewX, viewY, color, numberSize, fontSize }));
    historyIndex = history.length - 1;
    stateManager.setHistory(history, historyIndex);
    updateToolbarState();
}

function restoreState(historyEntry) {
    const state = JSON.parse(historyEntry);
    
    stateManager.setAnnotations(state.annotations || []);
    stateManager.setZoom(state.zoom || 1.0);
    stateManager.setView(state.viewX || 0, state.viewY || 0);
    stateManager.setColor(state.color || '#ff0000');
    stateManager.setNumberSize(state.numberSize || 18, false);
    stateManager.setFontSize(state.fontSize || 24, false);
    
    colorPicker.value = stateManager.color;
    
    draw();
    updateToolbarState();
}

export function undo() {
    let { history, historyIndex } = stateManager;
    if (historyIndex > 0) {
        historyIndex--;
        stateManager.setHistory(history, historyIndex);
        restoreState(history[historyIndex]);
    }
}

export function redo() {
    let { history, historyIndex } = stateManager;
    if (historyIndex < history.length - 1) {
        historyIndex++;
        stateManager.setHistory(history, historyIndex);
        restoreState(history[historyIndex]);
    }
}

export { 
    setAnnotations, setSelected, setOriginalImageSize, 
    setDragging, setDrawing, setPanning, setSpacebarDown, setShiftPressed, 
    setPanStart, setStartPos, setTempShape, 
    setColor, setArrowStyle, setNumberSize, setFontSize, setNumberBg, setTextBg, 
    setHighlighterPath, setFontFamily, 
    setZoom, setView, 
    setHistory 
} from './state.js';

// --- Initialization ---
function initialize() {
    console.log("Annotation Tool v6.5 Initializing (Modular)...");
    
    initUI();
    setupIcons();
    setupMenus();
    createBrush();
    initCrop();
    setupEventListeners();

    setMode('number');
    saveState();
}

// --- Run the application ---
document.addEventListener('DOMContentLoaded', initialize);