import config from '$lib/config';
import type { PageServerLoad } from './$types';

type Episode = {
	id: number;
	slug: string;
	number: number;
	title: string;
	sub?: string;
	date?: string;
};

type Anime = {
	id: number;
	slug: string;
	title: string;
	thumbnail?: string;
	bigCover?: string;
	episodes?: Episode[];
};

type EpisodeDetail = Record<string, unknown> & {
	anime?: Anime;
	episode?: Episode;
};

function pickEpisodePayload(payload: unknown) {
	if (!payload || typeof payload !== 'object') return null;
	const body = payload as Record<string, unknown>;
	return (body.data ?? body) as EpisodeDetail;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	const episodeUrl = `${config.API_BASE_URL}/api/anime/${params.slug}/${params.epslug}`;
	const episodeRes = await fetch(episodeUrl);

	if (episodeRes.ok) {
		const episodeJson = await episodeRes.json();
		const detail = pickEpisodePayload(episodeJson);

		// console.log(episodeJson);

		return {
			anime: detail?.anime ?? null,
			episode: detail?.episode ?? detail ?? null,
			episodeDetail: detail,
			apiUrl: episodeUrl,
			params,
			error: null
		};
	}

	const animeUrl = `${config.API_BASE_URL}/api/anime/${params.slug}`;
	const animeRes = await fetch(animeUrl);

	if (!animeRes.ok) {
		return {
			anime: null,
			episode: null,
			episodeDetail: null,
			apiUrl: episodeUrl,
			params,
			error: `Episode API returned ${episodeRes.status}, and anime fallback returned ${animeRes.status}.`
		};
	}

	const animeJson = await animeRes.json();
	const anime = (animeJson.data ?? animeJson) as Anime;
	const episode = anime.episodes?.find((item) => item.slug === params.epslug) ?? null;

	return {
		anime,
		episode,
		episodeDetail: null,
		apiUrl: episodeUrl,
		params,
		error: episode
			? `Episode detail endpoint returned ${episodeRes.status}; using anime detail fallback.`
			: `Episode detail endpoint returned ${episodeRes.status}; episode was not found in anime detail.`
	};
};
