import { auth } from './auth.svelte';

export type WatchHistory = {
	id: number;
	userId: number;
	animeId: number;
	animeSlug: string;
	animeTitle: string;
	animeThumbnail: string;
	animeType?: string | null;
	episodeId: number;
	episodeSlug: string;
	episodeNumber: number;
	episodeTitle: string;
	progressSec: number;
	durationSec: number;
	progressPct: number;
	watchedAt: string;
	updatedAt: string;
};

export type WatchHistoryPayload = Omit<
	WatchHistory,
	'id' | 'userId' | 'progressPct' | 'watchedAt' | 'updatedAt'
>;

let items = $state<WatchHistory[]>([]);
let isLoading = $state(false);
let total = $state(0);

async function fetchHistory(page = 1, limit = 50) {
	if (!auth.isLoggedIn) return [];
	isLoading = true;
	try {
		const response = await auth.authFetch(`/api/history?page=${page}&limit=${limit}`);
		const json = await response
			.clone()
			.json()
			.catch(() => null);
		const data = await auth.parseApi<WatchHistory[]>(response);
		items = data;
		total = Number(json?.meta?.total ?? data.length);
		return data;
	} finally {
		isLoading = false;
	}
}

async function upsertHistory(payload: WatchHistoryPayload) {
	if (!auth.isLoggedIn) return null;
	const response = await auth.authFetch('/api/history/upsert', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	const item = await auth.parseApi<WatchHistory>(response);
	const index = items.findIndex((entry) => entry.episodeId === item.episodeId);
	if (index >= 0) items[index] = item;
	else items = [item, ...items];
	return item;
}

async function deleteHistory(episodeId: number) {
	if (!auth.isLoggedIn) return;
	await auth.authFetch(`/api/history/${episodeId}`, { method: 'DELETE' });
	items = items.filter((item) => item.episodeId !== episodeId);
}

async function clearHistory() {
	if (!auth.isLoggedIn) return;
	await auth.authFetch('/api/history', { method: 'DELETE' });
	items = [];
	total = 0;
}

function byEpisode(episodeId?: number) {
	if (!episodeId) return null;
	return items.find((item) => item.episodeId === episodeId) ?? null;
}

export const history = {
	get items() {
		return items;
	},
	get isLoading() {
		return isLoading;
	},
	get total() {
		return total;
	},
	fetchHistory,
	upsertHistory,
	deleteHistory,
	clearHistory,
	byEpisode
};
