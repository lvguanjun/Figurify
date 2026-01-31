import { Toast } from '../utils/toast.js';

export class ImageEditor {
    constructor(modalId, store) {
        this.modalEl = document.getElementById(modalId);
        this.store = store;

        this.canvas = null;
        this.mainImage = null; // Store reference to the main image object
        this.currentImageId = null;
        this.currentTool = 'brush';
        this.history = [];

        // Clone tool state
        this.cloneSource = null;
        this.cloneMarker = null;

        // For interactive drawing
        this.isDrawing = false;
        this.selectionRect = null;
        this.polygonPoints = [];
        this.activeLine = null;
        this.activeShape = null;
        this.tempLines = [];

        this.MASK_COLORS = {
            'white': 'rgb(255, 255, 255)',
            'light_gray': 'rgb(245, 245, 245)',
            'cream': 'rgb(255, 253, 248)',
            'light_blue': 'rgb(240, 248, 255)',
            'light_green': 'rgb(245, 255, 250)',
            'custom': '' // Will be set dynamically
        };

        this.init();
    }

    init() {
        if (!this.modalEl) return;

        // Color preview circle
        this.colorPreview = document.getElementById('currentColorPreview');

        // Listen for edit events from ImageList
        window.addEventListener('edit-image', (e) => {
            this.open(e.detail.id);
        });

        // Tool buttons
        this.modalEl.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Skip if button doesn't have data-tool (e.g., rotate buttons)
                if (!btn.dataset.tool) return;

                this.setTool(btn.dataset.tool);
                this.modalEl.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Action buttons
        document.getElementById('saveEditBtn').addEventListener('click', () => this.save());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Rotation buttons
        const rotateLeft = document.getElementById('rotateLeftBtn');
        const rotateRight = document.getElementById('rotateRightBtn');

        console.log('旋转按钮检测:', {
            leftBtn: rotateLeft,
            rightBtn: rotateRight,
            leftVisible: rotateLeft ? rotateLeft.offsetParent !== null : false,
            rightVisible: rotateRight ? rotateRight.offsetParent !== null : false
        });

        if (rotateLeft) {
            rotateLeft.addEventListener('click', () => this.rotateImage(-90));
        } else {
            console.error('找不到左转按钮 #rotateLeftBtn');
        }

        if (rotateRight) {
            rotateRight.addEventListener('click', () => this.rotateImage(90));
        } else {
            console.error('找不到右转按钮 #rotateRightBtn');
        }

        // Keyboard for clone tool
        window.addEventListener('keydown', (e) => {
            if (e.altKey && this.currentTool === 'clone') {
                this.canvas.defaultCursor = 'crosshair';
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.currentTool === 'clone') {
                this.canvas.defaultCursor = 'copy';
            }
        });

        // Brush settings
        const brushSlider = document.getElementById('brushSize');
        if (brushSlider) {
            brushSlider.addEventListener('input', () => {
                if (this.canvas && this.canvas.freeDrawingBrush) {
                    this.canvas.freeDrawingBrush.width = parseInt(brushSlider.value);
                }
            });
        }

        const colorSelect = document.getElementById('maskColor');
        if (colorSelect) {
            // Initialize with current store color if available
            const currentColor = this.store.getState().selectedBgColor;
            if (currentColor && this.MASK_COLORS[currentColor]) {
                colorSelect.value = currentColor;
            }

            colorSelect.addEventListener('change', () => {
                const newColor = colorSelect.value;
                let rgbColor = this.MASK_COLORS[newColor];

                // If switching away from custom, we keep the custom value in MASK_COLORS
                // but if we are at custom and it's empty, we might need a default
                if (newColor === 'custom' && !rgbColor) {
                    rgbColor = 'rgb(255, 255, 255)';
                }

                this.applyColor(rgbColor, newColor);
            });
        }
    }

    /**
     * Apply selected color to brush, canvas and all objects
     */
    applyColor(rgbColor, colorKey) {
        if (!this.canvas) return;

        // 1. Update brush color
        if (this.canvas.freeDrawingBrush) {
            this.canvas.freeDrawingBrush.color = rgbColor;
        }

        // 2. Update canvas background color
        this.canvas.setBackgroundColor(rgbColor, () => {
            this.canvas.renderAll();
        });

        // 3. Update all existing mask objects to the new background color
        this.canvas.getObjects().forEach(obj => {
            if (obj.type !== 'image' && !obj._isTemp) {
                if (obj.fill) obj.set({ fill: rgbColor });
                if (obj.stroke && obj.stroke !== '#007bff') obj.set({ stroke: rgbColor });
            }
        });

        // Update UI preview
        if (this.colorPreview) {
            this.colorPreview.style.backgroundColor = rgbColor;
        }

        this.canvas.renderAll();
        this.saveHistory();

        // Sync back to main background color
        // If it's custom, we store the RGB string, otherwise the key
        const storeValue = colorKey === 'custom' ? rgbColor : colorKey;
        this.store.setState({ selectedBgColor: storeValue });
    }

    async open(id) {
        this.currentImageId = id;
        const imgObj = this.store.getState().images.find(img => img.id === id);
        if (!imgObj) return;

        // Sync mask color with current global background color
        const colorSelect = document.getElementById('maskColor');
        const currentColor = this.store.getState().selectedBgColor;

        if (colorSelect && currentColor) {
            if (this.MASK_COLORS[currentColor]) {
                colorSelect.value = currentColor;
                const customOption = document.getElementById('customColorOption');
                if (currentColor !== 'custom' && customOption) customOption.classList.add('d-none');
            } else if (currentColor.startsWith('rgb')) {
                // It's a custom color
                this.MASK_COLORS['custom'] = currentColor;
                colorSelect.value = 'custom';
                const customOption = document.getElementById('customColorOption');
                if (customOption) customOption.classList.remove('d-none');
            }
        }

        // Update preview
        if (this.colorPreview) {
            const currentRgb = this.MASK_COLORS[colorSelect.value] || 'rgb(255, 255, 255)';
            this.colorPreview.style.backgroundColor = currentRgb;
        }

        const bsModal = new bootstrap.Modal(this.modalEl);
        bsModal.show();

        // Initialize Fabric Canvas after modal is shown to get correct dimensions
        this.modalEl.addEventListener('shown.bs.modal', () => {
            this.initCanvas(imgObj.dataUrl);
        }, { once: true });
    }

    initCanvas(dataUrl) {
        if (this.canvas) {
            this.canvas.dispose();
        }

        const colorKey = document.getElementById('maskColor').value;
        const initialBgColor = this.MASK_COLORS[colorKey] || 'rgb(255, 255, 255)';

        this.canvas = new fabric.Canvas('editorCanvas', {
            isDrawingMode: true,
            selection: false,
            backgroundColor: initialBgColor
        });

        // Set initial brush
        this.setTool('brush');

        fabric.Image.fromURL(dataUrl, (img) => {
            // Scale image to fit screen
            const maxWidth = window.innerWidth * 0.8;
            const maxHeight = window.innerHeight * 0.7;
            let scale = 1;

            if (img.width > maxWidth || img.height > maxHeight) {
                scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            }

            img.set({
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: true // Must be true to capture clicks for bg-remove
            });

            // Ensure the image uses a canvas element for persistent cloning
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img._element, 0, 0);
            img._element = tempCanvas;

            this.mainImage = img;
            this.canvas.setWidth(img.width * scale);
            this.canvas.setHeight(img.height * scale);
            this.canvas.add(img);
            this.canvas.centerObject(img);
            this.canvas.sendToBack(img);
            this.canvas.renderAll();

            this.saveHistory();
        });

        // Event Listeners for interactive tools
        this.canvas.on('mouse:down', (o) => this.onMouseDown(o));
        this.canvas.on('mouse:move', (o) => this.onMouseMove(o));
        this.canvas.on('mouse:up', (o) => this.onMouseUp(o));
        this.canvas.on('mouse:dblclick', () => this.onMouseDblClick());

        // Fabric event: object added
        this.canvas.on('object:added', (e) => {
            if (e.target && e.target._isTemp) return;
            if (!this._isUndoing) this.saveHistory();
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        if (!this.canvas) return;

        // Reset drawing states
        this.isDrawing = false;
        this.polygonPoints = [];
        this.clearTempObjects();

        this.canvas.isDrawingMode = (tool === 'brush');
        this.canvas.selection = (tool === 'eraser'); // Allow selection only in eraser mode

        if (tool === 'brush') {
            const color = this.MASK_COLORS[document.getElementById('maskColor').value];
            const width = parseInt(document.getElementById('brushSize').value);
            this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
            this.canvas.freeDrawingBrush.color = color;
            this.canvas.freeDrawingBrush.width = width;
        } else if (tool === 'eraser') {
            this.canvas.isDrawingMode = false;
            Toast.info('在橡皮擦模式下，点击遮罩对象可将其删除');
        } else if (tool === 'polygon') {
            Toast.info('点击添加顶点，双击或点击起点完成闭合');
        } else if (tool === 'rect') {
            Toast.info('在画布上拖拽以绘制矩形遮罩');
        } else if (tool === 'bg-remove') {
            this.canvas.isDrawingMode = false;
            this.canvas.defaultCursor = 'crosshair';
            Toast.info('🪄 换底模式：点击图片上的背景颜色区域即可将其剔除');
        } else if (tool === 'picker') {
            this.canvas.isDrawingMode = false;
            this.canvas.defaultCursor = 'copy'; // More appropriate for picking
            Toast.info('🎨 取色模式：点击图片任意位置提取颜色作为背景');
        } else if (tool === 'clone') {
            this.canvas.isDrawingMode = false;
            this.canvas.defaultCursor = 'copy';
            Toast.info('📋 仿制图章：按住 Alt 键点击图片设置采样起点，然后涂抹');
        } else {
            this.canvas.defaultCursor = 'default';
        }
    }

    clearTempObjects() {
        if (this.selectionRect) {
            this.canvas.remove(this.selectionRect);
            this.selectionRect = null;
        }
        if (this.activeLine) {
            this.canvas.remove(this.activeLine);
            this.activeLine = null;
        }
        this.tempLines.forEach(line => this.canvas.remove(line));
        this.tempLines = [];
        this.canvas.renderAll();
    }

    handleBgRemove(o) {
        if (!this.mainImage) return;

        const color = this.getPixelColor(o);
        if (!color) return;

        const filter = new fabric.Image.filters.RemoveColor({
            color: color,
            distance: 0.15
        });

        this.mainImage.filters = [filter];
        this.mainImage.applyFilters();
        this.canvas.renderAll();
        this.saveHistory();
        Toast.success('已剔除背景色，当前底色已生效');
    }

    handleColorPicker(o) {
        const color = this.getPixelColor(o);
        if (!color) return;

        // Update custom color
        this.MASK_COLORS['custom'] = color;

        // Show custom option and select it
        const colorSelect = document.getElementById('maskColor');
        const customOption = document.getElementById('customColorOption');
        if (customOption) {
            customOption.classList.remove('d-none');
            colorSelect.value = 'custom';
        }

        // Apply color
        this.applyColor(color, 'custom');

        Toast.success(`已提取颜色: ${color}`);

        // Switch back to brush for convenience
        this.setTool('brush');
        const brushBtn = this.modalEl.querySelector('[data-tool="brush"]');
        if (brushBtn) {
            this.modalEl.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            brushBtn.classList.add('active');
        }
    }

    handleClone(o) {
        const pointer = this.canvas.getPointer(o.e);

        // 1. Set source point if Alt is pressed
        if (o.e.altKey) {
            this.cloneSource = { x: pointer.x, y: pointer.y };

            // Show a temporary marker for source
            if (this.cloneMarker) this.canvas.remove(this.cloneMarker);
            this.cloneMarker = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 10,
                fill: 'transparent',
                stroke: '#ff0000',
                strokeWidth: 2,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                _isTemp: true
            });
            this.canvas.add(this.cloneMarker);
            this.canvas.renderAll();

            Toast.success('采样点已设置');
            return;
        }

        // 2. Start cloning if source exists
        if (!this.cloneSource) {
            Toast.warning('请先按住 Alt 键点击图片设置采样起点');
            return;
        }

        this.isDrawing = true;
        this.lastPointer = pointer;
    }

    getPixelColor(o) {
        const pointer = this.canvas.getPointer(o.e);
        const ctx = this.canvas.getContext();

        // 5x5 Area Sampling to get average color (reduces noise impact)
        const size = 2; // 2 pixels each side = 5x5 area
        const x = Math.round(pointer.x);
        const y = Math.round(pointer.y);

        try {
            const imageData = ctx.getImageData(x - size, y - size, size * 2 + 1, size * 2 + 1).data;
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < imageData.length; i += 4) {
                if (imageData[i + 3] > 0) { // Only count non-transparent pixels
                    r += imageData[i];
                    g += imageData[i + 1];
                    b += imageData[i + 2];
                    count++;
                }
            }

            if (count === 0) return 'rgb(255, 255, 255)';

            return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
        } catch (e) {
            // Fallback to single pixel if out of bounds
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            return `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
        }
    }

    onMouseDown(o) {
        if (this.currentTool === 'eraser') {
            if (o.target && o.target.type !== 'image') {
                this.canvas.remove(o.target);
            }
            return;
        }

        if (this.currentTool === 'bg-remove') {
            this.handleBgRemove(o);
            return;
        }

        if (this.currentTool === 'picker') {
            this.handleColorPicker(o);
            return;
        }

        if (this.currentTool === 'clone') {
            this.handleClone(o);
            return;
        }

        const pointer = this.canvas.getPointer(o.e);

        if (this.currentTool === 'rect') {
            this.isDrawing = true;
            this.startX = pointer.x;
            this.startY = pointer.y;
            this.selectionRect = new fabric.Rect({
                left: this.startX,
                top: this.startY,
                width: 0,
                height: 0,
                fill: 'transparent',
                stroke: '#007bff',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                _isTemp: true
            });
            this.canvas.add(this.selectionRect);
        } else if (this.currentTool === 'polygon') {
            this.isDrawing = true;

            // Check if clicking near the starting point to close
            if (this.polygonPoints.length > 2) {
                const startPoint = this.polygonPoints[0];
                const dist = Math.sqrt(Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2));
                if (dist < 10) {
                    this.finishPolygon();
                    return;
                }
            }

            this.polygonPoints.push({ x: pointer.x, y: pointer.y });

            if (this.polygonPoints.length > 1) {
                const prevPoint = this.polygonPoints[this.polygonPoints.length - 2];
                const line = new fabric.Line([prevPoint.x, prevPoint.y, pointer.x, pointer.y], {
                    stroke: '#007bff',
                    strokeWidth: 2,
                    selectable: false,
                    evented: false,
                    _isTemp: true
                });
                this.tempLines.push(line);
                this.canvas.add(line);
            }

            // Create dynamic line for next point
            if (this.activeLine) this.canvas.remove(this.activeLine);
            this.activeLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: '#007bff',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false,
                _isTemp: true
            });
            this.canvas.add(this.activeLine);
        }
    }

    onMouseMove(o) {
        if (!this.isDrawing) return;
        const pointer = this.canvas.getPointer(o.e);

        if (this.currentTool === 'clone' && this.cloneSource) {
            this.performClone(pointer);
            return;
        }

        if (this.currentTool === 'rect') {
            if (this.startX > pointer.x) {
                this.selectionRect.set({ left: pointer.x });
            }
            if (this.startY > pointer.y) {
                this.selectionRect.set({ top: pointer.y });
            }
            this.selectionRect.set({
                width: Math.abs(this.startX - pointer.x),
                height: Math.abs(this.startY - pointer.y)
            });
            this.canvas.renderAll();
        } else if (this.currentTool === 'polygon' && this.activeLine) {
            this.activeLine.set({ x2: pointer.x, y2: pointer.y });
            this.canvas.renderAll();
        }
    }

    performClone(pointer) {
        if (!this.cloneSource || !this.mainImage) return;

        // Calculate movement offset since last call
        const offsetX = pointer.x - this.lastPointer.x;
        const offsetY = pointer.y - this.lastPointer.y;

        // Move source relative to brush movement
        this.cloneSource.x += offsetX;
        this.cloneSource.y += offsetY;
        this.lastPointer = pointer;

        // Update marker position
        if (this.cloneMarker) {
            this.cloneMarker.set({ left: this.cloneSource.x, top: this.cloneSource.y });
        }

        const brushSize = parseInt(document.getElementById('brushSize').value);
        const s = this.mainImage.scaleX;
        const imgElement = this.mainImage._element; // This is now a canvas element

        // Get native context of the image's underlying canvas
        const imgCtx = imgElement.getContext('2d');

        // We need to map canvas coordinates back to image internal coordinates
        // Image is centered in the fabric canvas
        const imgLeft = this.mainImage.left - (this.mainImage.width * s / 2);
        const imgTop = this.mainImage.top - (this.mainImage.height * s / 2);

        // Position on image internal coordinate system (unscaled)
        const targetX = (pointer.x - imgLeft) / s;
        const targetY = (pointer.y - imgTop) / s;
        const sourceX = (this.cloneSource.x - imgLeft) / s;
        const sourceY = (this.cloneSource.y - imgTop) / s;

        imgCtx.save();
        // Create circular path for brush on image canvas
        imgCtx.beginPath();
        imgCtx.arc(targetX, targetY, (brushSize / 2) / s, 0, Math.PI * 2);
        imgCtx.clip();

        // Draw source part of image onto target part
        // dx, dy is the relative offset between target and source
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        // Correctly draw the source pixels into the target location
        // We draw the image element shifted by the offset
        imgCtx.drawImage(imgElement, -dx, -dy);

        imgCtx.restore();

        // Notify fabric that the element has changed
        this.mainImage.dirty = true;
        this.canvas.renderAll();
    }

    onMouseUp() {
        if (this.currentTool === 'clone') {
            this.isDrawing = false;
            this.saveHistory();
            return;
        }

        if (this.currentTool === 'rect' && this.isDrawing) {
            this.isDrawing = false;
            const color = this.MASK_COLORS[document.getElementById('maskColor').value];

            // Create the final mask rectangle
            const finalRect = new fabric.Rect({
                left: this.selectionRect.left,
                top: this.selectionRect.top,
                width: this.selectionRect.width,
                height: this.selectionRect.height,
                fill: color,
                selectable: true,
                evented: true,
                transparentCorners: false
            });

            this.canvas.remove(this.selectionRect);
            this.selectionRect = null;

            if (finalRect.width > 2 && finalRect.height > 2) {
                this.canvas.add(finalRect);
                this.canvas.setActiveObject(finalRect);
            }
            this.canvas.renderAll();
        }
    }

    onMouseDblClick() {
        if (this.currentTool === 'polygon' && this.polygonPoints.length > 2) {
            this.finishPolygon();
        }
    }

    finishPolygon() {
        const color = this.MASK_COLORS[document.getElementById('maskColor').value];

        const polygon = new fabric.Polygon(this.polygonPoints, {
            fill: color,
            selectable: true,
            evented: true,
            transparentCorners: false
        });

        this.clearTempObjects();
        this.polygonPoints = [];
        this.isDrawing = false;

        this.canvas.add(polygon);
        this.canvas.setActiveObject(polygon);
        this.canvas.renderAll();
    }

    saveHistory() {
        const json = this.canvas.toJSON();
        this.history.push(json);
        if (this.history.length > 20) this.history.shift();
    }

    undo() {
        if (this.history.length <= 1) return;

        this._isUndoing = true;
        this.history.pop(); // Current state
        const prevState = this.history[this.history.length - 1];

        this.canvas.loadFromJSON(prevState, () => {
            this.canvas.renderAll();
            this._isUndoing = false;
        });
    }

    reset() {
        if (confirm('确定要重置所有修改吗？')) {
            const imgObj = this.store.getState().images.find(img => img.id === this.currentImageId);
            if (imgObj) {
                this.initCanvas(imgObj.dataUrl);
            }
        }
    }

    rotateImage(degrees) {
        if (!this.canvas || !this.mainImage) return;

        // Get current rotation angle (default to 0 if not set)
        const currentAngle = this.mainImage.angle || 0;
        const newAngle = (currentAngle + degrees) % 360;

        // Set the new angle
        this.mainImage.set({ angle: newAngle });

        // Recalculate canvas dimensions based on rotation
        const rotatedWidth = Math.abs(this.mainImage.width * this.mainImage.scaleX * Math.cos(newAngle * Math.PI / 180)) +
                            Math.abs(this.mainImage.height * this.mainImage.scaleY * Math.sin(newAngle * Math.PI / 180));
        const rotatedHeight = Math.abs(this.mainImage.width * this.mainImage.scaleX * Math.sin(newAngle * Math.PI / 180)) +
                             Math.abs(this.mainImage.height * this.mainImage.scaleY * Math.cos(newAngle * Math.PI / 180));

        this.canvas.setWidth(rotatedWidth);
        this.canvas.setHeight(rotatedHeight);

        // Center the rotated image
        this.canvas.centerObject(this.mainImage);
        this.canvas.renderAll();
        this.saveHistory();

        Toast.success(`已旋转 ${degrees > 0 ? '顺时针' : '逆时针'} ${Math.abs(degrees)}度`);
    }

    save() {
        if (!this.canvas) return;

        // Deselect objects before export
        this.canvas.discardActiveObject();
        this.canvas.renderAll();

        const dataUrl = this.canvas.toDataURL({
            format: 'png',
            quality: 1
        });

        this.store.updateImage(this.currentImageId, dataUrl);
        Toast.success('修改已保存');

        // Close modal
        const modal = bootstrap.Modal.getInstance(this.modalEl);
        modal.hide();
    }
}
