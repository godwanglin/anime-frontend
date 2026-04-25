import config from '$lib/config';
import type { PageLoad } from './$types';

function normalizeLimit(value: string | null) {
	const parsed = Number(value ?? '48');
	if (!Number.isFinite(parsed)) return 48;
	return Math.min(96, Math.max(12, parsed));
}

export const load: PageLoad = async ({ fetch, url }) => {
	const limit = normalizeLimit(url.searchParams.get('limit'));
	const res = await fetch(`${config.API_BASE_URL}/api/episodes/latest?limit=${limit}`);
	const json = await res.json().catch(() => ({}));

	return {
		episodes: res.ok ? (json.data ?? []) : [],
		meta: res.ok ? (json.meta ?? null) : null,
		limit
	};
};
