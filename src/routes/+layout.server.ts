import config from '$lib/config';

export async function load({ fetch }) {
	try {
		const response = await fetch(
			`${config.API_BASE_URL}/api/site-config?group=general,seo,appearance,analytics`
		);
		const payload = await response.json();

		return {
			siteConfig: response.ok ? (payload.data ?? payload ?? {}) : {}
		};
	} catch {
		return {
			siteConfig: {}
		};
	}
}
