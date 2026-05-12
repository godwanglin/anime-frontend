import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type ApiResponse<T = unknown> = {
	data?: T;
	meta?: Record<string, unknown> | null;
};

export const load: PageLoad = async ({ fetch }) => {
	const [popularRes, animesRes, episodesRes] = await Promise.all([
		cachedApiJson<ApiResponse>(
			fetch,
			`${config.API_BASE_URL}/api/anime/popular?type=short&limit=10`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse>(
			fetch,
			`${config.API_BASE_URL}/api/anime?type=Short&limit=20&sortBy=updatedAt&order=desc&page=1`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse>(
			fetch,
			`${config.API_BASE_URL}/api/episodes/latest?type=Short&limit=5`,
			API_CACHE_TTL.thirtyMinutes
		)
	]);

	return {
		popular: popularRes.ok ? (popularRes.data?.data ?? []) : [],
		animes: animesRes.ok ? (animesRes.data?.data ?? []) : [],
		episodes: episodesRes.ok ? (episodesRes.data?.data ?? []) : []
	};
};
