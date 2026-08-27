import config from './config';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_REGEX = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeVideoId(input: string | null | undefined): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	if (YOUTUBE_ID_REGEX.test(trimmed)) return trimmed;
	const match = trimmed.match(YOUTUBE_URL_REGEX);
	return match ? match[1] : null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
	return !!extractYouTubeVideoId(url);
}

export function toNormalizedYouTubeUrl(input: string): string {
	const videoId = extractYouTubeVideoId(input);
	return videoId ? `https://www.youtube.com/watch?v=${videoId}` : input;
}

export function getYouTubePlaylistUrl(youtubeUrl: string): string {
	const targetUrl = toNormalizedYouTubeUrl(youtubeUrl);
	return `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/playlist?url=${encodeURIComponent(targetUrl)}`;
}

export function getYouTubeDirectUrl(youtubeUrl: string, quality?: number): string {
	const targetUrl = toNormalizedYouTubeUrl(youtubeUrl);
	const qualityQuery = quality ? `&quality=${quality}p` : '';
	return `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/direct.mp4?url=${encodeURIComponent(targetUrl)}${qualityQuery}`;
}

export function getYouTubeCaptionsUrl(youtubeUrl: string): string {
	const targetUrl = toNormalizedYouTubeUrl(youtubeUrl);
	return `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/captions?url=${encodeURIComponent(targetUrl)}`;
}
