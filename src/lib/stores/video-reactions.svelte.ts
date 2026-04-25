import config from '$lib/config';
import { auth } from '$lib/stores/auth.svelte';

export type VideoReactionType = 'LIKE' | 'DISLIKE';

export type VideoReactionState = {
	liked: boolean;
	disliked: boolean;
	likeCount: number;
	dislikeCount: number;
	userReaction: VideoReactionType | null;
	isLoading: boolean;
	error: string | null;
};

const emptyReaction = (): VideoReactionState => ({
	liked: false,
	disliked: false,
	likeCount: 0,
	dislikeCount: 0,
	userReaction: null,
	isLoading: false,
	error: null
});

let reactions = $state<Record<number, VideoReactionState>>({});

function getReaction(episodeId?: number | null) {
	if (!episodeId) return emptyReaction();
	return reactions[episodeId] ?? emptyReaction();
}

function setReaction(episodeId: number, reaction: VideoReactionState) {
	reactions = {
		...reactions,
		[episodeId]: reaction
	};
}

function normalizeReaction(data: Partial<VideoReactionState>): VideoReactionState {
	return {
		liked: Boolean(data.liked),
		disliked: Boolean(data.disliked),
		likeCount: Number(data.likeCount ?? 0),
		dislikeCount: Number(data.dislikeCount ?? 0),
		userReaction: data.userReaction ?? (data.liked ? 'LIKE' : data.disliked ? 'DISLIKE' : null),
		isLoading: false,
		error: null
	};
}

async function fetchReaction(episodeId: number) {
	const current = getReaction(episodeId);
	setReaction(episodeId, { ...current, isLoading: true, error: null });

	try {
		const response = auth.isLoggedIn
			? await auth.authFetch(`/api/episodes/${episodeId}/reaction`)
			: await fetch(`${config.API_BASE_URL}/api/episodes/${episodeId}/reaction`);

		const data = await auth.parseApi<Partial<VideoReactionState>>(response);
		setReaction(episodeId, normalizeReaction(data));
		return data;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Gagal memuat reaksi';
		setReaction(episodeId, { ...current, isLoading: false, error: message });
		return null;
	}
}

function optimisticNext(current: VideoReactionState, type: VideoReactionType): VideoReactionState {
	const next = { ...current, error: null };

	if (type === 'LIKE') {
		if (current.liked) {
			next.liked = false;
			next.userReaction = null;
			next.likeCount = Math.max(0, current.likeCount - 1);
		} else {
			next.liked = true;
			next.userReaction = 'LIKE';
			next.likeCount = current.likeCount + 1;
			if (current.disliked) {
				next.disliked = false;
				next.dislikeCount = Math.max(0, current.dislikeCount - 1);
			}
		}
	}

	if (type === 'DISLIKE') {
		if (current.disliked) {
			next.disliked = false;
			next.userReaction = null;
			next.dislikeCount = Math.max(0, current.dislikeCount - 1);
		} else {
			next.disliked = true;
			next.userReaction = 'DISLIKE';
			next.dislikeCount = current.dislikeCount + 1;
			if (current.liked) {
				next.liked = false;
				next.likeCount = Math.max(0, current.likeCount - 1);
			}
		}
	}

	return next;
}

async function react(episodeId: number, type: VideoReactionType) {
	const previous = getReaction(episodeId);
	const optimistic = optimisticNext(previous, type);
	setReaction(episodeId, optimistic);

	try {
		const response = await auth.authFetch(`/api/episodes/${episodeId}/react`, {
			method: 'POST',
			body: JSON.stringify({ type })
		});
		const data = await auth.parseApi<Partial<VideoReactionState>>(response);
		setReaction(episodeId, normalizeReaction(data));
		return data;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Gagal mengirim reaksi';
		setReaction(episodeId, { ...previous, error: message });
		throw error;
	}
}

export const videoReactions = {
	get items() {
		return reactions;
	},
	getReaction,
	fetchReaction,
	react
};
