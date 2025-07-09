/**
 * Document Cropper Tool (Refactored Version)
 * Styled after the annotation-tool.
 * This version preserves all original sizing and cropping logic.
 * FINAL and VERIFIED FIX for crop box visual size consistency.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    const cropperInstances = {};

    // --- Core Functions ---

    /**
     * Initializes a single cropper tool widget.
     * @param {HTMLElement} widgetContainer - The .widget-container element.
     */
    function initializeTool(widgetContainer) {
        // --- DOM Elements ---
        const workspace = widgetContainer.querySelector('.workspace');
        const fileInput = widgetContainer.querySelector('.file-input');
        const controlsToolbar = widgetContainer.querySelector('.controls-toolbar');
        const toolType = workspace.dataset.toolType;

        /**
         * Handles file selection (from click or drag-and-drop).
         * @param {File} file - The selected image file.
         */
        function handleFile(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('請選擇有效的圖片檔案。');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target.result) {
                    workspace.classList.remove('is-empty');
                    workspace.innerHTML = '';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    workspace.appendChild(img);

                    controlsToolbar.classList.remove('is-hidden');

                    if (cropperInstances[toolType]) {
                        cropperInstances[toolType].destroy();
                    }

                    const cropper = new Cropper(img, getCropperOptions(toolType));
                    cropperInstances[toolType] = cropper;
                    
                    updateGlobalDownloadButton();
                }
            };
            reader.readAsDataURL(file);
        }
        
        function clearTool() {
             if (cropperInstances[toolType]) {
                cropperInstances[toolType].destroy();
                delete cropperInstances[toolType];
            }
            workspace.classList.add('is-empty');
            workspace.innerHTML = `
                <div class="workspace-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>將${getToolName(toolType)}圖片拖曳至此或點擊選擇</span>
                </div>
                <input type="file" class="file-input" accept="image/*">
            `;
            widgetContainer.querySelector('.file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
            controlsToolbar.classList.add('is-hidden');
            updateGlobalDownloadButton();
        }

        // --- Event Listeners ---
        workspace.addEventListener('click', () => { if (workspace.classList.contains('is-empty')) widgetContainer.querySelector('.file-input').click(); });
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        workspace.addEventListener('dragover', (e) => { e.preventDefault(); if (workspace.classList.contains('is-empty')) workspace.classList.add('dragover'); });
        workspace.addEventListener('dragleave', (e) => { e.preventDefault(); workspace.classList.remove('dragover'); });
        workspace.addEventListener('drop', (e) => { e.preventDefault(); workspace.classList.remove('dragover'); if (workspace.classList.contains('is-empty')) handleFile(e.dataTransfer.files[0]); });
        controlsToolbar.querySelector('.rotate-left').addEventListener('click', () => { if (cropperInstances[toolType]) cropperInstances[toolType].rotate(-90); });
        controlsToolbar.querySelector('.rotate-right').addEventListener('click', () => { if (cropperInstances[toolType]) cropperInstances[toolType].rotate(90); });
        controlsToolbar.querySelector('.copy-single').addEventListener('click', () => copyCroppedImage(toolType));
        controlsToolbar.querySelector('.clear-tool').addEventListener('click', () => { if (confirm(`您確定要清除此${getToolName(toolType)}圖片嗎？`)) clearTool(); });
    }

    /**
     * === 最終、正確且經過驗證的裁切框尺寸設定邏輯 ===
     * Generates configuration for Cropper.js.
     * @param {string} toolType - 'front', 'back', or 'large'.
     * @returns {object} - The options object for Cropper.js.
     */
    function getCropperOptions(toolType) {
        return {
            // viewMode: 0 是關鍵，它允許圖片超出容器邊界
            viewMode: 0,
            dragMode: 'move', // 讓使用者可以移動圖片
            // 保持您原始的設定
            aspectRatio: toolType === 'large' ? 139 / 86.5 : 85.6 / 54,
            guides: true, autoCrop: true, movable: true, rotatable: true,
            scalable: true, zoomable: true,
            cropBoxMovable: false, cropBoxResizable: false,
            ready() {
                const cropper = cropperInstances[toolType];
                const containerData = cropper.getContainerData(); // 工作區容器尺寸
                const imageData = cropper.getImageData(); // 原始圖片尺寸
                
                // 1. 計算讓圖片「覆蓋」整個容器所需的縮放比例
                const coverRatio = Math.max(
                    containerData.width / imageData.naturalWidth,
                    containerData.height / imageData.naturalHeight
                );
                
                // 2. 將圖片縮放到該比例
                cropper.zoomTo(coverRatio);
                
                // 3. 我們想要的裁切框「視覺尺寸」
                const targetVisualWidth = toolType === 'large' ? 720 : 428;
                
                // 4. 確保目標寬度不超過容器寬度
                const finalCropBoxWidth = Math.min(targetVisualWidth, containerData.width);
                const finalCropBoxHeight = finalCropBoxWidth / cropper.options.aspectRatio;

                // 5. 設定裁切框，並在【容器】中置中
                cropper.setCropBoxData({
                    width: finalCropBoxWidth,
                    height: finalCropBoxHeight,
                    left: (containerData.width - finalCropBoxWidth) / 2,
                    top: (containerData.height - finalCropBoxHeight) / 2,
                });
            },
        };
    }
    
    function copyCroppedImage(toolType) {
        const cropper = cropperInstances[toolType];
        if (!cropper) return;
        if (!navigator.clipboard || !navigator.clipboard.write) {
            alert('抱歉，您的瀏覽器不支援此複製功能。');
            return;
        }
        // 保留原始的輸出尺寸設定
        const outputOptions = {
            width: toolType === 'large' ? 720 : 330,
            height: toolType === 'large' ? 448 : 200,
        };
        const canvas = cropper.getCroppedCanvas(outputOptions);
        canvas.toBlob((blob) => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => alert(`「${getToolName(toolType)}」的裁切結果已成功複製到剪貼簿！`))
                .catch(err => { console.error('複製失敗:', err); alert('複製失敗。'); });
        }, 'image/png');
    }

    function downloadAll() {
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        
        Object.keys(cropperInstances).forEach((toolType) => {
            const cropper = cropperInstances[toolType];
            const outputOptions = {
                width: toolType === 'large' ? 720 : 330,
                height: toolType === 'large' ? 448 : 200,
            };
            const imgSrc = cropper.getCroppedCanvas(outputOptions).toDataURL('image/jpeg');
            const link = document.createElement('a');
            link.href = imgSrc;
            link.download = `${timestamp}-${getToolName(toolType)}.jpg`;
            link.click();
        });
    }

    function updateGlobalDownloadButton() {
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        if (Object.keys(cropperInstances).length > 0) {
            downloadAllBtn.classList.remove('is-hidden');
        } else {
            downloadAllBtn.classList.add('is-hidden');
        }
    }
    
    function getToolName(toolType) {
        const names = { front: '正面', back: '背面', large: '存摺封面' };
        return names[toolType] || '';
    }
    
    function setupIcons() {
        document.querySelectorAll('.rotate-left').forEach(btn => btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"></path><polyline points="13 8 9 12 13 16"></polyline></svg>`);
        document.querySelectorAll('.rotate-right').forEach(btn => btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6"></path><polyline points="11 8 15 12 11 16"></polyline></svg>`);
        document.querySelectorAll('.copy-single').forEach(btn => btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`);
        document.querySelectorAll('.clear-tool').forEach(btn => btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`);
    }

    function main() {
        setupIcons();
        document.querySelectorAll('.widget-container').forEach(initializeTool);
        document.getElementById('downloadAllBtn').addEventListener('click', downloadAll);
    }

    main();
});