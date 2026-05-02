import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type ApiResponse<T = unknown> = {
	data?: T;
};

export const load: PageLoad = async ({ fetch }) => {
	const [genresRes, popularRes] = await Promise.all([
		cachedApiJson<ApiResponse>(fetch, `${config.API_BASE_URL}/api/anime/genres`, API_CACHE_TTL.oneDay),
		cachedApiJson<ApiResponse>(
			fetch,
			`${config.API_BASE_URL}/api/anime/popular?limit=6`,
			API_CACHE_TTL.thirtyMinutes
		)
	]);

	return {
		genres: genresRes.ok ? (genresRes.data?.data ?? []) : [],
		popular: popularRes.ok ? (popularRes.data?.data ?? []) : []
	};
};
