import config from '$lib/config';
import { API_CACHE_TTL, cachedApiJson } from '$lib/browser-api-cache';
import type { PageLoad } from './$types';

type AnimeDetailResponse = {
	data?: any;
};

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await cachedApiJson<AnimeDetailResponse>(
		fetch,
		`${config.API_BASE_URL}/api/anime/${params.slug}`,
		API_CACHE_TTL.tenMinutes
	);
	if (!res.ok) throw new Error('Anime not found');
	const anime = res.data?.data;
	if (!anime) throw new Error('Anime not found');
	return { anime };
};
