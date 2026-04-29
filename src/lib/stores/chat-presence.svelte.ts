import { browser } from '$app/environment';
import { messageMentionsUser, openChatSocket, type ChatSocketEvent } from '$lib/chat';
import { auth } from '$lib/stores/auth.svelte';

let unreadCount = $state(0);
let mentionCount = $state(0);
let currentPath = $state('');
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let connecting = false;
const seenMessageIds = new Set<string>();
let mentionMessageIds = $state<string[]>([]);

function isAllowedRoute(pathname: string) {
	return (
		pathname === '/' ||
		pathname === '/popular' ||
		pathname === '/browse' ||
		pathname === '/profile' ||
		pathname.startsWith('/profile/')
	);
}

function clearReconnectTimer() {
	if (!reconnectTimer) return;
	clearTimeout(reconnectTimer);
	reconnectTimer = null;
}

function resetCounts() {
	unreadCount = 0;
	mentionCount = 0;
	seenMessageIds.clear();
	mentionMessageIds = [];
}

function isMentionForCurrentUser(message: {
	content?: string | null;
	replyTo?: { senderId?: string | null } | null;
}) {
	const currentUserId = auth.user?.id ? String(auth.user.id) : '';
	if (currentUserId && message.replyTo?.senderId === currentUserId) return true;
	return messageMentionsUser(message.content, auth.user?.username);
}

function disconnect() {
	clearReconnectTimer();
	socket?.close();
	socket = null;
	connecting = false;
	reconnectAttempt = 0;
}

function scheduleReconnect() {
	if (!browser || reconnectTimer || !isAllowedRoute(currentPath) || !auth.isLoggedIn) return;
	const delay = Math.min(1000 * 2 ** reconnectAttempt, 10_000);
	reconnectAttempt += 1;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		void connect();
	}, delay);
}

async function connect() {
	if (!browser || connecting || socket?.readyState === WebSocket.OPEN) return;
	if (!isAllowedRoute(currentPath) || !auth.isLoggedIn) {
		disconnect();
		return;
	}

	connecting = true;
	try {
		if (!auth.accessToken) await auth.refreshToken();
		socket = await openChatSocket();
		if (!socket) {
			connecting = false;
			scheduleReconnect();
			return;
		}
		const activeSocket = socket;
		activeSocket.addEventListener('open', () => {
			if (socket !== activeSocket) return;
			connecting = false;
			reconnectAttempt = 0;
		});
		activeSocket.addEventListener('message', (event) => {
			if (socket !== activeSocket) return;
			let payload: ChatSocketEvent;
			try {
				payload = JSON.parse(event.data) as ChatSocketEvent;
			} catch {
				return;
			}
			if (payload.event !== 'chat:message:new') return;
			if (seenMessageIds.has(payload.message.id)) return;
			seenMessageIds.add(payload.message.id);
			if (seenMessageIds.size > 200) {
				const [oldest] = seenMessageIds;
				if (oldest) seenMessageIds.delete(oldest);
			}
			if (payload.message.senderId === String(auth.user?.id ?? '')) return;
			unreadCount += 1;
			if (isMentionForCurrentUser(payload.message)) {
				mentionCount += 1;
				mentionMessageIds = [
					payload.message.id,
					...mentionMessageIds.filter((id) => id !== payload.message.id)
				].slice(0, 20);
			}
		});
		activeSocket.addEventListener('close', () => {
			if (socket !== activeSocket) return;
			socket = null;
			connecting = false;
			scheduleReconnect();
		});
		activeSocket.addEventListener('error', () => {
			if (socket !== activeSocket) return;
			connecting = false;
			scheduleReconnect();
		});
	} catch {
		connecting = false;
		scheduleReconnect();
	}
}

function setRoute(pathname: string) {
	currentPath = pathname;
	if (!isAllowedRoute(pathname)) {
		disconnect();
		if (pathname === '/chat') resetCounts();
		return;
	}
	void connect();
}

function markSeen() {
	resetCounts();
}

function consumeMentionIds() {
	const ids = mentionMessageIds;
	mentionMessageIds = [];
	return ids;
}

export const chatPresence = {
	get unreadCount() {
		return unreadCount;
	},
	get mentionCount() {
		return mentionCount;
	},
	get mentionMessageIds() {
		return mentionMessageIds;
	},
	setRoute,
	connect,
	disconnect,
	markSeen,
	consumeMentionIds
};
