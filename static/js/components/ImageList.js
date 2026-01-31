import { Toast } from '../utils/toast.js';

export class ImageList {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.clearBtn = document.getElementById('clearAllBtn');
        this.store = store;

        this.init();
        this.store.subscribe((state) => this.render(state.images));
    }

    init() {
        if (!this.container) return;

        // Clear all button
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                const images = this.store.getState().images;
                if (images.length === 0) return;

                if (confirm('确定要清空所有图片吗？')) {
                    this.store.setImages([]);
                    Toast.info('已清空所有图片');
                }
            });
        }

        // Initialize SortableJS
        this.sortable = new Sortable(this.container, {
            animation: 150,
            ghostClass: 'dragging',
            onEnd: (evt) => {
                const images = [...this.store.getState().images];
                const [movedItem] = images.splice(evt.oldIndex, 1);
                images.splice(evt.newIndex, 0, movedItem);
                this.store.setImages(images);
            }
        });
    }

    render(images) {
        if (images.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-5 text-muted w-100">
                    <p>暂无图片，请上传</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = images.map((img, idx) => `
            <div class="image-item" data-id="${img.id}">
                <div class="order-badge">${idx + 1}</div>
                <div class="actions">
                    <button class="action-btn edit" data-action="edit" data-id="${img.id}" title="编辑">✏️</button>
                    <button class="action-btn delete" data-action="delete" data-id="${img.id}" title="删除">✕</button>
                </div>
                <img src="${img.dataUrl}" alt="图片">
                <div class="filename">${img.file?.name || '已编辑'}</div>
            </div>
        `).join('');

        // Re-attach event listeners for edit and delete
        this.container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                if (action === 'delete') {
                    this.deleteImage(id);
                } else if (action === 'edit') {
                    // Trigger edit modal (handled by ImageEditor.js via event or direct call)
                    window.dispatchEvent(new CustomEvent('edit-image', { detail: { id } }));
                }
            });
        });
    }

    deleteImage(id) {
        const images = this.store.getState().images.filter(img => img.id !== id);
        this.store.setImages(images);
    }
}
