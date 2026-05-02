import { dev } from '$app/environment';
import config from '$lib/config';

const GUEST_WATCH_COOKIE = 'weebin_guest_watch_id';

function cleanGuestId(value: string | undefined) {
	if (!value) return null;
	return /^[a-zA-Z0-9_-]{16,64}$/.test(value) ? value : null;
}

function createGuestId() {
	return (
		globalThis.crypto?.randomUUID?.().replace(/-/g, '') ??
		`${Date.now()}${Math.random().toString(36).slice(2, 18)}`
	);
}

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}

export const GET = async ({ cookies, fetch, url }) => {
	const guestId = cleanGuestId(cookies.get(GUEST_WATCH_COOKIE)) ?? createGuestId();
	const animeSlug = url.searchParams.get('animeSlug')?.trim() || url.searchParams.get('slug')?.trim();

	cookies.set(GUEST_WATCH_COOKIE, guestId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 180
	});

	if (!animeSlug) {
		return json({
			guestId,
			remaining: null,
			message: 'Tambahkan ?animeSlug=slug-anime untuk cek sisa kuota guest.',
			example: '/debug?animeSlug=swallowed-star'
		});
	}

	const response = await fetch(
		`${config.API_BASE_URL}/api/anime/debug/guest-watch?animeSlug=${encodeURIComponent(animeSlug)}`,
		{ headers: { 'x-guest-watch-id': guestId } }
	);
	const payload = await response.json().catch(() => null);

	return json(
		{
			frontendGuestId: guestId,
			backendStatus: response.status,
			...payload
		},
		response.ok ? 200 : response.status
	);
};
