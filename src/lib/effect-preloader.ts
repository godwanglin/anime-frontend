/**
 * Pre-fetch profile effect asset -> blob URL -> decoded image.
 *
 * Absolute effect URL harus lewat server proxy khusus cdn-static.weebin.site
 * supaya browser tidak kena CORS dan proxy tidak bisa dipakai untuk host lain.
 * Path lokal tetap di-fetch same-origin.
 */
const ALLOWED_EFFECT_CDN_ORIGIN = 'https://cdn-static.weebin.site';
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function isAbsoluteUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

function isAllowedEffectCdn(src: string) {
	try {
		return new URL(src).origin === ALLOWED_EFFECT_CDN_ORIGIN;
	} catch {
		return false;
	}
}

function proxiedEffectUrl(src: string) {
	if (!isAbsoluteUrl(src)) return src;
	if (!isAllowedEffectCdn(src)) {
		throw new Error('Effect CDN tidak diperbolehkan');
	}
	// return src;
	return `/decorations-effect?url=${encodeURIComponent(src)}`;
}

async function loadOne(src: string): Promise<string> {
	const cached = cache.get(src);
	if (cached) return cached;

	try {
		const response = await fetch(proxiedEffectUrl(src), {
			// mode: 'same-origin',
			credentials: 'same-origin',
			cache: 'force-cache'
		});
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
	return promise;
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
