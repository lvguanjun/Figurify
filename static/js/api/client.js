/**
 * RPC API Client for Figurify
 */
export class ApiClient {
    constructor(baseUrl = '/api/v1') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generate combined figure
     * @param {Array} images - Array of image objects from store
     * @param {Object} settings - Settings object from store
     */
    async generateFigure(images, settings) {
        const formData = new FormData();

        // 1. Prepare images (parallel)
        const processImage = async (img, i) => {
            let blob = await this._dataUrlToBlob(img.dataUrl);

            // Dynamic downscaling based on target baseHeight.
            // We use a 4x multiplier to ensure high-quality (300DPI ready) headroom
            // while still preventing upload of unnecessarily massive source pixels.
            const targetHeight = parseInt(settings.baseHeight) || 600;
            const maxSafeSide = targetHeight * 4;

            // Only downscale if it's significantly larger than needed
            if (blob.size > 2 * 1024 * 1024) { // > 2MB
                blob = await this._downscaleImage(img.dataUrl, maxSafeSide);
            }

            const filename = img.file ? img.file.name : `image_${i}.png`;
            return { blob, filename };
        };

        const results = await Promise.all(images.map((img, i) => processImage(img, i)));

        results.forEach(res => {
            formData.append('images', res.blob, res.filename);
        });

        // 2. Add settings
        formData.append('bg_color', settings.selectedBgColor || 'white');
        formData.append('max_cols', settings.maxCols);
        formData.append('base_height', settings.baseHeight);
        formData.append('padding', settings.padding);
        formData.append('font_size', settings.fontSize);
        formData.append('label_style', settings.labelStyle);

        return this._post('/generateFigure', formData);
    }

    /**
     * Utility: Downscale image using Canvas
     */
    async _downscaleImage(dataUrl, maxSide) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width <= maxSide && height <= maxSide) {
                    this._dataUrlToBlob(dataUrl).then(resolve);
                    return;
                }

                if (width > height) {
                    if (width > maxSide) {
                        height *= maxSide / width;
                        width = maxSide;
                    }
                } else {
                    if (height > maxSide) {
                        width *= maxSide / height;
                        height = maxSide;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png'); // Use lossless PNG for academic figure quality
            };
            img.src = dataUrl;
        });
    }

    /**
     * Helper to perform POST requests (RPC Style)
     */
    async _post(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            body: body
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || 'API request failed');
        }

        return response.json();
    }

    /**
     * Utility: Convert DataURL to Blob
     */
    async _dataUrlToBlob(dataUrl) {
        const res = await fetch(dataUrl);
        return res.blob();
    }
}
