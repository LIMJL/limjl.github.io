// js/drawing.js (最终修正版 - 精确文字基线定位 & 向下生长)
import { canvas, ctx, canvasContainer, colorPicker } from './ui.js';
import { fitToScreen } from './events.js';
import * as state from './state.js';
// --- MODIFICATION 1 of 2: Import the new function ---
import { drawCropOverlay, updateCropToolbarPosition } from './crop.js';
import { isBrushReady, getBrushImage, drawBrushStroke } from './file.js';

window.requestIdleCallback = window.requestIdleCallback || function(cb) { return setTimeout(() => { const start = Date.now(); cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }); }, 1); };
window.cancelIdleCallback = window.cancelIdleCallback || function(id) { clearTimeout(id); };

let resizeTimeout;
export function debouncedResize() { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resizeCanvas, 100); }

export function resizeCanvas() {
    if (window.img) {
        const containerWidth = canvasContainer.clientWidth;
        if (containerWidth > 0 && state.originalImageSize.width > 0) {
            const targetHeight = containerWidth * (state.originalImageSize.height / state.originalImageSize.width);
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

export function draw() {
    requestIdleCallback(() => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(state.viewX, state.viewY);
        ctx.scale(state.zoom, state.zoom);
        if (window.img) {
            ctx.drawImage(window.img, 0, 0, state.originalImageSize.width, state.originalImageSize.height);
        }
        state.annotations.filter(a => a.type === 'highlighter').forEach(ann => drawAnnotation(ann));
        state.annotations.filter(a => a.type !== 'highlighter').forEach(ann => drawAnnotation(ann));
        if (state.drawing && state.tempShape) {
            drawTempShape(state.tempShape);
        }
        if (state.highlighterPath.length > 1) {
            drawHighlighterPath(state.highlighterPath);
        }
        if (state.mode === 'crop') {
            drawCropOverlay(ctx, state.zoom);
            // --- MODIFICATION 2 of 2: Add this function call ---
            updateCropToolbarPosition();
        }
        ctx.restore();
    });
}

export function drawAnnotation(ann) {
    const isSelected = state.selected === ann;
    const renderCtx = this && this.ctx ? this.ctx : ctx;
    const renderZoom = this && this.zoom ? this.zoom : state.zoom;
    const lw = 2.5 / renderZoom;
    renderCtx.save();
    if (ann.type === 'arrow') {
        drawArrow.call({ ctx: renderCtx, zoom: renderZoom }, ann, false, isSelected);
    } else if (ann.type === 'highlighter') {
        renderCtx.globalAlpha = 0.4;
        renderCtx.strokeStyle = ann.color;
        renderCtx.lineWidth = ann.lineWidth;
        renderCtx.lineCap = 'round';
        renderCtx.lineJoin = 'round';
        renderCtx.beginPath();
        ann.path.forEach((p, i) => i === 0 ? renderCtx.moveTo(p.x, p.y) : renderCtx.lineTo(p.x, p.y));
        renderCtx.stroke();
        if (isSelected) {
            renderCtx.globalAlpha = 0.7;
            renderCtx.setLineDash([4 / renderZoom, 4 / renderZoom]);
            renderCtx.lineWidth = 1 / renderZoom;
            renderCtx.strokeStyle = '#000';
            renderCtx.stroke();
            renderCtx.setLineDash([]);
        }
    } else {
        renderCtx.strokeStyle = ann.color || "#ff0000";
        renderCtx.fillStyle = ann.color || "#ff0000";
        renderCtx.lineWidth = lw;
        if (isSelected) {
            renderCtx.shadowColor = "#339af0";
            renderCtx.shadowBlur = 8 / renderZoom;
        }
        if (ann.type === 'number') {
            const radius = ann.size;
            renderCtx.beginPath();
            renderCtx.arc(ann.x, ann.y, radius, 0, 2 * Math.PI);
            if (ann.bgColor) {
                renderCtx.fillStyle = ann.bgColor;
                renderCtx.fill();
            }
            renderCtx.stroke();
            renderCtx.fillStyle = ann.color || "#ff0000";
            renderCtx.font = `bold ${Math.round(radius * 1.1)}px Arial`;
            renderCtx.textAlign = 'center';
            renderCtx.textBaseline = 'middle';
            renderCtx.shadowBlur = 0;
            renderCtx.fillText(ann.num, ann.x, ann.y);
        } else if (ann.type === 'ellipse') {
            renderCtx.beginPath();
            renderCtx.ellipse(ann.x, ann.y, ann.rx, ann.ry, 0, 0, 2 * Math.PI);
            renderCtx.stroke();
        } else if (ann.type === 'rect') {
            renderCtx.strokeRect(ann.x, ann.y, ann.w, ann.h);
        } else if (ann.type === 'text') {
            renderCtx.font = `${ann.size}px ${ann.font}`;
            renderCtx.textAlign = 'left';
            
            // THE FIX IS HERE:
            // 1. Set the baseline to 'top'. This means fillText(x, y) will draw the text
            //    with its TOP-LEFT corner at (x, y). This is the simplest alignment.
            renderCtx.textBaseline = 'top'; 
            
            const lines = ann.text.split('\n');
            const lineHeight = ann.size * 1.2;

            if (ann.bgColor) {
                const padding = 4;
                let maxWidth = 0;
                lines.forEach(line => {
                    const metrics = renderCtx.measureText(line);
                    if (metrics.width > maxWidth) { maxWidth = metrics.width; }
                });
                const rectW = maxWidth + padding * 2;
                const rectH = (lines.length * lineHeight) - (ann.size * 0.2) + padding;
                
                const rectX = ann.x - padding;
                // Since baseline is 'top', the background's Y position is also simple.
                const rectY = ann.y - padding / 2;
                
                renderCtx.fillStyle = ann.bgColor;
                renderCtx.fillRect(rectX, rectY, rectW, rectH);
            }

            renderCtx.fillStyle = ann.color || "#ff0000";
            
            // 2. Draw each line, starting from the annotation's Y coordinate
            //    and adding the line height for each subsequent line.
            lines.forEach((line, index) => {
                renderCtx.fillText(line, ann.x, ann.y + (index * lineHeight));
            });
        }
    }
    renderCtx.restore();
}

function drawTempShape(shape) {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2.5 / state.zoom;
    let dx = shape.x2 - shape.x, dy = shape.y2 - shape.y;
    if (shape.type === 'ellipse') {
        let rx = Math.abs(dx / 2), ry = Math.abs(dy / 2);
        let cx = shape.x + dx / 2, cy = shape.y + dy / 2;
        if (state.shiftPressed) rx = ry = Math.max(rx, ry);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
    } else if (shape.type === 'rect') {
        if (state.shiftPressed) {
            let side = Math.max(Math.abs(dx), Math.abs(dy));
            dx = side * Math.sign(dx || 1);
            dy = side * Math.sign(dy || 1);
        }
        ctx.strokeRect(shape.x, shape.y, dx, dy);
    } else if (shape.type === 'arrow') {
        drawArrow.call({ ctx: ctx, zoom: state.zoom }, shape, true, false);
    }
    ctx.restore();
}

function drawHighlighterPath(path) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
}

export function drawArrow(ann, isTemp, isSelected) {
    const { style = "classic", color: c = "#ff0000", x: x1, y: y1, x2, y2 } = ann;
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return;
    const currentCtx = this.ctx;
    const currentZoom = this.zoom;
    const lw = 2.5 / currentZoom;
    currentCtx.save();
    currentCtx.lineCap = "round";
    if (style === 'hatched' || style === 'blocky') {
        const points = getBlockArrowPolygon(x1, y1, x2, y2);
        if (points.length > 0) {
            currentCtx.lineWidth = lw;
            currentCtx.strokeStyle = c;
            if (style === 'hatched') {
                currentCtx.save();
                drawWobblyPath(currentCtx, points, 5);
                currentCtx.clip();
                const hatchWidth = 8;
                currentCtx.lineWidth = 1.5 / currentZoom;
                const bounds = points.reduce((acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
                const diag = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
                for (let i = -diag; i < diag; i += hatchWidth) {
                    currentCtx.beginPath();
                    currentCtx.moveTo(bounds.minX + i, bounds.minY);
                    currentCtx.lineTo(bounds.minX + i + diag, bounds.minY + diag);
                    currentCtx.stroke();
                }
                currentCtx.restore();
            }
            drawWobblyPath(currentCtx, points, 5);
            currentCtx.stroke();
        }
    } else if (style === "classic") {
        currentCtx.strokeStyle = c;
        currentCtx.lineWidth = 5 / currentZoom;
        const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
        if (dist > 5 / currentZoom) {
            currentCtx.beginPath();
            const pullback = 5 / currentZoom;
            const x2_line = x2 - pullback * (dx / dist);
            const y2_line = y2 - pullback * (dy / dist);
            currentCtx.moveTo(x1, y1);
            currentCtx.lineTo(x2_line, y2_line);
            currentCtx.stroke();
        }
        drawArrowHead.call(this, x1, y1, x2, y2, c);
    } else if (style === "curve") {
        currentCtx.strokeStyle = c;
        currentCtx.lineWidth = lw;
        let dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        let cx = x1 + dx / 2 - dy / 4, cy = y1 + dy / 2 + dx / 4;
        let tangentAngle;
        if (len > 5 / currentZoom) {
            let t = 1 - Math.min(5, len / 2) / len;
            let endX = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2;
            let endY = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2;
            currentCtx.beginPath();
            currentCtx.moveTo(x1, y1);
            currentCtx.quadraticCurveTo(cx, cy, endX, endY);
            currentCtx.stroke();
            tangentAngle = Math.atan2(y2 - endY, x2 - endX);
        } else {
            tangentAngle = Math.atan2(dy, dx);
        }
        drawArrowHeadAt.call(this, x2, y2, tangentAngle, c);
    } else if (style === "chalk-brush") {
        const brush = getBrushImage();
        if (!isBrushReady() || !brush) { currentCtx.restore(); return; }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = currentCtx.canvas.width;
        tempCanvas.height = currentCtx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
        if (dist < 1) { currentCtx.restore(); return; }
        const cx = x1 + dx / 2 - dy * 0.25, cy = y1 + dy / 2 + dx * 0.25;
        const curvePoints = [];
        for (let t = 0; t <= 1; t += 0.02) curvePoints.push({ x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2, y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2 });
        for (let i = 0; i < curvePoints.length - 1; i++) drawBrushStroke(tempCtx, curvePoints[i], curvePoints[i + 1], false);
        const lastP = curvePoints[curvePoints.length - 1];
        const secondLastP = curvePoints[curvePoints.length - 2] || { x: x1, y: y1 };
        const angle = Math.atan2(lastP.y - secondLastP.y, lastP.x - secondLastP.x);
        const headLen = Math.min(30, dist * 0.3);
        const headAngle = Math.PI / 6;
        const p_tip = { x: x2, y: y2 };
        const p_h1 = { x: x2 - headLen * Math.cos(angle - headAngle), y: y2 - headLen * Math.sin(angle - headAngle) };
        const p_h2 = { x: x2 - headLen * Math.cos(angle + headAngle), y: y2 - headLen * Math.sin(angle + headAngle) };
        drawBrushStroke(tempCtx, p_tip, p_h1, true);
        drawBrushStroke(tempCtx, p_tip, p_h2, true);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = c;
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        currentCtx.drawImage(tempCanvas, 0, 0);
    }
    if (isSelected) {
        currentCtx.shadowColor = "#339af0";
        currentCtx.shadowBlur = 8 / currentZoom;
        currentCtx.setLineDash([4 / currentZoom, 2 / currentZoom]);
        currentCtx.strokeStyle = "#339af0";
        currentCtx.lineWidth = lw;
        if (style !== 'blocky' && style !== 'hatched') {
            currentCtx.beginPath();
            currentCtx.arc(x1, y1, 8 / currentZoom, 0, 2 * Math.PI);
            currentCtx.arc(x2, y2, 8 / currentZoom, 0, 2 * Math.PI);
            currentCtx.stroke();
        } else {
            const points = getBlockArrowPolygon(x1, y1, x2, y2);
            if (points.length > 0) {
                currentCtx.beginPath();
                points.forEach((p, i) => i === 0 ? currentCtx.moveTo(p.x, p.y) : currentCtx.lineTo(p.x, p.y));
                currentCtx.closePath();
                currentCtx.stroke();
            }
        }
    }
    currentCtx.restore();
}

function getBlockArrowPolygon(x1, y1, x2, y2) {
    const bodyWidth = 12, headWidth = 28, headLength = 25;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < headLength) return [];
    const angle = Math.atan2(dy, dx), pAngle = angle + Math.PI / 2, bodyLen = len - headLength;
    const p1 = { x: x1 - Math.cos(pAngle) * bodyWidth / 2, y: y1 - Math.sin(pAngle) * bodyWidth / 2 };
    const p2 = { x: p1.x + Math.cos(angle) * bodyLen, y: p1.y + Math.sin(angle) * bodyLen };
    const p3 = { x: p2.x - Math.cos(pAngle) * (headWidth - bodyWidth) / 2, y: p2.y - Math.sin(pAngle) * (headWidth - bodyWidth) / 2 };
    const p4 = { x: x2, y: y2 };
    const p5 = { x: p3.x + Math.cos(pAngle) * headWidth, y: p3.y + Math.sin(pAngle) * headWidth };
    const p6 = { x: p1.x + Math.cos(pAngle) * bodyWidth, y: p1.y + Math.sin(pAngle) * bodyWidth };
    const p7 = { x: p6.x + Math.cos(angle) * bodyLen, y: p6.y + Math.sin(angle) * bodyLen };
    return [p1, p2, p3, p4, p5, p7, p6, p1];
}

function drawWobblyPath(targetCtx, points, randomness) {
    if (points.length < 2) return;
    targetCtx.beginPath();
    targetCtx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y, dist = Math.hypot(dx, dy);
        const segments = Math.max(2, Math.floor(dist / 15)), pAngle = Math.atan2(dy, dx) + Math.PI / 2;
        for (let j = 1; j <= segments; j++) {
            const t = j / segments, x = p1.x + t * dx, y = p1.y + t * dy;
            const rand = (Math.random() - 0.5) * randomness;
            targetCtx.lineTo(x + Math.cos(pAngle) * rand, y + Math.sin(pAngle) * rand);
        }
    }
}

function drawArrowHead(x1, y1, x2, y2, color) {
    drawArrowHeadAt.call(this, x2, y2, Math.atan2(y2 - y1, x2 - x1), color);
}

function drawArrowHeadAt(x, y, angle, color) {
    let len = 18 / this.zoom;
    const angleOffset = Math.PI / 6;
    const currentCtx = this.ctx;
    currentCtx.save();
    currentCtx.fillStyle = color;
    currentCtx.beginPath();
    currentCtx.moveTo(x, y);
    currentCtx.lineTo(x - len * Math.cos(angle - angleOffset), y - len * Math.sin(angle - angleOffset));
    currentCtx.lineTo(x - len * Math.cos(angle + angleOffset), y - len * Math.sin(angle + angleOffset));
    currentCtx.closePath();
    currentCtx.fill();
    currentCtx.restore();
}