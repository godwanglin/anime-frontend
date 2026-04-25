import { auth } from './auth.svelte';

export type SavedAnime = {
	id: number;
	userId: number;
	animeId: number;
	animeSlug: string;
	animeTitle: string;
	animeThumbnail: string;
	animeStatus: string;
	savedAt: string;
};

export type SavedAnimePayload = Omit<SavedAnime, 'id' | 'userId' | 'savedAt'>;

let items = $state<SavedAnime[]>([]);
let isLoading = $state(false);
let total = $state(0);

async function fetchSaved(page = 1, limit = 50) {
	if (!auth.isLoggedIn) return [];
	isLoading = true;
	try {
		const response = await auth.authFetch(`/api/saved?page=${page}&limit=${limit}`);
		const json = await response.clone().json().catch(() => null);
		const data = await auth.parseApi<SavedAnime[]>(response);
		items = data;
		total = Number(json?.meta?.total ?? data.length);
		return data;
	} finally {
		isLoading = false;
	}
}

async function saveAnime(payload: SavedAnimePayload) {
	if (!auth.isLoggedIn) return null;
	const response = await auth.authFetch('/api/saved', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	const item = await auth.parseApi<SavedAnime>(response);
	const index = items.findIndex((entry) => entry.animeId === item.animeId);
	if (index >= 0) items[index] = item;
	else items = [item, ...items];
	return item;
}

async function unsaveAnime(animeId: number) {
	if (!auth.isLoggedIn) return;
	await auth.authFetch(`/api/saved/${animeId}`, { method: 'DELETE' });
	items = items.filter((item) => item.animeId !== animeId);
}

function checkSaved(animeId?: number) {
	if (!animeId) return false;
	return items.some((item) => item.animeId === animeId);
}

export const saved = {
	get items() {
		return items;
	},
	get isLoading() {
		return isLoading;
	},
	get total() {
		return total;
	},
	fetchSaved,
	saveAnime,
	unsaveAnime,
	checkSaved
};
