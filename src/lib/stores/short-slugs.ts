const KEY = 'weebin_short_slugs';

function load(): Set<string> {
	if (typeof localStorage === 'undefined') return new Set();
	try {
		const raw = localStorage.getItem(KEY);
		return new Set(raw ? (JSON.parse(raw) as string[]) : []);
	} catch {
		return new Set();
	}
}

function save(slugs: Set<string>) {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify([...slugs]));
	} catch {}
}

export function markShortSlug(animeSlug: string) {
	const slugs = load();
	if (slugs.has(animeSlug)) return;
	slugs.add(animeSlug);
	save(slugs);
}

export function isShortSlug(animeSlug: string): boolean {
	return load().has(animeSlug);
}
