/**
 * Simple state management for Figurify
 */
export class Store {
    constructor() {
        this.state = {
            images: [], // {id, file, dataUrl, edited}
            selectedBgColor: 'white',
            settings: {
                maxCols: 3,
                baseHeight: 600,
                padding: 50,
                fontSize: 45,
                labelStyle: 'number'
            },
            isGenerating: false,
            lastResult: null // {preview_url, download_url, filename}
        };
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notify();
    }

    /**
     * Update settings nested object
     */
    setSettings(updates) {
        this.state.settings = { ...this.state.settings, ...updates };
        this.notify();
    }

    /**
     * Add images to the list
     */
    addImages(newImages) {
        this.state.images = [...this.state.images, ...newImages];
        this.notify();
    }

    /**
     * Update images list (e.g. after reordering or deleting)
     */
    setImages(images) {
        this.state.images = [...images];
        this.notify();
    }

    /**
     * Update a single image's dataUrl (after editing)
     */
    updateImage(id, dataUrl) {
        this.state.images = this.state.images.map(img =>
            img.id === id ? { ...img, dataUrl, edited: true } : img
        );
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Initial notification
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}
