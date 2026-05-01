import config from './config';

interface StreamSource {
	id: number;
	label: string;
	value: string;
	isPrimary?: boolean;
}

export interface FormattedStreamSource extends StreamSource {
	playerUrl: string;
	serverUrl: string;
}

/**
 * Ekstrak video ID dari URL ok.ru
 * Format: https://ok.ru/videoembed/13629764668082
 *         https://ok.ru/video/13629764668082
 */
function extractOkruId(url: string): string | null {
	const match = url.match(/ok\.ru\/video(?:embed)?\/(\d+)/);
	return match ? match[1] : null;
}

/**
 * Ekstrak video ID dari URL anichin.stream
 * Format: https://anichin.stream/?id=v76hi9o
 *         https://anichin.stream/hls/v76hi9o.m3u8
 */
function extractAnichinId(url: string): string | null {
	// Query param ?id=
	const qMatch = url.match(/[?&]id=([^&]+)/);
	if (qMatch) return qMatch[1];
	// Path /hls/{id}.m3u8
	const pMatch = url.match(/\/hls\/([^.]+)\.m3u8/);
	if (pMatch) return pMatch[1];
	return null;
}

/**
 * Ekstrak video ID dari URL Dailymotion
 * Format: https://geo.dailymotion.com/player/xid0t.html?video=k4kYxg8f...
 *         https://www.dailymotion.com/embed/video/k4kYxg8f...
 *         https://www.dailymotion.com/video/k4kYxg8f...
 */
function extractDmId(url: string): string | null {
	// geo player: ?video=ID
	const geoMatch = url.match(/[?&]video=([a-zA-Z0-9]+)/);
	if (geoMatch) return geoMatch[1];
	// embed / video path
	const pathMatch = url.match(/dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+)/);
	if (pathMatch) return pathMatch[1];
	return null;
}

/**
 * Ekstrak video ID dari URL rubyvidhub.com
 * Format: https://rubyvidhub.com/embed-p5bvc0j2d15u.html
 */
function extractRubyId(url: string): string | null {
	const match = url.match(/rubyvidhub\.com\/embed-([^.]+)\.html/);
	return match ? match[1] : null;
}

/**
 * Ekstrak video ID dari URL sbchill.com
 * Format: https://sbchill.com/e/iprjkhnlz0ue.html
 */
function extractSbchillId(url: string): string | null {
	const match = url.match(/sbchill\.com\/e\/([^.\/?#]+)(?:\.html)?/);
	return match ? match[1] : null;
}

/**
 * Format satu StreamSource → proxy URL string.
 * Return null jika provider tidak didukung.
 */
export function formatProxyUrl(
	source: StreamSource,
	baseUrl: string = config.API_BASE_URL
): string | null {
	const { value } = source;

	// ── anichin.stream ──────────────────────────────────────────────────────────

	// ── ok.ru ───────────────────────────────────────────────────────────────────
	if (value.includes('ok.ru')) {
		const id = extractOkruId(value);
		if (!id) return null;
		return `${baseUrl}/api/video-stream/okru-stream/playlist/${id}`;
	}
	if (value.includes('anichin.stream')) {
		const id = extractAnichinId(value);
		if (!id) return null;
		return `${baseUrl}/api/video-stream/ac-stream/playlist/${id}`;
	}

	// ── Dailymotion ─────────────────────────────────────────────────────────────
	if (value.includes('dailymotion.com')) {
		const id = extractDmId(value);
		if (!id) return null;
		return `${baseUrl}/api/video-stream/dm-stream/playlist?v=${id}`;
	}

	// ── rubyvidhub.com ──────────────────────────────────────────────────────────
	if (value.includes('rubyvidhub.com')) {
		const id = extractRubyId(value);
		if (!id) return null;
		return `${baseUrl}/api/video-stream/ruby-stream/playlist/${id}`;
	}

	// ── sbchill.com ─────────────────────────────────────────────────────────────
	if (value.includes('sbchill.com')) {
		const id = extractSbchillId(value);
		if (!id) return null;
		return `${baseUrl}/api/video-stream/okru-stream/playlist/${id}?host=sbchill.com`;
	}

	if (/\.m3u8(?:$|[?#])/.test(value)) {
		return value;
	}

	// Provider tidak didukung (Rumble, short.icu, dll.)
	return null;
}

/**
 * Format array StreamSource → array proxy URL string.
 * Otomatis skip provider yang tidak didukung.
 *
 * @param sources  - Array objek { id, label, value }
 * @param baseUrl  - Base URL server proxy (default: http://localhost:3000)
 * @returns        - Array string URL proxy yang siap dipakai
 */
export function formatProxyUrls(
	sources: StreamSource[],
	baseUrl: string = config.API_BASE_URL
): string[] {
	return formatProxySources(sources, baseUrl).map((source) => source.playerUrl);
}

export function formatProxySources(
	sources: StreamSource[],
	baseUrl: string = config.API_BASE_URL
): FormattedStreamSource[] {
	const sorted = [...sources].sort((a, b) => {
		const aPrimary = a.isPrimary ? 1 : 0;
		const bPrimary = b.isPrimary ? 1 : 0;
		if (aPrimary !== bPrimary) return bPrimary - aPrimary;

		const aOk = a.value.includes('ok.ru') ? 1 : 0;
		const bOk = b.value.includes('ok.ru') ? 1 : 0;
		return bOk - aOk; // ok.ru di atas
	});

	return sorted.flatMap((source) => {
		const playerUrl = formatProxyUrl(source, baseUrl);
		if (!playerUrl) return [];
		return [{ ...source, playerUrl, serverUrl: source.value }];
	});
}
