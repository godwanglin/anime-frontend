import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type ApiResponse<T = unknown> = {
	data?: T;
	meta?: Record<string, unknown> | null;
};

function normalizeLimit(value: string | null) {
	const parsed = Number(value ?? '48');
	if (!Number.isFinite(parsed)) return 48;
	return Math.min(96, Math.max(12, parsed));
}

export const load: PageLoad = async ({ fetch, url }) => {
	const limit = normalizeLimit(url.searchParams.get('limit'));
	const res = await cachedApiJson<ApiResponse>(
		fetch,
		`${config.API_BASE_URL}/api/episodes/latest?limit=${limit}`,
		API_CACHE_TTL.thirtyMinutes
	);

	return {
		episodes: res.ok ? (res.data?.data ?? []) : [],
		meta: res.ok ? (res.data?.meta ?? res.meta ?? null) : null,
		limit
	};
};
