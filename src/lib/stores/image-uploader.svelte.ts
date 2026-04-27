let open = $state(false);

function openModal() {
	open = true;
}

function closeModal() {
	open = false;
}

function toggleModal(value = !open) {
	open = value;
}

export const imageUploader = {
	get isOpen() {
		return open;
	},
	open: openModal,
	close: closeModal,
	toggle: toggleModal
};
