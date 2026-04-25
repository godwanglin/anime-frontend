import config from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const limit = url.searchParams.get('limit') ?? '12';
	const res = await fetch(`${config.API_BASE_URL}/api/anime/random?limit=${limit}`);
	const json = await res.json().catch(() => ({}));

	return {
		animes: res.ok ? (json.data ?? []) : [],
		meta: res.ok ? (json.meta ?? null) : null,
		limit: Number(limit) || 12
	};
};
