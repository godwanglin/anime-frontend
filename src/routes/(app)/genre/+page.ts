import config from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [genresRes, popularRes] = await Promise.all([
		fetch(`${config.API_BASE_URL}/api/anime/genres`),
		fetch(`${config.API_BASE_URL}/api/anime/popular?limit=6`)
	]);

	const [genresJson, popularJson] = await Promise.all([
		genresRes.json().catch(() => ({})),
		popularRes.json().catch(() => ({}))
	]);

	return {
		genres: genresRes.ok ? (genresJson.data ?? []) : [],
		popular: popularRes.ok ? (popularJson.data ?? []) : []
	};
};
