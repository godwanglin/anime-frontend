import config from './config';
import { normalizedQualityHeight } from './video-quality';

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

type RawQuality = {
	label: string;
	height: number;
	url: string;
};

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
 * Ekstrak video ID dari URL AC stream compatible host
 * Format: https://anichin.stream/?id=v76hi9o
 *         https://anichin.stream/hls/v76hi9o.m3u8
 *         https://vip69.mecdn.xyz/k.php?id=v76hi9o
 */
function extractAcStreamId(url: string): string | null {
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

function normalizeDirectVideoUrl(value: string): string | null {
	if (!/^https?:\/\//i.test(value)) return null;

	try {
		const parsed = new URL(value);
		const decodedHref = decodeURIComponent(parsed.href).toLowerCase();
		const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
		const contentType = (parsed.searchParams.get('r_type') ?? '').toLowerCase();
		const fileName = (parsed.searchParams.get('r_file') ?? '').toLowerCase();

		const isHls =
			decodedHref.includes('.m3u8') ||
			fileName.endsWith('.m3u8') ||
			contentType.includes('application/vnd.apple.mpegurl') ||
			contentType.includes('application/x-mpegurl');
		const isMp4 = decodedPath.endsWith('.mp4') || fileName.endsWith('.mp4');

		if (isHls || isMp4) return value;
	} catch {
		return null;
	}

	return null;
}

function shouldProxyDirectVideo(value: string) {
	try {
		const parsed = new URL(value);
		return parsed.hostname === 'storages.sokuja.id' || parsed.hostname.endsWith('.sokuja.id');
	} catch {
		return false;
	}
}

function encodeHex(value: string) {
	return Array.from(new TextEncoder().encode(value))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function parseQualityHeight(value: string) {
	const match = value.match(/(\d{3,4})\s*p?/i);
	if (!match) return 0;
	const height = Number.parseInt(match[1], 10);
	return Number.isFinite(height) ? normalizedQualityHeight(height) : 0;
}

function qualityResolution(height: number) {
	const widthByHeight: Record<number, number> = {
		1080: 1920,
		720: 1280,
		540: 960,
		480: 854,
		360: 640,
		240: 426,
		144: 256
	};
	return {
		width: widthByHeight[height] ?? Math.round((height * 16) / 9),
		height
	};
}

function qualityBandwidth(height: number) {
	const bitrateByHeight: Record<number, number> = {
		1080: 5_200_000,
		720: 2_800_000,
		540: 1_600_000,
		480: 1_200_000,
		360: 800_000,
		240: 500_000,
		144: 250_000
	};
	return bitrateByHeight[height] ?? Math.max(250_000, height * 2200);
}

function parseRawQualityText(value: string): RawQuality[] {
	const byHeight = new Map<number, RawQuality>();

	for (const rawLine of value.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		const match = line.match(/^(.+?)\s*:\s*(https?:\/\/.+)$/i);
		if (!match) continue;

		const label = match[1].trim().toUpperCase();
		const url = match[2].trim();
		const height = parseQualityHeight(label);
		if (!height || !normalizeDirectVideoUrl(url) || !/\.m3u8(?:$|[?#])/i.test(url)) continue;

		byHeight.set(height, { label: `${height}P`, height, url });
	}

	return Array.from(byHeight.values()).sort((a, b) => b.height - a.height);
}

function buildRawQualityMasterPlaylist(qualities: RawQuality[]) {
	const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
	for (const quality of qualities) {
		const resolution = qualityResolution(quality.height);
		lines.push(
			`#EXT-X-STREAM-INF:BANDWIDTH=${qualityBandwidth(quality.height)},RESOLUTION=${resolution.width}x${resolution.height},NAME="${quality.label}"`
		);
		lines.push(quality.url);
	}
	return `data:application/vnd.apple.mpegurl;charset=utf-8,${encodeURIComponent(
		lines.join('\n')
	)}`;
}

function formatRawQualitySource(source: StreamSource): FormattedStreamSource[] {
	const qualities = parseRawQualityText(source.value);
	if (!qualities.length) return [];

	return [
		{
			...source,
			label: source.label || 'ReelShort',
			playerUrl: buildRawQualityMasterPlaylist(qualities),
			serverUrl: source.value
		}
	];
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
	if (value.includes('anichin.stream') || value.includes('mecdn.xyz')) {
		const id = extractAcStreamId(value);
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

	const directVideoUrl = normalizeDirectVideoUrl(value);
	if (directVideoUrl) {
		if (shouldProxyDirectVideo(directVideoUrl)) {
			return `${baseUrl}/api/video-stream/skj/stream/${encodeHex(directVideoUrl)}.mp4`;
		}
		return directVideoUrl;
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
		const rawQualitySources = formatRawQualitySource(source);
		if (rawQualitySources.length) return rawQualitySources;

		const playerUrl = formatProxyUrl(source, baseUrl);
		if (!playerUrl) return [];
		return [{ ...source, playerUrl, serverUrl: source.value }];
	});
}
