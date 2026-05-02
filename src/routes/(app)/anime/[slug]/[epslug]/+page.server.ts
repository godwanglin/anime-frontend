import config from '$lib/config';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

type Episode = {
	id: number;
	slug: string;
	number: number;
	title: string;
	sub?: string;
	date?: string;
};

type Anime = {
	id: number;
	slug: string;
	title: string;
	thumbnail?: string;
	bigCover?: string;
	episodes?: Episode[];
};

type EpisodeDetail = Record<string, unknown> & {
	anime?: Anime;
	episode?: Episode;
};

function pickEpisodePayload(payload: unknown) {
	if (!payload || typeof payload !== 'object') return null;
	const body = payload as Record<string, unknown>;
	return (body.data ?? body) as EpisodeDetail;
}

const GUEST_WATCH_COOKIE = 'weebin_guest_watch_id';

function cleanGuestId(value: string | undefined) {
	if (!value) return null;
	return /^[a-zA-Z0-9_-]{16,64}$/.test(value) ? value : null;
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

async function accessTokenFromRefresh(input: {
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

	if (data?.refreshToken) {
		input.cookies.set('refreshToken', data.refreshToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 7
		});
	}

	return data?.accessToken ?? null;
}

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const episodeUrl = `${config.API_BASE_URL}/api/anime/${params.slug}/${params.epslug}`;
	const guestId = ensureGuestId(cookies);
	const accessToken = await accessTokenFromRefresh({ fetch, cookies });
	const headers = new Headers({ 'x-guest-watch-id': guestId });

	if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

	const episodeRes = await fetch(episodeUrl, { headers });
	const episodeJson = await episodeRes.json().catch(() => null);

	if (episodeRes.ok) {
		const detail = pickEpisodePayload(episodeJson);

		// console.log(episodeJson);

		return {
			anime: detail?.anime ?? null,
			episode: detail?.episode ?? detail ?? null,
			episodeDetail: detail,
			apiUrl: episodeUrl,
			params,
			error: null
		};
	}

	const animeUrl = `${config.API_BASE_URL}/api/anime/${params.slug}`;
	const animeRes = await fetch(animeUrl);

	if (!animeRes.ok) {
		return {
			anime: null,
			episode: null,
			episodeDetail: null,
			apiUrl: episodeUrl,
			params,
			error: `Episode API returned ${episodeRes.status}, and anime fallback returned ${animeRes.status}.`,
			errorCode: episodeJson?.errorCode ?? null,
			guestWatch: episodeJson?.data?.guestWatch ?? null
		};
	}

	const animeJson = await animeRes.json();
	const anime = (animeJson.data ?? animeJson) as Anime;
	const episode = anime.episodes?.find((item) => item.slug === params.epslug) ?? null;

	return {
		anime,
		episode,
		episodeDetail: null,
		apiUrl: episodeUrl,
		params,
		errorCode: episodeJson?.errorCode ?? null,
		guestWatch: episodeJson?.data?.guestWatch ?? null,
		error: episode
			? episodeJson?.errorCode === 'LOGIN_REQUIRED'
				? 'LOGIN_REQUIRED'
				: `Episode detail endpoint returned ${episodeRes.status}; using anime detail fallback.`
			: `Episode detail endpoint returned ${episodeRes.status}; episode was not found in anime detail.`
	};
};
