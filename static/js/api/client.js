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

        // 1. Add images
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const blob = await this._dataUrlToBlob(img.dataUrl);
            const filename = img.file ? img.file.name : `image_${i}.png`;
            formData.append('images', blob, filename);
        }

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
