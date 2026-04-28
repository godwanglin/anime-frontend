export const GOOGLE_STATE_COOKIE = 'google_oauth_state';
export const DEFAULT_GOOGLE_REDIRECT_URI = 'http://localhost:5173/creds/google/callback';

export function buildGoogleOAuthUrl(input: {
	clientId: string;
	redirectUri: string;
	state: string;
}) {
	const params = new URLSearchParams({
		client_id: input.clientId,
		redirect_uri: input.redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		prompt: 'select_account',
		state: input.state
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function loginErrorRedirect(message: string) {
	return `/login?error=${encodeURIComponent(message)}`;
}
