export type ContentLabelInput = {
	type?: string | null;
	animeType?: string | null;
	totalEpisodes?: number | null;
	episodeCount?: number | null;
	episode?: number | string | null;
};

export function isMovieContent(item: ContentLabelInput) {
	const type = (item.type ?? item.animeType ?? '').trim().toLowerCase();
	const episodeCount = Number(item.episodeCount ?? item.totalEpisodes ?? 0);

	return type === 'movie' || type === 'film' || episodeCount === 1;
}

export function episodeBadgeLabel(item: ContentLabelInput) {
	if (isMovieContent(item)) return 'Movie';
	if (item.episode === undefined || item.episode === null || item.episode === '') return null;

	const episode = String(item.episode).trim();
	return episode.toLowerCase().startsWith('ep') ? episode : `Ep ${episode}`;
}
