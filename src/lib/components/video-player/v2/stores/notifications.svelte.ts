export interface PlayerNotification {
	id: number;
	message: string;
}

export function createNotificationManager() {
	let notifications = $state<PlayerNotification[]>([]);
	let nextId = 1;
	const timers = new Map<number, ReturnType<typeof setTimeout>>();

	function show(message: string, duration = 2600) {
		const id = nextId++;
		notifications = [...notifications, { id, message }].slice(-3);
		timers.set(
			id,
			setTimeout(() => remove(id), duration)
		);
	}

	function remove(id: number) {
		const timer = timers.get(id);
		if (timer) clearTimeout(timer);
		timers.delete(id);
		notifications = notifications.filter((item) => item.id !== id);
	}

	function destroy() {
		timers.forEach((timer) => clearTimeout(timer));
		timers.clear();
		notifications = [];
	}

	return {
		show,
		remove,
		destroy,
		get notifications() {
			return notifications;
		}
	};
}
