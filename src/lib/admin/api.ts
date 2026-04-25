import { auth } from '$lib/stores/auth.svelte';

type Envelope<T> = {
	data: T;
	meta?: Record<string, unknown>;
	message?: string | null;
};

export async function adminApi<T>(path: string, init: RequestInit = {}, retry = true) {
	if (!auth.accessToken) await auth.refreshToken();

	let response = await auth.authFetch(`/api/admin${path}`, init);

	if (response.status === 403 && retry) {
		await auth.refreshToken();
		response = await auth.authFetch(`/api/admin${path}`, init, false);
	}

	const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

	if (!response.ok) {
		throw new Error(payload?.message ?? 'Request admin gagal');
	}

	return {
		data: (payload?.data ?? payload) as T,
		meta: payload?.meta ?? {}
	};
}

export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined || value === '') continue;
		search.set(key, String(value));
	}
	const query = search.toString();
	return query ? `?${query}` : '';
}
