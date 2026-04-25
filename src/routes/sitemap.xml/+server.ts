import config from '$lib/config';

type AnimeListItem = {
	slug: string;
	updatedAt?: string;
};

type AnimeDetail = AnimeListItem & {
	episodes?: Array<{
		slug: string;
		date?: string;
		updatedAt?: string;
	}>;
};

function escapeXml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

async function fetchSiteUrl(fetch: typeof globalThis.fetch) {
	const response = await fetch(`${config.API_BASE_URL}/api/site-config?group=general,seo`);
	const payload = await response.json().catch(() => ({}));
	const siteConfig = response.ok ? (payload.data ?? payload ?? {}) : {};
	return String(siteConfig['site.url'] ?? siteConfig['seo.canonicalUrl'] ?? 'http://localhost:5173').replace(
		/\/$/,
		''
	);
}

async function fetchAllAnime(fetch: typeof globalThis.fetch) {
	const limit = 100;
	let page = 1;
	let totalPages = 1;
	const items: AnimeListItem[] = [];

	do {
		const response = await fetch(`${config.API_BASE_URL}/api/anime?page=${page}&limit=${limit}`);
		const payload = await response.json().catch(() => ({}));

		if (!response.ok) break;

		items.push(...((payload.data ?? []) as AnimeListItem[]));
		totalPages = Number(payload.meta?.totalPages ?? page);
		page += 1;
	} while (page <= totalPages);

	return items;
}

async function fetchAnimeDetail(fetch: typeof globalThis.fetch, slug: string) {
	const response = await fetch(`${config.API_BASE_URL}/api/anime/${slug}`);
	const payload = await response.json().catch(() => ({}));
	return response.ok ? ((payload.data ?? payload) as AnimeDetail) : null;
}

function urlEntry(loc: string, priority: string, lastmod?: string) {
	const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : '';
	return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}<priority>${priority}</priority></url>`;
}

export async function GET({ fetch }) {
	const siteUrl = await fetchSiteUrl(fetch);
	const animeItems = await fetchAllAnime(fetch);
	const details = await Promise.all(animeItems.map((anime) => fetchAnimeDetail(fetch, anime.slug)));

	const urls = [urlEntry(`${siteUrl}/`, '1.0')];

	for (const detail of details) {
		if (!detail?.slug) continue;

		urls.push(urlEntry(`${siteUrl}/anime/${detail.slug}`, '0.8', detail.updatedAt));

		for (const episode of detail.episodes ?? []) {
			if (!episode.slug) continue;
			urls.push(
				urlEntry(
					`${siteUrl}/anime/${detail.slug}/${episode.slug}`,
					'0.6',
					episode.updatedAt ?? detail.updatedAt
				)
			);
		}
	}

	return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
