import config from '$lib/config';

export async function GET({ fetch }) {
	const response = await fetch(`${config.API_BASE_URL}/api/site-config?group=seo`);
	const payload = await response.json().catch(() => ({}));
	const siteConfig = response.ok ? (payload.data ?? payload ?? {}) : {};
	const robots =
		siteConfig['seo.robotsTxt'] ??
		'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /profile/\nSitemap: /sitemap.xml';

	return new Response(robots, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
