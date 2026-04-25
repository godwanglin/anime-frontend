import { redirect } from '@sveltejs/kit';
import config from '$lib/config';

async function parse<T>(response: Response) {
	const payload = await response.json().catch(() => null);
	if (!response.ok) throw new Error(payload?.message ?? 'Unauthorized');
	return (payload?.data ?? payload) as T;
}

export async function load({ cookies, fetch }) {
	const refreshToken = cookies.get('accessToken');
	if (!refreshToken) throw redirect(302, '/login?redirect=/admin');

	try {
		const refreshed = await fetch(`${config.API_BASE_URL}/api/auth/refresh`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${refreshToken}` }
		});
		const { accessToken } = await parse<{ accessToken: string }>(refreshed);
		const me = await fetch(`${config.API_BASE_URL}/api/auth/me`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		const user = await parse<{ role?: string }>(me);
		if (user.role !== 'admin') throw redirect(302, '/');
		return { adminUser: user };
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error) throw error;
		throw redirect(302, '/login?redirect=/admin');
	}
}
