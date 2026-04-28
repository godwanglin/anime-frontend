import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import config from '$lib/config';
import {
	DEFAULT_GOOGLE_REDIRECT_URI,
	GOOGLE_STATE_COOKIE,
	buildGoogleOAuthUrl,
	loginErrorRedirect
} from '$lib/server/google-oauth';

export const GET = async ({ cookies }) => {
	const clientId = config.GOOGLE_CLIENT_ID || privateEnv.GOOGLE_CLIENT_ID || '';
	const redirectUri =
		config.GOOGLE_REDIRECT_URI || privateEnv.GOOGLE_REDIRECT_URI || DEFAULT_GOOGLE_REDIRECT_URI;

	if (!clientId) {
		throw redirect(302, loginErrorRedirect('Google login belum dikonfigurasi'));
	}

	const state = crypto.randomUUID();
	cookies.set(GOOGLE_STATE_COOKIE, state, {
		path: '/creds/google',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 10 * 60
	});

	throw redirect(
		302,
		buildGoogleOAuthUrl({
			clientId,
			redirectUri,
			state
		})
	);
};
