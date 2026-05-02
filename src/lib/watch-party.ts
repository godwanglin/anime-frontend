import config from '$lib/config';
import { auth } from '$lib/stores/auth.svelte';

export type WatchPartyFeatureStatus = {
	enabled: boolean;
	transport: 'polling-prep' | 'websocket';
	realtimeReady: boolean;
};

export type WatchPartyRoom = {
	id: string;
	code: string;
	title: string | null;
	status: string;
	visibility: string;
	playback: {
		positionSec: number;
		status: string;
	};
	participantCount: number;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	host: {
		id: number;
		username: string;
		fullName: string | null;
		avatar: string | null;
	};
	anime: {
		id: number;
		slug: string;
		title: string;
		thumbnail: string | null;
	};
	episode: {
		id: number;
		slug: string;
		number: number;
		title: string;
	};
};

function publicApiFetch(path: string) {
	return fetch(`${config.API_BASE_URL}${path}`);
}

export async function fetchWatchPartyFeatureStatus() {
	const response = await publicApiFetch('/api/watch-party/feature');
	return auth.parseApi<WatchPartyFeatureStatus>(response);
}

export async function createWatchPartyRoom(input: { episodeId: number; title?: string }) {
	const response = await auth.authFetch('/api/watch-party/rooms', {
		method: 'POST',
		body: JSON.stringify(input)
	});
	return auth.parseApi<WatchPartyRoom>(response);
}

export async function fetchMyWatchPartyRooms() {
	const response = await auth.authFetch('/api/watch-party/rooms/mine');
	return auth.parseApi<WatchPartyRoom[]>(response);
}

export async function fetchWatchPartyRoom(code: string) {
	const response = await publicApiFetch(`/api/watch-party/rooms/${encodeURIComponent(code)}`);
	return auth.parseApi<WatchPartyRoom>(response);
}
