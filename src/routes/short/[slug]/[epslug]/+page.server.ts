import config from '$lib/config';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

const GUEST_WATCH_COOKIE = 'weebin_guest_watch_id';
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

type EpisodeDetail = Record<string, unknown> & {
	anime?: Record<string, unknown>;
	episode?: Record<string, unknown>;
};

type VideoServer = { value?: string };
type PlayerSubtitle = { label: string; lang: string; src: string };

function pickEpisodePayload(payload: unknown) {
	if (!payload || typeof payload !== 'object') return null;
	const body = payload as Record<string, unknown>;
	return (body.data ?? body) as EpisodeDetail;
}

function cleanGuestId(value: string | undefined) {
	return value && /^[a-zA-Z0-9_-]{16,64}$/.test(value) ? value : null;
}

function ensureGuestId(cookies: Parameters<PageServerLoad>[0]['cookies']) {
	const guestId =
		cleanGuestId(cookies.get(GUEST_WATCH_COOKIE)) ??
		globalThis.crypto?.randomUUID?.().replace(/-/g, '') ??
		`${Date.now()}${Math.random().toString(36).slice(2, 18)}`;

	cookies.set(GUEST_WATCH_COOKIE, guestId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 180
	});

	return guestId;
}

function authCookieHeader(
	cookies: Parameters<PageServerLoad>[0]['cookies'],
	overrides: { accessToken?: string; refreshToken?: string } = {}
) {
	const parts = [];
	const accessToken = overrides.accessToken ?? cookies.get('accessToken');
	const refreshToken = overrides.refreshToken ?? cookies.get('refreshToken');
	if (accessToken) parts.push(`accessToken=${accessToken}`);
	if (refreshToken) parts.push(`refreshToken=${refreshToken}`);
	return parts.join('; ');
}

function setAuthCookie(
	cookies: Parameters<PageServerLoad>[0]['cookies'],
	name: 'accessToken' | 'refreshToken',
	value: string,
	maxAge: number
) {
	cookies.set(name, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge
	});
}

async function refreshAuthSession(input: {
	fetch: Parameters<PageServerLoad>[0]['fetch'];
	cookies: Parameters<PageServerLoad>[0]['cookies'];
}) {
	const refreshToken = input.cookies.get('refreshToken');
	if (!refreshToken) return null;

	const response = await input.fetch(`${config.API_BASE_URL}/api/auth/refresh`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refreshToken })
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok) return null;

	const data = payload?.data as { accessToken?: string; refreshToken?: string } | undefined;
	if (data?.accessToken) setAuthCookie(input.cookies, 'accessToken', data.accessToken, ACCESS_TOKEN_MAX_AGE);
	if (data?.refreshToken)
		setAuthCookie(input.cookies, 'refreshToken', data.refreshToken, REFRESH_TOKEN_MAX_AGE);
	return data ?? null;
}

function isYouTubeUrl(url: string) {
	return /(?:youtube\.com\/watch|youtu\.be\/)/.test(url);
}

async function loadYouTubeSubtitles(input: {
	detail: EpisodeDetail | null;
	fetch: Parameters<PageServerLoad>[0]['fetch'];
}) {
	const episode = input.detail?.episode as Record<string, unknown> | undefined;
	const servers = ((input.detail?.servers ?? episode?.servers ?? []) as VideoServer[]);
	const youtubeServer = servers.find((server) => server.value && isYouTubeUrl(server.value));
	if (!youtubeServer?.value) return {};

	const playlistUrl = `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/playlist?url=${encodeURIComponent(
		youtubeServer.value
	)}`;
	const captionsUrl = `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/captions?url=${encodeURIComponent(
		youtubeServer.value
	)}`;
	const response = await input.fetch(captionsUrl);
	if (!response.ok) return {};

	const payload = await response.json().catch(() => null);
	const tracks = Array.isArray(payload?.data) ? (payload.data as PlayerSubtitle[]) : [];
	return tracks.length ? { [playlistUrl]: tracks } : {};
}

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const episodeUrl = `${config.API_BASE_URL}/api/anime/${params.slug}/${params.epslug}`;
	const headers = new Headers({ 'x-guest-watch-id': ensureGuestId(cookies) });
	const cookieHeader = authCookieHeader(cookies);
	if (cookieHeader) headers.set('Cookie', cookieHeader);

	let episodeRes = await fetch(episodeUrl, { headers });
	let episodeJson = await episodeRes.json().catch(() => null);

	if (!episodeRes.ok && episodeJson?.errorCode === 'LOGIN_REQUIRED') {
		const refreshed = await refreshAuthSession({ fetch, cookies });
		if (refreshed?.accessToken) {
			headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
			const refreshedCookieHeader = authCookieHeader(cookies, refreshed);
			if (refreshedCookieHeader) headers.set('Cookie', refreshedCookieHeader);
			episodeRes = await fetch(episodeUrl, { headers });
			episodeJson = await episodeRes.json().catch(() => null);
		}
	}

	if (!episodeRes.ok) {
		return {
			anime: null,
			episode: null,
			episodeDetail: null,
			youtubeSubtitlesBySrc: {},
			params,
			error: episodeJson?.message ?? `Episode API returned ${episodeRes.status}`
		};
	}

	const detail = pickEpisodePayload(episodeJson);
	return {
		anime: detail?.anime ?? null,
		episode: detail?.episode ?? detail ?? null,
		episodeDetail: detail,
		youtubeSubtitlesBySrc: await loadYouTubeSubtitles({ detail, fetch }),
		params,
		error: null
	};
};
