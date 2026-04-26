import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import config from '$lib/config';

async function parse<T>(response: Response) {
	const payload = await response.json().catch(() => null);
	if (!response.ok) throw new Error(payload?.message ?? 'Unauthorized');
	return (payload?.data ?? payload) as T;
}

export async function load({ cookies, fetch }) {
	const refreshToken = cookies.get('refreshToken');
	if (!refreshToken) throw redirect(302, '/login?redirect=/admin');

	try {
		const refreshed = await fetch(`${config.API_BASE_URL}/api/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken })
		});
		const { accessToken, refreshToken: rotated } = await parse<{
			accessToken: string;
			refreshToken?: string;
		}>(refreshed);

		if (rotated) {
			cookies.set('refreshToken', rotated, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: !dev,
				maxAge: 60 * 60 * 24 * 7
			});
		}

		const me = await fetch(`${config.API_BASE_URL}/api/auth/me`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		const user = await parse<{ role?: string }>(me);
		if (user.role !== 'admin') throw redirect(302, '/');
		return { adminUser: user };
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error) throw error;
		cookies.delete('refreshToken', { path: '/' });
		throw redirect(302, '/login?redirect=/admin');
	}
}
