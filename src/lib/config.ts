import { env } from '$env/dynamic/public';

export default {
	API_BASE_URL: env.PUBLIC_API_BASE_URL || 'https://api.weebin.site',
	GOOGLE_CLIENT_ID: env.PUBLIC_GOOGLE_CLIENT_ID || '',
	GOOGLE_REDIRECT_URI: env.PUBLIC_GOOGLE_REDIRECT_URI || 'https://weebin.site/creds/google/callback'
};
