import config from '$lib/config';
import type { EquippedFrame, EquippedNameTag } from '$lib/decorations';
import { auth, type PublicUser } from '$lib/stores/auth.svelte';

export type ChatApiMessage = {
	id: string;
	roomId: string;
	senderId: string;
	sender?: {
		id: string;
		name: string;
		username?: string;
		fullName?: string | null;
		avatar: string | null;
		isVerified: boolean;
		verifiedAt: string | null;
		level?: number;
		nageTag: EquippedNameTag;
		frame: EquippedFrame;
		role: string | null;
	};
	senderName: string;
	senderUsername?: string;
	senderFullName?: string | null;
	senderLevel?: number;
	senderAvatar: string | null;
	senderNageTag: EquippedNameTag;
	senderFrame: EquippedFrame;
	content: string;
	context: ChatContextItem | null;
	contexts?: ChatContextItem[];
	links?: ChatAllowedLink[];
	replyTo?: ChatReplyPreview | null;
	type: 'text' | 'system';
	editedAt?: number | null;
	deletedAt?: number | null;
	deletedBy?: string | null;
	deletedByRole?: string | null;
	createdAt: number;
	expiresAt: number;
};

export type ChatContextType = 'anime' | 'episode';

export type ChatContextItem = {
	type: ChatContextType;
	id: string;
	title: string;
	animeTitle: string | null;
	thumbnail: string | null;
	description: string | null;
	slug: string;
	animeSlug: string | null;
	url: string;
};

export type ChatAllowedLink = {
	url: string;
	rawText: string;
	host: string;
	path: string;
	preview: ChatContextItem | null;
};

export type ChatReplyPreview = {
	id: string;
	senderId: string;
	senderName: string;
	senderUsername?: string;
	senderFullName?: string | null;
	content: string;
	deletedAt: number | null;
};

export type ChatMentionUser = Pick<PublicUser, 'id' | 'username' | 'fullName' | 'avatar' | 'isVerified'>;

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function messageMentionsUser(content: string | null | undefined, username: string | null | undefined) {
	const text = content?.trim();
	const name = username?.trim();
	if (!text || !name) return false;
	const aliases = new Set<string>();
	aliases.add(name);
	aliases.add(name.replace(/\s+/g, ''));
	aliases.add(name.replace(/\s+/g, '_'));
	const firstName = name.split(/\s+/)[0];
	if (firstName && firstName.length >= 3) aliases.add(firstName);

	for (const alias of aliases) {
		if (!alias) continue;
		const pattern = escapeRegExp(alias).replace(/\\\s\+/g, '\\s+');
		if (new RegExp(`(^|[^\\p{L}\\p{N}_])@${pattern}(?=$|[^\\p{L}\\p{N}_])`, 'iu').test(text)) {
			return true;
		}
	}
	return false;
}

type SavedAnimeItem = {
	animeId: number;
	animeSlug: string;
	animeTitle: string;
	animeThumbnail: string | null;
	animeStatus?: string | null;
};

type WatchHistoryItem = {
	animeId: number;
	animeSlug: string;
	animeTitle: string;
	animeThumbnail: string | null;
	episodeId: number;
	episodeSlug: string;
	episodeNumber: number;
	episodeTitle: string;
	progressPct?: number;
};

export type ChatMessagesResponse = {
	roomId: string;
	messages: ChatApiMessage[];
	nextCursor: string | null;
	serverTime: number;
	slowmode?: {
		enabled: boolean;
		seconds: number;
		remainingSeconds: number;
	};
};

export type ChatSocketEvent =
	| { event: 'chat:message:new'; roomId: string; message: ChatApiMessage }
	| { event: 'chat:message:update'; roomId: string; message: ChatApiMessage }
	| { event: 'chat:message:error'; code: string; message: string }
	| {
			event: 'chat:slowmode:error';
			code: string;
			message: string;
			remainingSeconds: number;
	  }
	| {
			event: 'chat:typing:update';
			roomId: string;
			userId: string;
			username: string;
			typing: boolean;
	  };

function chatWsUrl(token: string) {
	const base = config.API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
	return `${base}/api/chat/ws?token=${encodeURIComponent(token)}`;
}

export async function ensureChatToken() {
	if (auth.accessToken) return auth.accessToken;
	return auth.refreshToken();
}

export async function fetchChatMessages(limit = 150) {
	const response = await auth.authFetch(`/api/chat/messages?limit=${limit}`);
	return auth.parseApi<ChatMessagesResponse>(response);
}

export async function pollChatMessages(after: number, limit = 150) {
	const params = new URLSearchParams({
		after: String(after),
		limit: String(limit)
	});
	const response = await auth.authFetch(`/api/chat/messages/poll?${params.toString()}`);
	return auth.parseApi<ChatMessagesResponse>(response);
}

export async function searchChatContexts(
	q: string,
	type: ChatContextType | 'all' = 'all',
	limit = 12
) {
	const params = new URLSearchParams({
		q,
		type,
		limit: String(limit)
	});
	const response = await auth.authFetch(`/api/chat/context/search?${params.toString()}`);
	return auth.parseApi<ChatContextItem[]>(response);
}

export async function fetchSavedChatContexts(limit = 20) {
	const response = await auth.authFetch(`/api/saved?page=1&limit=${limit}`);
	const items = await auth.parseApi<SavedAnimeItem[]>(response);
	return items.map(
		(item): ChatContextItem => ({
			type: 'anime',
			id: String(item.animeId),
			title: item.animeTitle,
			animeTitle: null,
			thumbnail: item.animeThumbnail,
			description: item.animeStatus ? `Status: ${item.animeStatus}` : 'Anime tersimpan',
			slug: item.animeSlug,
			animeSlug: null,
			url: `/anime/${item.animeSlug}`
		})
	);
}

export async function fetchHistoryChatContexts(limit = 20) {
	const response = await auth.authFetch(`/api/history?page=1&limit=${limit}`);
	const items = await auth.parseApi<WatchHistoryItem[]>(response);
	return items.map(
		(item): ChatContextItem => ({
			type: 'episode',
			id: String(item.episodeId),
			title: item.episodeTitle || `Episode ${item.episodeNumber}`,
			animeTitle: item.animeTitle,
			thumbnail: item.animeThumbnail,
			description: `Episode ${item.episodeNumber}${
				Number.isFinite(item.progressPct) ? ` • ${Math.round(item.progressPct ?? 0)}% ditonton` : ''
			}`,
			slug: item.episodeSlug,
			animeSlug: item.animeSlug,
			url: `/anime/${item.animeSlug}/${item.episodeSlug}`
		})
	);
}

export async function fetchChatPublicUser(userId: number) {
	const response = await auth.authFetch(`/api/users/${userId}`);
	return auth.parseApi<PublicUser>(response);
}

export async function searchChatMentionUsers(q: string, limit = 8) {
	const params = new URLSearchParams({
		q,
		limit: String(limit)
	});
	const response = await auth.authFetch(`/api/users/search?${params.toString()}`);
	return auth.parseApi<ChatMentionUser[]>(response);
}

export async function openChatSocket() {
	const token = await ensureChatToken();
	if (!token) return null;
	return new WebSocket(chatWsUrl(token));
}
