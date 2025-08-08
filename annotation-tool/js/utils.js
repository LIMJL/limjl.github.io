// js/utils.js
import { canvas } from './ui.js';
import * as state from './state.js';

let longPressTriggered = false;

// --- NEW: Gets the positions of 8 resize handles for a rectangle ---
export function getRectHandles(ann) {
    const x1 = Math.min(ann.x, ann.x + ann.w);
    const y1 = Math.min(ann.y, ann.y + ann.h);
    const x2 = Math.max(ann.x, ann.x + ann.w);
    const y2 = Math.max(ann.y, ann.y + ann.h);
    return {
        'n': { x: (x1 + x2) / 2, y: y1 },
        's': { x: (x1 + x2) / 2, y: y2 },
        'w': { x: x1, y: (y1 + y2) / 2 },
        'e': { x: x2, y: (y1 + y2) / 2 },
        'nw': { x: x1, y: y1 },
        'ne': { x: x2, y: y1 },
        'sw': { x: x1, y: y2 },
        'se': { x: x2, y: y2 },
    };
}

// --- NEW: Gets the positions of 4 resize handles for an ellipse ---
export function getEllipseHandles(ann) {
    return {
        'n': { x: ann.x, y: ann.y - ann.ry },
        's': { x: ann.x, y: ann.y + ann.ry },
        'w': { x: ann.x - ann.rx, y: ann.y },
        'e': { x: ann.x + ann.rx, y: ann.y },
    };
}

// --- NEW: Determines which handle is at a given point for a selected annotation ---
export function getHandleAtPoint(ann, x, y) {
    if (!ann || (ann.type !== 'rect' && ann.type !== 'ellipse')) return null;

    const handleSize = 10 / state.zoom;
    let handles;
    if (ann.type === 'rect') {
        handles = getRectHandles(ann);
    } else if (ann.type === 'ellipse') {
        handles = getEllipseHandles(ann);
    }

    for (const handleName in handles) {
        const handlePos = handles[handleName];
        if (Math.hypot(x - handlePos.x, y - handlePos.y) < handleSize) {
            return handleName;
        }
    }

    // If no handle was hit, check if the body was hit
    if (hitTest(ann, x, y)) {
        return 'body';
    }

    return null;
}

export function screenToImageCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left - state.viewX) / state.zoom,
        y: (clientY - rect.top - state.viewY) / state.zoom
    };
}

export function imageToScreenCoords(imageX, imageY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: imageX * state.zoom + state.viewX + rect.left,
        y: imageY * state.zoom + state.viewY + rect.top
    };
}

export async function hitTest(ann, x, y) {
    const ui = await import('./ui.js');
    const ctx = ui.ctx;
    if (!ctx) return false;

    const tolerance = 10 / state.zoom;
    if (ann.type === 'highlighter') {
        for (let i = 0; i < ann.path.length - 1; i++) {
            if (distToSegment({ x, y }, ann.path[i], ann.path[i + 1]) < ann.lineWidth / 2) return true;
        }
        return false;
    }
    if (ann.type === 'arrow') return ann.x2 !== undefined && ann.y2 !== undefined ? distToSegment({ x, y }, { x: ann.x, y: ann.y }, { x: ann.x2, y: ann.y2 }) < tolerance : false;
    if (ann.type === 'number') return Math.hypot(ann.x - x, ann.y - y) < (ann.size || 18) + tolerance / 2;
    if (ann.type === 'ellipse') {
        const dx = x - ann.x;
        const dy = y - ann.y;
        // Check if point is inside the ellipse
        const inEllipse = ((dx * dx) / (ann.rx * ann.rx)) + ((dy * dy) / (ann.ry * ann.ry)) <= 1;
        // For hit-testing, also check if point is near the edge even if slightly outside
        const onEdge = Math.abs(1 - (((dx * dx) / (ann.rx * ann.rx)) + ((dy * dy) / (ann.ry * ann.ry)))) < 0.2;
        return inEllipse || onEdge;
    }
    if (ann.type === 'rect') {
        const x1 = Math.min(ann.x, ann.x + ann.w);
        const x2 = Math.max(ann.x, ann.x + ann.w);
        const y1 = Math.min(ann.y, ann.y + ann.h);
        const y2 = Math.max(ann.y, ann.y + ann.h);
        const onBody = (x > x1 && x < x2 && y > y1 && y < y2);
        // Check if point is near the border
        const onBorder = (x > x1 - tolerance && x < x2 + tolerance && y > y1 - tolerance && y < y2 + tolerance);
        return onBody || onBorder;
    }
    if (ann.type === 'text') {
        ctx.save();
        ctx.font = `${ann.size}px ${ann.font}`;
        const lines = ann.text.split('\n');
        const lineHeight = ann.size * 1.2;
        const padding = ann.bgColor ? 4 : 0;
        let maxWidth = 0;
        lines.forEach(line => {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxWidth) maxWidth = metrics.width;
        });
        const w = maxWidth + padding * 2;
        const h = (lines.length * lineHeight) - (ann.size * 0.2) + padding;
        const x1 = ann.x - padding;
        const y1 = ann.y - padding / 2;
        ctx.restore();
        return (x > x1 && x < x1 + w && y > y1 && y < y1 + h);
    }
    return false;
}

export function distToSegment(p, v, w) {
    let l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

export function addLongPress(element, longPressAction, clickAction) {
    let timer;
    const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;
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
        if (longPressTriggered) {
            e.preventDefault();
            e.stopPropagation();
        } else if (clickAction) {
            clickAction(e);
        }
    };
    const contextMenu = (e) => {
        e.preventDefault();
        clearTimeout(timer);
        if (longPressAction) longPressAction(e);
    };
    element.addEventListener("mousedown", start);
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("mouseup", end);
    element.addEventListener("mouseleave", end);
    element.addEventListener("touchend", end);
    element.addEventListener("click", click, true);
    element.addEventListener("contextmenu", contextMenu);
}

export function isLongPressTriggered() {
    return longPressTriggered;
}

export function resetLongPress() {
    longPressTriggered = false;
}