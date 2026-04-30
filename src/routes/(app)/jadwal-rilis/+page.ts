import config from '$lib/config';
import type { PageLoad } from './$types';

function normalizeDays(value: string | null) {
	const parsed = Number(value ?? '7');
	if (!Number.isFinite(parsed)) return 7;
	return Math.min(30, Math.max(7, parsed));
}

function normalizeRange(value: string | null) {
	if (value === 'today' || value === 'week') return value;
	return 'rolling';
}

function normalizeStatus(value: string | null) {
	if (value === 'upcoming' || value === 'released' || value === 'delayed') return value;
	return 'all';
}

export const load: PageLoad = async ({ fetch, url }) => {
	const days = normalizeDays(url.searchParams.get('days'));
	const range = normalizeRange(url.searchParams.get('range'));
	const status = normalizeStatus(url.searchParams.get('status'));
	const params = new URLSearchParams({
		days: String(days),
		range,
		status,
		limit: '240'
	});
	const res = await fetch(`${config.API_BASE_URL}/api/episodes/schedule?${params.toString()}`);
	const json = await res.json().catch(() => ({}));

	return {
		days,
		range,
		status,
		groups: res.ok ? (json.data ?? []) : [],
		meta: res.ok ? (json.meta ?? null) : null,
		error: res.ok ? null : (json.message ?? 'Gagal memuat jadwal rilis')
	};
};
