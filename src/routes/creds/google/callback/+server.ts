import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import config from '$lib/config';
import { GOOGLE_STATE_COOKIE, loginErrorRedirect } from '$lib/server/google-oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, fetch, url }) => {
	const code = url.searchParams.get('code')?.trim();
	const state = url.searchParams.get('state')?.trim();
	const savedState = cookies.get(GOOGLE_STATE_COOKIE);

	cookies.delete(GOOGLE_STATE_COOKIE, { path: '/creds/google' });

	if (!code) {
		throw redirect(302, loginErrorRedirect('Google login dibatalkan atau code kosong'));
	}

	if (!state || !savedState || state !== savedState) {
		throw redirect(302, loginErrorRedirect('State Google tidak valid, coba login ulang'));
	}

	const response = await fetch(`${config.API_BASE_URL}/api/auth/google/callback`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code, state })
	});

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		throw redirect(302, loginErrorRedirect(payload?.message ?? 'Login Google gagal'));
	}

	const data = (payload?.data ?? {}) as {
		refreshToken?: string;
		accessToken?: string;
		user?: unknown;
	};

	if (data.refreshToken) {
		cookies.set('refreshToken', data.refreshToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 7
		});
	}

	if (data.user) {
		cookies.set('google_login_user', Buffer.from(JSON.stringify(data.user), 'utf8').toString('base64'), {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60
		});
	}

	throw redirect(302, '/');
};
