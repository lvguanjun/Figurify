/**
 * Toast notification utility
 */
export class Toast {
    static show(message, type = 'info') {
        const toastEl = document.getElementById('appToast');
        if (!toastEl) return;

        const bodyEl = toastEl.querySelector('.toast-body');
        const headerEl = toastEl.querySelector('.toast-header');

        bodyEl.textContent = message;

        // Reset classes
        toastEl.className = 'toast';
        if (type === 'success') {
            toastEl.classList.add('text-white', 'bg-success');
            headerEl.classList.add('text-white', 'bg-success');
        } else if (type === 'error') {
            toastEl.classList.add('text-white', 'bg-danger');
            headerEl.classList.add('text-white', 'bg-danger');
        }

        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static info(message) {
        this.show(message, 'info');
    }
}
