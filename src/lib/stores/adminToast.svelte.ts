type ToastType = 'success' | 'error' | 'info';

export type AdminToast = {
	id: number;
	type: ToastType;
	message: string;
};

let items = $state<AdminToast[]>([]);
let nextId = 1;

function push(message: string, type: ToastType = 'info') {
	const toast = { id: nextId++, type, message };
	items = [...items, toast];
	setTimeout(() => dismiss(toast.id), 3000);
}

function dismiss(id: number) {
	items = items.filter((item) => item.id !== id);
}

export const adminToast = {
	get items() {
		return items;
	},
	success(message: string) {
		push(message, 'success');
	},
	error(message: string) {
		push(message, 'error');
	},
	info(message: string) {
		push(message, 'info');
	},
	dismiss
};
