import config from '$lib/config';
import type { EquippedFrame, EquippedNameTag } from '$lib/decorations';
import type { ExpBadge } from '$lib/exp';
import { auth } from './auth.svelte';

export type ReactionType = 'LIKE' | 'DISLIKE';

export type CommentWithMeta = {
	id: number;
	animeId?: number;
	episodeId?: number | null;
	content: string | null;
	isDeleted: boolean;
	isEdited: boolean;
	editedAt: string | null;
	parentId: number | null;
	replyCount: number;
	likeCount: number;
	dislikeCount: number;
	userReaction: ReactionType | null;
	createdAt: string;
	user: {
		id: number;
		username: string;
		avatar: string | null;
		isVerified?: boolean;
		exp?: number;
		level?: number;
		badge?: ExpBadge;
		frame?: EquippedFrame;
		nametag?: EquippedNameTag;
	};
};

type Pagination = {
	page: number;
	total: number;
	limit: number;
};

type ApiEnvelope<T> = {
	status: number;
	message: string | null;
	errorCode: string | null;
	data: T;
	meta?: Record<string, unknown>;
};

let items = $state<CommentWithMeta[]>([]);
let replies = $state<Map<number, CommentWithMeta[]>>(new Map());
let isLoading = $state(false);
let isPosting = $state(false);
let cooldownRemaining = $state(0);
let pagination = $state<Pagination>({ page: 1, total: 0, limit: 20 });
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

async function request<T>(path: string, init: RequestInit = {}) {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	if (auth.accessToken) headers.set('Authorization', `Bearer ${auth.accessToken}`);

	const response = auth.isLoggedIn
		? await auth.authFetch(path, { ...init, headers })
		: await fetch(`${config.API_BASE_URL}${path}`, { ...init, headers });
	const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

	if (!response.ok) {
		const error = new Error(json?.message ?? 'Request gagal') as Error & {
			data?: unknown;
			meta?: Record<string, unknown>;
			status?: number;
		};
		error.data = json?.data;
		error.meta = json?.meta;
		error.status = response.status;
		throw error;
	}

	return json as ApiEnvelope<T>;
}

function startCooldownTimer() {
	if (cooldownTimer) return;
	cooldownTimer = setInterval(() => {
		if (cooldownRemaining > 0) cooldownRemaining -= 1;
		if (cooldownRemaining <= 0 && cooldownTimer) {
			clearInterval(cooldownTimer);
			cooldownTimer = null;
		}
	}, 1000);
}

function setCooldown(seconds: number) {
	cooldownRemaining = Math.max(0, Math.ceil(seconds));
	startCooldownTimer();
}

function replaceInTree(id: number, updater: (comment: CommentWithMeta) => CommentWithMeta) {
	items = items.map((item) => (item.id === id ? updater(item) : item));
	const next = new Map(replies);
	for (const [commentId, list] of next) {
		next.set(
			commentId,
			list.map((item) => (item.id === id ? updater(item) : item))
		);
	}
	replies = next;
}

function removeTemp(id: number, parentId: number | null) {
	if (!parentId) {
		items = items.filter((item) => item.id !== id);
		return;
	}
	const next = new Map(replies);
	next.set(
		parentId,
		(next.get(parentId) ?? []).filter((item) => item.id !== id)
	);
	replies = next;
}

async function fetchComments(animeId: number, episodeId?: number, page = 1, sort = 'newest') {
	isLoading = true;
	try {
		const params = new URLSearchParams({
			animeId: String(animeId),
			page: String(page),
			limit: String(pagination.limit),
			sort
		});
		if (episodeId) params.set('episodeId', String(episodeId));

		const json = await request<CommentWithMeta[]>(`/api/comments?${params.toString()}`);
		items = page === 1 ? json.data : [...items, ...json.data];
		pagination = {
			page: Number(json.meta?.page ?? page),
			total: Number(json.meta?.total ?? json.data.length),
			limit: Number(json.meta?.limit ?? pagination.limit)
		};
		return json.data;
	} finally {
		isLoading = false;
	}
}

async function fetchReplies(commentId: number, page = 1) {
	const json = await request<CommentWithMeta[]>(
		`/api/comments/${commentId}/replies?page=${page}&limit=10`
	);
	const next = new Map(replies);
	next.set(commentId, page === 1 ? json.data : [...(next.get(commentId) ?? []), ...json.data]);
	replies = next;
	return json.data;
}

async function postComment(payload: {
	animeId: number;
	episodeId?: number;
	content: string;
	parentId?: number;
}) {
	if (!auth.user) return;
	isPosting = true;
	const tempId = -Date.now();
	const temp: CommentWithMeta = {
		id: tempId,
		animeId: payload.animeId,
		episodeId: payload.episodeId ?? null,
		content: payload.content,
		isDeleted: false,
		isEdited: false,
		editedAt: null,
		parentId: payload.parentId ?? null,
		replyCount: 0,
		likeCount: 0,
		dislikeCount: 0,
		userReaction: null,
		createdAt: new Date().toISOString(),
		user: {
			id: auth.user.id,
			username: auth.user.username,
			avatar: auth.user.avatar,
			isVerified: auth.user.isVerified,
			exp: auth.user.exp,
			level: auth.user.level,
			badge: auth.user.badge,
			frame: auth.user.frame ?? null,
			nametag: auth.user.nametag ?? null
		}
	};

	if (payload.parentId) {
		const next = new Map(replies);
		next.set(payload.parentId, [...(next.get(payload.parentId) ?? []), temp]);
		replies = next;
		replaceInTree(payload.parentId, (item) => ({ ...item, replyCount: item.replyCount + 1 }));
	} else {
		items = [temp, ...items];
	}

	try {
		const json = await request<CommentWithMeta>('/api/comments', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		replaceInTree(tempId, () => json.data);
		setCooldown(Number(json.meta?.cooldownRemaining ?? 300));
	} catch (error) {
		removeTemp(tempId, payload.parentId ?? null);
		if (payload.parentId) {
			replaceInTree(payload.parentId, (item) => ({
				...item,
				replyCount: Math.max(0, item.replyCount - 1)
			}));
		}
		const err = error as Error & { data?: { cooldownRemaining?: number } };
		if (err.data?.cooldownRemaining) setCooldown(err.data.cooldownRemaining);
		throw error;
	} finally {
		isPosting = false;
	}
}

async function editComment(id: number, content: string) {
	const previous = [...items];
	replaceInTree(id, (item) => ({ ...item, content, isEdited: true, editedAt: new Date().toISOString() }));
	try {
		const json = await request<CommentWithMeta>(`/api/comments/${id}`, {
			method: 'PUT',
			body: JSON.stringify({ content })
		});
		replaceInTree(id, () => json.data);
	} catch (error) {
		items = previous;
		throw error;
	}
}

async function deleteComment(id: number) {
	replaceInTree(id, (item) => ({
		...item,
		content: '[Komentar dihapus]',
		isDeleted: true
	}));
	await request(`/api/comments/${id}`, { method: 'DELETE' });
}

async function react(commentId: number, type: ReactionType) {
	let previous: CommentWithMeta | null = null;
	replaceInTree(commentId, (item) => {
		previous = item;
		const same = item.userReaction === type;
		const nextReaction = same ? null : type;
		let likeCount = item.likeCount;
		let dislikeCount = item.dislikeCount;
		if (item.userReaction === 'LIKE') likeCount -= 1;
		if (item.userReaction === 'DISLIKE') dislikeCount -= 1;
		if (nextReaction === 'LIKE') likeCount += 1;
		if (nextReaction === 'DISLIKE') dislikeCount += 1;
		return { ...item, userReaction: nextReaction, likeCount, dislikeCount };
	});

	try {
		const json = await request<{
			liked: boolean;
			disliked: boolean;
			likeCount: number;
			dislikeCount: number;
		}>(`/api/comments/${commentId}/react`, {
			method: 'POST',
			body: JSON.stringify({ type })
		});
		replaceInTree(commentId, (item) => ({
			...item,
			likeCount: json.data.likeCount,
			dislikeCount: json.data.dislikeCount,
			userReaction: json.data.liked ? 'LIKE' : json.data.disliked ? 'DISLIKE' : null
		}));
	} catch (error) {
		if (previous) replaceInTree(commentId, () => previous as CommentWithMeta);
		throw error;
	}
}

export const comments = {
	get items() {
		return items;
	},
	get replies() {
		return replies;
	},
	get isLoading() {
		return isLoading;
	},
	get isPosting() {
		return isPosting;
	},
	get cooldownRemaining() {
		return cooldownRemaining;
	},
	get pagination() {
		return pagination;
	},
	fetchComments,
	fetchReplies,
	postComment,
	editComment,
	deleteComment,
	react,
	startCooldownTimer
};
