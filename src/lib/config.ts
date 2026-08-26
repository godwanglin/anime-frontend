import { env } from '$env/dynamic/public';

export default {
	API_BASE_URL: env.PUBLIC_API_BASE_URL || 'https://weebinhub.com',
	IMAGE_CDN: env.PUBLIC_IMAGE_CDN || 'https://cdn-static.weebinhub.com',
	// API_BASE_URL: env.PUBLIC_API_BASE_URL || 'http://localhost:3000',
	GOOGLE_CLIENT_ID:
		env.PUBLIC_GOOGLE_CLIENT_ID ||
		'199688498399-qa56cp7605ulssu93kmaleseq4pps4ra.apps.googleusercontent.com',
	GOOGLE_REDIRECT_URI:
		env.PUBLIC_GOOGLE_REDIRECT_URI || 'https://weebinhub.com/creds/google/callback',
	ENABLE_PREMIUM_FEATURE: env.PUBLIC_ENABLE_PREMIUM_FEATURE === 'true'
};
