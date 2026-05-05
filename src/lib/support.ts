import { auth } from '$lib/stores/auth.svelte';
import config from '$lib/config';

export type SupportConversationStatus = 'ai_active' | 'needs_human' | 'human_active' | 'resolved';
export type SupportConversationPriority = 'normal' | 'high' | 'urgent';
export type SupportMessageSenderType = 'user' | 'ai' | 'admin' | 'system';
export type SupportMessageSource = 'app' | 'telegram' | 'ai';

export type SupportConversationMeta = {
	id: string;
	userId: number;
	status: SupportConversationStatus;
	priority: SupportConversationPriority;
	assignedAdminId: number | null;
	lastMessageAt: number | null;
	unreadUser: number;
	unreadAdmin: number;
	createdAt: number;
	updatedAt: number;
};

export type SupportMessage = {
	id: string;
	conversationId: string;
	senderType: SupportMessageSenderType;
	senderUserId: number | null;
	senderDisplay: { username: string; name: string; role: 'user' | 'admin' | 'ai' | 'system' };
	content: string;
	source: SupportMessageSource;
	actions?: Array<{ type: 'handoff'; label: string }>;
	createdAt: number;
};

export type SupportConversationEnvelope = {
	meta: SupportConversationMeta;
	messages: SupportMessage[];
	serverTime: number;
	nextCursor: string | null;
};

function supportWsUrl(token: string) {
	const base = config.API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
	return `${base}/api/support/ws?token=${encodeURIComponent(token)}`;
}

export async function ensureSupportConversation() {
	const response = await auth.authFetch('/api/support/conversations', { method: 'POST', body: JSON.stringify({}) });
	return auth.parseApi<{ conversationId: string; meta: SupportConversationMeta }>(response);
}

export async function openSupportSocket() {
	if (!auth.accessToken) await auth.refreshToken();
	if (!auth.accessToken) return null;
	return new WebSocket(supportWsUrl(auth.accessToken));
}

export async function fetchSupportConversationMe(limit = 60, after?: number) {
	const params = new URLSearchParams({ limit: String(limit) });
	if (Number.isFinite(after)) params.set('after', String(after));
	const response = await auth.authFetch(`/api/support/conversations/me?${params.toString()}`);
	return auth.parseApi<SupportConversationEnvelope>(response);
}

export async function sendSupportMessage(conversationId: string, content: string) {
	const response = await auth.authFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/messages`, {
		method: 'POST',
		body: JSON.stringify({ content })
	});
	return auth.parseApi<{
		meta: SupportConversationMeta;
		message: SupportMessage;
		aiReplies: Array<{ messageId: string; content: string; handoff: boolean }>;
	}>(response);
}

export async function requestSupportHandoff(conversationId: string) {
	const response = await auth.authFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/handoff`, {
		method: 'PATCH',
		body: JSON.stringify({})
	});
	return auth.parseApi<SupportConversationMeta>(response);
}

export async function resolveSupportConversation(conversationId: string) {
	const response = await auth.authFetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/resolve`, {
		method: 'PATCH',
		body: JSON.stringify({})
	});
	return auth.parseApi<SupportConversationMeta>(response);
}
