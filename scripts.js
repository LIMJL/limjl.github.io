document.addEventListener('DOMContentLoaded', (event) => {
  let tools = ['front', 'back', 'large'];
  let downloadBtn = document.querySelector('.download');
  let cropperInstances = {};

  tools.forEach((tool) => {
    let result = document.querySelector(`.result-${tool}`);
    let imgResult = document.querySelector(`.img-result-${tool}`);
    let cropped = imgResult.querySelector('.cropped');
    let upload = document.getElementById(`file-input-${tool}`);
    let dropZone = document.getElementById(`drop-zone-${tool}`);
    let rotateBtns = document.querySelector(`.rotate-btns-${tool}`);
    let rotate = rotateBtns.querySelector('.rotate');
    let cropper = '';

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target.result) {
          let img = document.createElement('img');
          img.src = e.target.result;
          result.innerHTML = '';
          result.appendChild(img);
          rotateBtns.classList.remove('hide');
          dropZone.classList.add('hide');
          if (cropper) {
            cropper.destroy();
          }
          cropper = new Cropper(img, {
            aspectRatio: tool === 'large' ? 139 / 86.5 : 85.6 / 54,
            viewMode: 1,
            guides: true,
            autoCrop: true,
            dragMode: 'move',
            movable: true,
            rotatable: true,
            scalable: true,
            zoomable: true,
            cropBoxMovable: false,
            cropBoxResizable: false,
            ready() {
              cropper.setCropBoxData({
                width: tool === 'large' ? 720 : 428,
                height: tool === 'large' ? 448 : 270,
              });
            },
          });
          cropperInstances[tool] = cropper;
          downloadBtn.classList.remove('hide');
        }
      };
      reader.onerror = () => {
        alert('文件讀取錯誤');
      };
      reader.readAsDataURL(file);
    }

    upload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const fileType = file.type.split('/')[0];
      if (file && fileType === 'image') {
        handleFile(file);
      } else {
        alert('請選擇圖片檔案');
      }
    });

    dropZone.addEventListener('click', () => {
      upload.click();
    });

    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      const fileType = file.type.split('/')[0];
      if (file && fileType === 'image') {
        handleFile(file);
      } else {
        alert('請選擇圖片檔案');
      }
    });

    rotate.addEventListener('click', (e) => {
      e.preventDefault();
      if (cropper) {
        cropper.rotate(90);
      }
    });
  });

  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    let now = new Date();
    let formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    tools.forEach((tool) => {
      if (cropperInstances[tool]) {
        let imgSrc = cropperInstances[tool].getCroppedCanvas({
          width: tool === 'large' ? 720 : 330,
          height: tool === 'large' ? 448 : 200
        }).toDataURL('image/jpeg');
        let link = document.createElement('a');
        link.href = imgSrc;
        link.download = `${formattedDate}-${tool === 'front' ? '身份證正面' : tool === 'back' ? '身份證背面' : '存摺封面'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  });
});