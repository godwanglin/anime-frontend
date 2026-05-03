import config from './config';

export function isYouTubeUrl(url: string): boolean {
	return /(?:youtube\.com\/watch|youtu\.be\/)/.test(url);
}

export function getYouTubePlaylistUrl(youtubeUrl: string): string {
	return `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/playlist?url=${encodeURIComponent(youtubeUrl)}`;
}

export function getYouTubeCaptionsUrl(youtubeUrl: string): string {
	return `${config.API_BASE_URL}/api/video-stream/ydwn-proxy/captions?url=${encodeURIComponent(youtubeUrl)}`;
}
