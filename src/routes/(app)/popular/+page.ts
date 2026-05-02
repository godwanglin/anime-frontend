import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type ApiResponse<T = unknown> = {
	data?: T;
	meta?: Record<string, unknown> | null;
};

export const load: PageLoad = async ({ fetch, url }) => {
	const limit = url.searchParams.get('limit') ?? '24';
	const res = await cachedApiJson<ApiResponse>(
		fetch,
		`${config.API_BASE_URL}/api/anime/popular?limit=${limit}`,
		API_CACHE_TTL.thirtyMinutes
	);

	return {
		animes: res.ok ? (res.data?.data ?? []) : [],
		meta: res.ok ? (res.data?.meta ?? res.meta ?? null) : null,
		limit: Number(limit) || 24
	};
};
