import type { FormattedStreamSource } from './format-proxy-urls';
import config from './config';

export type StudioSubtitle = {
	id?: number;
	episodeId?: number;
	serverUrl: string;
	language: string;
	label: string;
	fileUrl: string;
	format?: 'vtt' | 'srt';
	createdAt?: string;
	updatedAt?: string;
};

export type PlayerSubtitle = {
	label: string;
	lang: string;
	src: string;
};

type StudioSubtitleTrack = {
	id?: number;
	episodeId?: number;
	serverUrl: string;
	language: string;
	label: string;
};

function asArray(value: unknown): StudioSubtitle[] {
	return Array.isArray(value) ? (value as StudioSubtitle[]) : [];
}

export function extractEpisodeSubtitles(detail: Record<string, unknown> | null | undefined) {
	if (!detail) return [];
	const legacy = asArray(
		detail.subtitles ?? (detail.episode as Record<string, unknown> | undefined)?.subtitles
	);
	const tracks = (
		(detail.subtitleTracks ??
			(detail.episode as Record<string, unknown> | undefined)?.subtitleTracks ??
			[]) as StudioSubtitleTrack[]
	)
		.filter((track) => track.episodeId && track.serverUrl && track.language)
		.map((track) => ({
			id: track.id,
			episodeId: track.episodeId,
			serverUrl: track.serverUrl,
			language: track.language,
			label: track.label,
			format: 'vtt' as const,
			fileUrl: `${config.API_BASE_URL}/api/subtitle/${track.episodeId}/${encodeURIComponent(track.serverUrl)}/${track.language}.vtt`
		}));

	return [...tracks, ...legacy];
}

export function subtitleToTrack(subtitle: StudioSubtitle): PlayerSubtitle | null {
	if (!subtitle.fileUrl || !subtitle.language) return null;
	return {
		label: subtitle.label || subtitle.language.toUpperCase(),
		lang: subtitle.language,
		src: subtitle.fileUrl
	};
}

export function groupSubtitlesForPlayer(
	sources: FormattedStreamSource[],
	subtitles: StudioSubtitle[]
) {
	const result: Record<string, PlayerSubtitle[]> = {};

	for (const source of sources) {
		const tracks = subtitles
			.filter((subtitle) => subtitle.serverUrl === source.serverUrl)
			.map(subtitleToTrack)
			.filter((track): track is PlayerSubtitle => Boolean(track));

		if (tracks.length) {
			result[source.playerUrl] = tracks;
			result[source.serverUrl] = tracks;
		}
	}

	return result;
}

export function subtitlesForServer(subtitles: StudioSubtitle[], serverUrl: string) {
	return subtitles.filter((subtitle) => subtitle.serverUrl === serverUrl);
}
