import { Toast } from '../utils/toast.js';

export class UploadZone {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.fileInput = document.getElementById('fileInput');
        this.store = store;

        this.init();
    }

    init() {
        if (!this.container) return;

        // Click to upload
        this.container.addEventListener('click', () => this.fileInput.click());

        // Drag and drop events
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.container.querySelector('.border-dashed').classList.add('dragover');
        });

        this.container.addEventListener('dragleave', () => {
            this.container.querySelector('.border-dashed').classList.remove('dragover');
        });

        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.container.querySelector('.border-dashed').classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
            this.fileInput.value = ''; // Reset
        });
    }

    async handleFiles(files) {
        // 立即转换为数组，避免 FileList 被清空影响
        const fileArray = Array.from(files);
        console.log('接收到的文件数量:', fileArray.length);
        console.log('文件列表:', fileArray.map(f => f.name));

        const processFile = async (file, index) => {
            console.log(`处理文件 ${index + 1}:`, file.name, file.type);

            // 检查文件是否为图片格式
            const isImageByMime = file.type.startsWith('image/');
            const isImageByExtension = /\.(jpe?g|png|gif|bmp|webp|tiff?|svg)$/i.test(file.name);

            if (!isImageByMime && !isImageByExtension) {
                Toast.error(`文件 ${file.name} 不是图片格式`);
                return null;
            }

            try {
                // 检查是否为 TIFF 格式（需要后端转换）
                const isTiff = /\.tiff?$/i.test(file.name);

                let dataUrl;
                if (isTiff) {
                    // TIFF 文件通过后端转换为 PNG
                    dataUrl = await this._convertTiffToPng(file);
                } else {
                    // 其他格式直接读取
                    dataUrl = await this._readFileAsDataUrl(file);
                }

                console.log(`成功读取文件 ${index + 1}:`, file.name);
                return {
                    id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                    file: file,
                    dataUrl: dataUrl,
                    edited: false
                };
            } catch (err) {
                console.error(`读取文件失败:`, file.name, err);
                Toast.error(`读取文件 ${file.name} 失败: ${err.message}`);
                return null;
            }
        };

        const results = await Promise.all(fileArray.map((file, index) => processFile(file, index)));
        const newImages = results.filter(img => img !== null);

        if (newImages.length > 0) {
            console.log('准备添加图片:', newImages.length, '张');
            console.log('图片 IDs:', newImages.map(img => img.id));
            this.store.addImages(newImages);
            console.log('Store 中的图片总数:', this.store.getState().images.length);
            Toast.success(`成功添加 ${newImages.length} 张图片`);
        }
    }

    _readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    async _convertTiffToPng(file) {
        try {
            Toast.info(`正在转换 TIFF 文件: ${file.name}`);

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/v1/convertTiffToPng', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`转换失败: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success || !result.dataUrl) {
                throw new Error(result.message || '转换失败');
            }

            Toast.success(`TIFF 文件已转换: ${file.name}`);
            return result.dataUrl;
        } catch (error) {
            console.error('TIFF 转换失败:', error);
            throw new Error(`TIFF 转换失败: ${error.message}`);
        }
    }
}
