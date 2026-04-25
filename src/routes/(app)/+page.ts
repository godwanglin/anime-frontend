import config from '$lib/config';

export const load = async (data) => {
	const [trendRequest, bannerRequest, epsReq, newRelReq, popularReq, genresReq] = await Promise.all(
		[
			fetch(`${config.API_BASE_URL}/api/anime/trending`),
			fetch(`${config.API_BASE_URL}/api/banners?sortBy=trending,updatedAt&limit=5`),
			fetch(`${config.API_BASE_URL}/api/episodes/latest`),
			fetch(`${config.API_BASE_URL}/api/anime/new-release`),
			fetch(`${config.API_BASE_URL}/api/anime/popular?limit=12`),
			fetch(`${config.API_BASE_URL}/api/anime/genres`)
		]
	);
	const [trendResponse, bannerResponse, epsRes, newRelRes, popularRes, genresRes] =
		await Promise.all([
			trendRequest.json(),
			bannerRequest.json(),
			epsReq.json(),
			newRelReq.json(),
			popularReq.json(),
			genresReq.json()
		]);

	const response = {
		trending: {
			weekly: []
		},
		banners: [],
		newEpisodes: [],
		newRelease: [],
		popular: [],
		genres: []
	};

	if (trendRequest.ok) response.trending.weekly = trendResponse.data;
	if (bannerRequest.ok) response.banners = bannerResponse.data;
	if (epsReq.ok) response.newEpisodes = epsRes.data;
	if (newRelReq.ok) response.newRelease = newRelRes.data;
	if (popularReq.ok) response.popular = popularRes.data;
	if (genresReq.ok) response.genres = genresRes.data;

	return response;
};
