import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type ApiResponse<T = unknown> = {
	data?: T;
	meta?: Record<string, unknown> | null;
};

function appendIfPresent(params: URLSearchParams, key: string, value: string | null) {
	if (value && value.trim()) params.set(key, value.trim());
}

export const load: PageLoad = async ({ fetch, url }) => {
	const page = url.searchParams.get('page') ?? '1';
	const limit = url.searchParams.get('limit') ?? '18';
	const sortBy = url.searchParams.get('sortBy') ?? url.searchParams.get('sort') ?? 'updatedAt';
	const order = url.searchParams.get('order') ?? 'desc';
	const q = url.searchParams.get('q');
	const genre = url.searchParams.get('genre');
	const tag = url.searchParams.get('tag');
	const status = url.searchParams.get('status');
	const type = url.searchParams.get('type');
	const studio = url.searchParams.get('studio');

	const animeParams = new URLSearchParams({ page, limit, sortBy, order });
	appendIfPresent(animeParams, 'q', q);
	appendIfPresent(animeParams, 'genre', genre);
	appendIfPresent(animeParams, 'tag', tag);
	appendIfPresent(animeParams, 'status', status);
	appendIfPresent(animeParams, 'type', type);
	appendIfPresent(animeParams, 'studio', studio);

	const [animeRes, genresRes, tagsRes, studiosRes] = await Promise.all([
		fetch(`${config.API_BASE_URL}/api/anime?${animeParams}`),
		cachedApiJson<ApiResponse>(fetch, `${config.API_BASE_URL}/api/anime/genres`, API_CACHE_TTL.oneDay),
		fetch(`${config.API_BASE_URL}/api/anime/tags?limit=80`),
		fetch(`${config.API_BASE_URL}/api/anime/studios?limit=120`)
	]);

	const [animeJson, tagsJson, studiosJson] = await Promise.all([
		animeRes.json().catch(() => ({})),
		tagsRes.json().catch(() => ({})),
		studiosRes.json().catch(() => ({}))
	]);

	return {
		animes: animeRes.ok ? (animeJson.data ?? []) : [],
		meta: animeRes.ok ? (animeJson.meta ?? null) : null,
		genres: genresRes.ok ? (genresRes.data?.data ?? []) : [],
		tags: tagsRes.ok ? (tagsJson.data ?? []) : [],
		studios: studiosRes.ok ? (studiosJson.data ?? []) : [],
		filters: {
			q: q ?? '',
			genre: genre ?? '',
			tag: tag ?? '',
			status: status ?? '',
			type: type ?? '',
			studio: studio ?? '',
			sortBy,
			order,
			page: Number(page) || 1,
			limit: Number(limit) || 18
		}
	};
};
