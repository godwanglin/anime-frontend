import { dev } from '$app/environment';
import config from '$lib/config';
import type { Cookies } from '@sveltejs/kit';

export const GET = async ({ cookies }: { cookies: Cookies }) => {
	const baseUrl = config.API_BASE_URL;
	const refreshToken = cookies.get('refreshToken');

	if (!refreshToken) {
		return new Response(
			JSON.stringify({ message: 'Refresh token tidak ditemukan' }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const response = await fetch(`${baseUrl}/api/auth/refresh`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refreshToken })
	});

	const payload = await response.json().catch(() => ({}));

	if (!response.ok) {
		cookies.delete('refreshToken', { path: '/' });
		return new Response(JSON.stringify(payload), {
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = (payload?.data ?? {}) as {
		accessToken?: string;
		refreshToken?: string;
	};
	const { refreshToken: rotated, ...rest } = data;

	if (rotated) {
		cookies.set('refreshToken', rotated, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 7
		});
	}

	return new Response(JSON.stringify({ ...payload, data: rest }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
