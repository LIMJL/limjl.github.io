// js/utils.js
import { canvas } from './ui.js';
import * as state from './state.js';

let longPressTriggered = false;

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
    if (ann.type === 'ellipse') return ((x - ann.x) ** 2) / ((ann.rx || 1) ** 2) + ((y - ann.y) ** 2) / ((ann.ry || 1) ** 2) <= 1.2;
    if (ann.type === 'rect') {
        const x1 = Math.min(ann.x, ann.x + ann.w), x2 = Math.max(ann.x, ann.x + ann.w);
        const y1 = Math.min(ann.y, ann.y + ann.h), y2 = Math.max(ann.y, ann.y + ann.h);
        return x > x1 - tolerance / 2 && x < x2 + tolerance / 2 && y > y1 - tolerance / 2 && y < y2 + tolerance / 2;
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