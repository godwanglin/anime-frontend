/**
 * Pre-fetch profile effect asset -> blob URL -> decoded image.
 *
 * Strategi fetch:
 * 1. Path lokal → fetch same-origin langsung.
 * 2. Absolute URL → coba direct fetch dulu (paling cepat, tanpa hop proxy).
 *    Kalau CDN kirim CORS header, sukses → instant.
 * 3. Kalau direct fetch gagal (CORS/network) DAN CDN ada di allowlist proxy
 *    server, fallback ke proxy `/decorations-effect?url=...`.
 *
 * Origin yang sudah ketauan blokir CORS dicatat per-sesi supaya request
 * berikutnya ke origin itu langsung skip step 2 (gak buang round-trip).
 */
const ALLOWED_EFFECT_CDN_ORIGIN = 'https://cdn-static.weebinhub.com';
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const corsBlockedOrigins = new Set<string>();

const FETCH_OPTS: RequestInit = {
	credentials: 'same-origin',
	cache: 'force-cache'
};

function isAbsoluteUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

function safeOrigin(src: string): string | null {
	try {
		return new URL(src).origin;
	} catch {
		return null;
	}
}

function isAllowedEffectCdn(src: string) {
	return safeOrigin(src) === ALLOWED_EFFECT_CDN_ORIGIN;
}

function proxiedEffectUrl(src: string) {
	if (!isAbsoluteUrl(src)) return src;
	if (!isAllowedEffectCdn(src)) {
		throw new Error('Effect CDN tidak diperbolehkan');
	}
	return `/decorations-effect?url=${encodeURIComponent(src)}`;
}

/**
 * URL untuk `<link rel="preload">`. Pakai URL asli supaya browser fetch
 * langsung dari CDN — paling cepat. Kalau CDN gak kirim CORS header, link
 * preload gagal silently, JS fetch nanti otomatis fallback ke proxy.
 */
export function resolveEffectFetchUrl(src: string | null | undefined): string | null {
	if (!src) return null;
	if (!isAbsoluteUrl(src)) return src;
	return src;
}

async function fetchEffect(src: string): Promise<Response> {
	if (!isAbsoluteUrl(src)) {
		return fetch(src, FETCH_OPTS);
	}

	const origin = safeOrigin(src);

	// Skip direct kalau origin ini sudah ketauan blokir CORS di sesi ini.
	if (origin && !corsBlockedOrigins.has(origin)) {
		try {
			const direct = await fetch(src, { ...FETCH_OPTS, mode: 'cors' });
			if (direct.ok) return direct;
			// Status non-OK dari CDN: coba proxy sebagai fallback.
		} catch {
			// Network / CORS error — tandai origin & jatuh ke proxy.
			if (origin) corsBlockedOrigins.add(origin);
		}
	}

	// Fallback: proxy server. Hanya untuk CDN yang di-allowlist.
	if (!isAllowedEffectCdn(src)) {
		throw new Error('Direct fetch gagal & CDN tidak ada di allowlist proxy');
	}
	return fetch(proxiedEffectUrl(src), FETCH_OPTS);
}

async function loadOne(src: string): Promise<string> {
	const cached = cache.get(src);
	if (cached) return cached;

	try {
		const response = await fetchEffect(src);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		// Force decode supaya frame pertama siap paint tanpa jitter.
		const img = new Image();
		img.decoding = 'async';
		img.src = url;
		try {
			await img.decode();
		} catch {
			// Decode bisa throw untuk APNG/WEBP di sebagian browser — itu OK,
			// blob tetap valid.
		}

		cache.set(src, url);
		return url;
	} catch (err) {
		console.warn('[effect-preloader] gagal preload effect', src, err);
		const fallback = isAbsoluteUrl(src) ? '' : src;
		cache.set(src, fallback);
		return fallback;
	}
}

export async function preloadEffect(src: string): Promise<string> {
	if (!src) return '';
	if (cache.has(src)) return cache.get(src)!;
	if (inflight.has(src)) return inflight.get(src)!;
	const promise = loadOne(src).finally(() => inflight.delete(src));
	inflight.set(src, promise);
	return await promise;
}

export async function preloadEffects(srcs: Array<string | null | undefined>) {
	const unique = Array.from(
		new Set(srcs.filter((src): src is string => typeof src === 'string' && src.length > 0))
	);
	const results = await Promise.allSettled(unique.map((src) => preloadEffect(src)));
	const map = new Map<string, string>();
	results.forEach((res, idx) => {
		const original = unique[idx];
		map.set(original, res.status === 'fulfilled' ? res.value : original);
	});
	return map;
}

export function getCachedEffect(src: string): string | null {
	return cache.get(src) ?? null;
}

export const assetLoader = async (assets: any[]) => {
	const effectsWithBlob = await Promise.all(
		(assets ?? [])
			.filter((effect) => effect?.src)
			.map(async (effect) => {
				const url = await preloadEffect(`${effect.src}?_t=${Date.now()}`);

				return {
					...effect,
					blob: url
				};
			})
	);
	return effectsWithBlob;
};

// -----------------------------
// PRELOAD V2
// -----------------------------

/**
 * Preload V2:
 * - key: identity logis (misal src tanpa bust)
 * - url: URL aktual (boleh ada query bust seperti ?_t=...)
 *
 * Cache & inflight disimpan per key supaya tidak bocor
 * gara-gara bust timestamp.
 */

type EffectKey = string;

const keyCache = new Map<EffectKey, string>();
const keyInflight = new Map<EffectKey, Promise<string>>();
const keyRefreshInflight = new Map<EffectKey, Promise<string>>();

/**
 * Normalisasi key logis dari src mentah.
 * Misal kamu ingin semua varian ?_t=... tetap dianggap satu efek.
 */
function effectKeyFromSrc(src: string): EffectKey {
	// Contoh sederhana: buang param _ dan _t jika ada
	try {
		const u = new URL(src, 'http://dummy.local');
		u.searchParams.delete('_');
		u.searchParams.delete('_t');
		return u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '');
	} catch {
		return src;
	}
}

/**
 * Preload gambar berdasarkan key logis dan URL aktual.
 * - key: string identitas (misal src original)
 * - url: URL yang benar-benar akan di-fetch (boleh dibust)
 */
export async function preloadEffectV2(key: string, url: string): Promise<string> {
	if (!url) return '';

	const k = effectKeyFromSrc(key);

	if (keyCache.has(k)) return keyCache.get(k)!;
	if (keyInflight.has(k)) return keyInflight.get(k)!;

	const promise = (async () => {
		const resolved = await loadOne(url);
		keyCache.set(k, resolved);
		return resolved;
	})().finally(() => {
		keyInflight.delete(k);
	});

	keyInflight.set(k, promise);
	return promise;
}

/**
 * Refresh cache V2 dengan URL aktual terbaru.
 *
 * Bedanya dengan preloadEffectV2:
 * - preloadEffectV2 return cache lama kalau key sudah ada.
 * - refreshEffectV2 tetap fetch `url`, lalu replace cache key dengan blob baru.
 *
 * Kalau refresh gagal, cache lama tetap dipertahankan supaya UI tidak flicker.
 */
export async function refreshEffectV2(key: string, url: string): Promise<string> {
	if (!url) return getCachedEffectV2(key) ?? '';

	const k = effectKeyFromSrc(key);
	const existing = keyCache.get(k) ?? '';

	if (keyRefreshInflight.has(k)) return keyRefreshInflight.get(k)!;

	const promise = (async () => {
		const resolved = await loadOne(url);
		if (resolved) {
			keyCache.set(k, resolved);
			return resolved;
		}
		return existing;
	})().finally(() => {
		keyRefreshInflight.delete(k);
	});

	keyRefreshInflight.set(k, promise);
	return promise;
}

/**
 * Ambil cached blob berdasarkan key logis.
 */
export function getCachedEffectV2(key: string): string | null {
	const k = effectKeyFromSrc(key);
	return keyCache.get(k) ?? null;
}

/**
 * Batch preload V2 untuk banyak efek.
 * assets: [{ id, src, ... }]
 */
export async function assetLoaderV2<T extends { src: string }>(
	assets: T[],
	options?: { bust?: boolean }
) {
	const { bust = false } = options ?? {};

	const effectsWithBlob = await Promise.all(
		(assets ?? [])
			.filter((effect) => effect?.src)
			.map(async (effect) => {
				const key = effect.src;
				const url = bust
					? `${effect.src}${effect.src.includes('?') ? '&' : '?'}_t=${Date.now()}`
					: effect.src;

				const blobUrl = bust ? await refreshEffectV2(key, url) : await preloadEffectV2(key, url);

				return {
					...effect,
					blob: blobUrl
				};
			})
	);

	return effectsWithBlob;
}
