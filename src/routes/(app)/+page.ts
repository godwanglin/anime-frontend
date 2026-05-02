import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';

type ApiResponse<T = unknown> = {
	data?: T;
	meta?: Record<string, unknown>;
};

type HomeResponse = {
	trending: {
		weekly: any[];
	};
	banners: any[];
	newEpisodes: any[];
	newRelease: any[];
	popular: any[];
	genres: any[];
};

async function loadLegacyHomeSections(fetcher: typeof fetch, response: HomeResponse) {
	const [trendRequest, bannerRequest, epsReq, newRelReq, popularReq, genresReq] = await Promise.all([
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/anime/trending`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/banners?sortBy=trending,updatedAt&limit=5`,
			API_CACHE_TTL.twelveHours
		),
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/episodes/latest`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/anime/new-release`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/anime/popular?limit=12`,
			API_CACHE_TTL.thirtyMinutes
		),
		cachedApiJson<ApiResponse<unknown[]>>(
			fetcher,
			`${config.API_BASE_URL}/api/anime/genres`,
			API_CACHE_TTL.oneDay
		)
	]);

	if (trendRequest.ok) response.trending.weekly = trendRequest.data?.data ?? [];
	if (bannerRequest.ok) response.banners = bannerRequest.data?.data ?? [];
	if (epsReq.ok) response.newEpisodes = epsReq.data?.data ?? [];
	if (newRelReq.ok) response.newRelease = newRelReq.data?.data ?? [];
	if (popularReq.ok) response.popular = popularReq.data?.data ?? [];
	if (genresReq.ok) response.genres = genresReq.data?.data ?? [];

	return response;
}

export const load = async ({ fetch }) => {
	const response: HomeResponse = {
		trending: {
			weekly: []
		},
		banners: [],
		newEpisodes: [],
		newRelease: [],
		popular: [],
		genres: []
	};

	try {
		const homeRequest = await cachedApiJson<ApiResponse<HomeResponse>>(
			fetch,
			`${config.API_BASE_URL}/api/home/sections`,
			API_CACHE_TTL.thirtyMinutes
		);

		if (homeRequest.ok && homeRequest.data?.data) {
			return {
				...response,
				...homeRequest.data.data,
				trending: {
					weekly: homeRequest.data.data.trending?.weekly ?? []
				}
			};
		}
	} catch {
		return loadLegacyHomeSections(fetch, response);
	}

	return loadLegacyHomeSections(fetch, response);
};
