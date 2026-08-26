import type { RequestHandler } from './$types';

const ALLOWED_ORIGIN = 'https://cdn-static.weebinhub.com';
const MAX_REDIRECTS = 3;

function allowedCdnUrl(rawUrl: string) {
	if (!rawUrl || rawUrl.length > 4096) return null;

	try {
		const parsed = new URL(rawUrl);
		if (parsed.origin !== ALLOWED_ORIGIN) return null;
		if (parsed.username || parsed.password) return null;
		return parsed;
	} catch {
		return null;
	}
}

async function fetchAllowedCdn(
	fetchFn: typeof fetch,
	target: URL,
	remainingRedirects = MAX_REDIRECTS
): Promise<Response> {
	const response = await fetchFn(target.href, {
		redirect: 'manual',
		headers: {
			Accept: 'image/*,*/*;q=0.8'
		}
	});

	const location = response.headers.get('location');
	if (response.status >= 300 && response.status < 400 && location) {
		if (remainingRedirects <= 0) return response;

		const next = allowedCdnUrl(new URL(location, target).href);
		if (!next) return new Response('Redirect target tidak diperbolehkan', { status: 403 });

		return fetchAllowedCdn(fetchFn, next, remainingRedirects - 1);
	}

	return response;
}

function proxiedHeaders(upstream: Response) {
	const headers = new Headers();
	const passthrough = ['content-type', 'cache-control', 'etag', 'last-modified', 'expires'];

	for (const key of passthrough) {
		const value = upstream.headers.get(key);
		if (value) headers.set(key, value);
	}

	if (upstream.ok && !headers.has('cache-control')) {
		headers.set('cache-control', 'public, max-age=31536000, immutable');
	}

	headers.set('x-content-type-options', 'nosniff');
	return headers;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = allowedCdnUrl(url.searchParams.get('url') ?? '');
	if (!target) {
		return new Response('URL effect tidak diperbolehkan', { status: 403 });
	}

	const upstream = await fetchAllowedCdn(fetch, target);

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: proxiedHeaders(upstream)
	});
};
