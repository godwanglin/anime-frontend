import config from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`${config.API_BASE_URL}/api/anime/${params.slug}`);
	if (!res.ok) throw new Error('Anime not found');
	const json = await res.json();
	return { anime: json.data };
};
