/**
 * Pre-fetch profile effect asset → blob URL → decoded image.
 *
 * Discord profile effect asset bisa lambat di-fetch & di-decode (~beberapa MB
 * APNG/WEBP). Untuk store kita prefetch sekaligus decode di muka supaya saat
 * user scroll grid effect, `<img>` udah siap paint instant — tidak ada decode
 * jitter yang bikin frame jatuh dan animasi tampak "patah-patah".
 *
 * Strategi:
 * 1. fetch(src) → blob (bypass Image.crossOrigin issue, juga kasih kontrol
 *    progress kalau dibutuhkan)
 * 2. createObjectURL(blob) → URL lokal yang dijamin tersedia synchronously
 * 3. new Image(); img.decode() → Promise resolve setelah decoder selesai
 * 4. Return blob URL — caller pakai langsung di `<img src>` tanpa fetch ulang
 *
 * Kalau salah satu step gagal (CORS, network, dll), kita fallback ke src
 * original — bukan masalah fatal, cuma effect-nya fetch saat render.
 */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function isAbsoluteUrl(url: string) {
	return /^https?:\/\//i.test(url);
}

async function loadOne(src: string): Promise<string> {
	const cached = cache.get(src);
	if (cached) return cached;

	try {
		// Discord CDN melayani CORS, jadi fetch + blob aman. Untuk path lokal
		// (mis. /frame-border/...) juga aman karena same-origin.
		const response = await fetch(src, {
			mode: isAbsoluteUrl(src) ? 'cors' : 'same-origin',
			credentials: 'omit',
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
		// Fallback: fetch gagal (CORS, offline, dll). Pakai src apa adanya.
		console.warn('[effect-preloader] fallback to direct src', src, err);
		cache.set(src, src);
		return src;
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
