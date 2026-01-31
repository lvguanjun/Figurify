/**
 * Figurify - Application Entry Point
 */
import { Store } from './state/store.js';
import { ApiClient } from './api/client.js';
import { UploadZone } from './components/UploadZone.js';
import { ImageList } from './components/ImageList.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { ImageEditor } from './components/ImageEditor.js';
import { Toast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Figurify Initializing...');

    try {
        // Initialize Core
        const store = new Store();
        const api = new ApiClient('/api/v1');

        // Initialize Components
        const uploadZone = new UploadZone('uploadZone', store);
        const imageList = new ImageList('imageList', store);
        const settingsPanel = new SettingsPanel('settingsPanel', store, api);
        const imageEditor = new ImageEditor('editModal', store);

        console.log('✅ Figurify Ready!');

        // Global error handling
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            Toast.error('发生错误: ' + (event.reason.message || '未知错误'));
        });

    } catch (error) {
        console.error('❌ Figurify Initialization Failed:', error);
        Toast.error('程序初始化失败，请刷新页面重试');
    }
});
