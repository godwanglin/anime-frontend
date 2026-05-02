import { browser } from '$app/environment';
import config from '$lib/config';
import { auth } from '$lib/stores/auth.svelte';

export type AppNotification = {
	id: number;
	category: string;
	type: string;
	title: string;
	message: string;
	link?: string | null;
	image?: string | null;
	isRead?: boolean;
	readAt?: string | null;
	createdAt: string;
};

export type NotificationPreference = {
	announcement: boolean;
	contentNew: boolean;
	contentUpdate: boolean;
	personalActivity: boolean;
	watchReminder: boolean;
	accountSystem: boolean;
	adminOperational: boolean;
	pushEnabled: boolean;
	inAppEnabled: boolean;
};

function randomId() {
	return crypto.randomUUID?.() ?? `device-${Math.random().toString(36).slice(2)}`;
}

function storageDeviceId() {
	if (!browser) return 'server-device';
	const existing = localStorage.getItem('push_device_id');
	if (existing) return existing;
	const next = randomId();
	localStorage.setItem('push_device_id', next);
	return next;
}

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

let initialized = $state(false);
let supported = $state(false);
let pushSupported = $state(false);
let permission = $state<NotificationPermission>('default');
let pushEnabled = $state(false);
let configuringPush = $state(false);
let panelOpen = $state(false);
let items = $state<AppNotification[]>([]);
let unreadCount = $state(0);
let loading = $state(false);
let pushConfig = $state<{ publicKey: string | null; enabled: boolean }>({
	publicKey: null,
	enabled: false
});
let preferences = $state<NotificationPreference | null>(null);
let pollTimer: ReturnType<typeof setInterval> | null = null;
let serviceWorkerRegistration = $state<ServiceWorkerRegistration | null>(null);

async function parseResponse<T>(response: Response) {
	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		throw new Error(payload?.message ?? 'Request gagal');
	}
	return payload as { data: T; meta?: Record<string, unknown> };
}

async function getPublicConfig() {
	const response = await fetch(`${config.API_BASE_URL}/api/notifications/push/public-config`);
	const payload = await parseResponse<{ publicKey: string | null; enabled: boolean }>(response);
	pushConfig = payload.data;
	return pushConfig;
}

async function registerServiceWorker() {
	if (!browser || !pushSupported) return null;
	serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
	return serviceWorkerRegistration;
}

async function subscribePush() {
	if (
		!browser ||
		!pushSupported ||
		!pushConfig.enabled ||
		!pushConfig.publicKey ||
		!serviceWorkerRegistration
	) {
		return null;
	}
	if (permission !== 'granted') return null;

	const existing = await serviceWorkerRegistration.pushManager.getSubscription();
	const subscription =
		existing ??
		(await serviceWorkerRegistration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
		}));

	const body = JSON.stringify({
		deviceId: storageDeviceId(),
		subscription: subscription.toJSON(),
		allowBroadcast: true,
		topics: {
			announcement: true,
			content_new: true,
			content_update: true,
			personal_activity: true,
			watch_reminder: true,
			account_security: true,
			account_system: true,
			admin_operational: true
		}
	});

	if (auth.accessToken) {
		await auth.authFetch('/api/notifications/push/subscribe', {
			method: 'POST',
			body
		});
	} else {
		await fetch(`${config.API_BASE_URL}/api/notifications/push/subscribe`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body
		});
	}

	pushEnabled = true;
	return subscription;
}

async function unsubscribePush() {
	if (!browser || !pushSupported || !serviceWorkerRegistration) {
		pushEnabled = false;
		return;
	}

	const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
	if (subscription) {
		await fetch(`${config.API_BASE_URL}/api/notifications/push/unsubscribe`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				deviceId: storageDeviceId(),
				endpoint: subscription.endpoint
			})
		}).catch(() => null);
		await subscription.unsubscribe().catch(() => null);
	}

	pushEnabled = false;
}

async function init() {
	if (!browser || initialized) return;
	initialized = true;
	supported = 'Notification' in window;
	pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
	permission = supported ? Notification.permission : 'denied';

	await getPublicConfig();
	if (pushSupported) await registerServiceWorker();
	if (permission === 'granted' && pushSupported) {
		await subscribePush().catch(() => null);
	}

	if (auth.accessToken) {
		await Promise.all([fetchNotifications(), fetchPreferences()]);
		startPolling();
	}
}

async function requestPermission() {
	if (!supported || configuringPush) return permission;
	configuringPush = true;
	try {
		permission = await Notification.requestPermission();
		if (permission === 'granted' && pushSupported) {
			await subscribePush();
		}
		return permission;
	} finally {
		configuringPush = false;
	}
}

async function fetchNotifications() {
	if (!auth.isLoggedIn) {
		items = [];
		unreadCount = 0;
		return;
	}

	loading = true;
	try {
		if (!auth.accessToken) await auth.refreshToken();
		const response = await auth.authFetch('/api/notifications?limit=20');
		const payload = await parseResponse<AppNotification[]>(response);
		items = payload.data;
		unreadCount = Number(payload.meta?.unreadCount ?? 0);
	} finally {
		loading = false;
	}
}

async function fetchPreferences() {
	if (!auth.isLoggedIn) {
		preferences = null;
		return null;
	}

	if (!auth.accessToken) await auth.refreshToken();
	const response = await auth.authFetch('/api/notifications/preferences');
	const payload = await parseResponse<NotificationPreference>(response);
	preferences = payload.data;
	return preferences;
}

async function markAsRead(id: number) {
	if (!auth.isLoggedIn) return;
	const response = await auth.authFetch('/api/notifications/read', {
		method: 'POST',
		body: JSON.stringify({ ids: [id] })
	});
	await parseResponse(response);
	items = items.map((item) =>
		item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
	);
	unreadCount = Math.max(0, unreadCount - 1);
}

async function markAllAsRead() {
	if (!auth.isLoggedIn) return;
	const response = await auth.authFetch('/api/notifications/read-all', {
		method: 'POST'
	});
	await parseResponse(response);
	items = items.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() }));
	unreadCount = 0;
}

async function updatePreferences(next: Partial<NotificationPreference>) {
	if (!auth.isLoggedIn) return;
	const response = await auth.authFetch('/api/notifications/preferences', {
		method: 'PUT',
		body: JSON.stringify(next)
	});
	const payload = await parseResponse<NotificationPreference>(response);
	preferences = payload.data;
}

function startPolling() {
	if (!browser || pollTimer) return;
	pollTimer = setInterval(() => {
		if (auth.isLoggedIn) {
			fetchNotifications().catch(() => null);
		}
	}, 20000);
}

function stopPolling() {
	if (!pollTimer) return;
	clearInterval(pollTimer);
	pollTimer = null;
}

function togglePanel(force?: boolean) {
	panelOpen = typeof force === 'boolean' ? force : !panelOpen;
	if (panelOpen && auth.isLoggedIn) {
		fetchNotifications().catch(() => null);
	}
}

export const notifications = {
	get initialized() {
		return initialized;
	},
	get supported() {
		return supported;
	},
	get pushSupported() {
		return pushSupported;
	},
	get permission() {
		return permission;
	},
	get pushEnabled() {
		return pushEnabled;
	},
	get configuringPush() {
		return configuringPush;
	},
	get panelOpen() {
		return panelOpen;
	},
	get items() {
		return items;
	},
	get unreadCount() {
		return unreadCount;
	},
	get loading() {
		return loading;
	},
	get preferences() {
		return preferences;
	},
	get pushConfig() {
		return pushConfig;
	},
	get deviceId() {
		return storageDeviceId();
	},
	init,
	requestPermission,
	fetchNotifications,
	fetchPreferences,
	markAsRead,
	markAllAsRead,
	updatePreferences,
	togglePanel,
	startPolling,
	stopPolling,
	subscribePush,
	unsubscribePush
};
