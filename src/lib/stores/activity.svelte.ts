import { browser } from '$app/environment';
import { auth } from '$lib/stores/auth.svelte';

export type ActivityPingPayload = {
	path: string;
	title?: string;
	watchingAnimeId?: number | null;
	watchingEpisodeId?: number | null;
	watchingAnimeTitle?: string | null;
	watchingEpisodeTitle?: string | null;
	watchingEpisodeNumber?: number | null;
};

let timer: ReturnType<typeof setInterval> | null = null;
let lastPingAt = 0;

async function ping(payload: ActivityPingPayload, force = false) {
	if (!browser || !auth.isLoggedIn) return;

	const now = Date.now();
	if (!force && now - lastPingAt < 15_000) return;
	lastPingAt = now;

	await auth
		.authFetch('/api/activity/ping', {
			method: 'POST',
			body: JSON.stringify(payload)
		})
		.catch(() => null);
}

function start(getPayload: () => ActivityPingPayload) {
	if (!browser) return () => null;
	stop();
	ping(getPayload(), true);
	timer = setInterval(() => ping(getPayload(), true), 60_000);
	return stop;
}

function stop() {
	if (timer) clearInterval(timer);
	timer = null;
}

export const activity = { ping, start, stop };
