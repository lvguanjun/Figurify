import { Toast } from '../utils/toast.js';

export class SettingsPanel {
    constructor(containerId, store, api) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.api = api;

        // UI Elements
        this.generateBtn = document.getElementById('generateBtn');
        this.previewContainer = document.getElementById('previewContainer');
        this.previewImage = document.getElementById('previewImage');
        this.downloadLink = document.getElementById('downloadLink');
        this.loadingIndicator = document.getElementById('loadingIndicator');

        this.init();
        this.store.subscribe((state) => this.updateUI(state));
    }

    init() {
        // Color swatches
        this.container.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                // For custom swatch, we use the background color directly
                const colorValue = swatch.id === 'customColorSwatch' ? swatch.style.backgroundColor : swatch.dataset.color;
                this.store.setState({ selectedBgColor: colorValue });
            });
        });

        // Numerical settings
        ['maxCols', 'baseHeight', 'padding', 'fontSize'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => {
                    this.store.setSettings({ [id]: parseInt(input.value) });
                });
            }
        });

        // Label style
        const labelStyle = document.getElementById('labelStyle');
        if (labelStyle) {
            labelStyle.addEventListener('change', () => {
                this.store.setSettings({ labelStyle: labelStyle.value });
            });
        }

        // Generate button
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.generateImage());
        }
    }

    updateUI(state) {
        // Update color swatch selection
        this.container.querySelectorAll('.color-swatch').forEach(swatch => {
            const isSelected = swatch.dataset.color === state.selectedBgColor;
            swatch.classList.toggle('selected', isSelected);
        });

        // Custom color swatch handling
        const customSwatch = document.getElementById('customColorSwatch');
        if (customSwatch) {
            if (state.selectedBgColor.startsWith('rgb')) {
                customSwatch.style.backgroundColor = state.selectedBgColor;
                customSwatch.classList.remove('d-none');
                customSwatch.classList.add('selected');
                customSwatch.dataset.color = state.selectedBgColor;
            } else if (state.selectedBgColor === 'custom') {
                // If the key is 'custom', we need to check if we have the color stored elsewhere
                // But normally we store the RGB string directly in selectedBgColor now
                customSwatch.classList.remove('d-none');
            } else {
                // Don't hide it if it was already there, just unselect
                customSwatch.classList.remove('selected');
            }
        }

        // Enable/disable generate button
        if (this.generateBtn) {
            this.generateBtn.disabled = state.images.length === 0 || state.isGenerating;
        }

        // Show/hide loading and preview
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.toggle('d-none', !state.isGenerating);
        }

        if (state.lastResult && !state.isGenerating) {
            this.previewContainer.classList.remove('d-none');
            this.previewImage.src = state.lastResult.preview_url + '&t=' + Date.now();
            this.downloadLink.href = state.lastResult.download_url;
        } else {
            this.previewContainer.classList.add('d-none');
        }
    }

    async generateImage() {
        const state = this.store.getState();
        if (state.images.length === 0) return;

        this.store.setState({ isGenerating: true });

        try {
            const result = await this.api.generateFigure(state.images, {
                ...state.settings,
                selectedBgColor: state.selectedBgColor
            });

            this.store.setState({
                lastResult: result,
                isGenerating: false
            });

            Toast.success('图片拼接生成成功！');
            // Scroll to preview
            this.previewContainer.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error(err);
            this.store.setState({ isGenerating: false });
            Toast.error('生成失败: ' + err.message);
        }
    }
}
