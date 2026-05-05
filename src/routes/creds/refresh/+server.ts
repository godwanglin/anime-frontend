import { dev } from '$app/environment';
import config from '$lib/config';
import type { Cookies } from '@sveltejs/kit';

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

function setAuthCookie(cookies: Cookies, name: 'accessToken' | 'refreshToken', value: string, maxAge: number) {
	cookies.set(name, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge
	});
}

const handleRefresh = async ({ cookies }: { cookies: Cookies }) => {
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
		if (response.status === 401 || response.status === 403) {
			cookies.delete('accessToken', { path: '/' });
			cookies.delete('refreshToken', { path: '/' });
		}
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

	if (data.accessToken) {
		setAuthCookie(cookies, 'accessToken', data.accessToken, ACCESS_TOKEN_MAX_AGE);
	}

	if (rotated) {
		setAuthCookie(cookies, 'refreshToken', rotated, REFRESH_TOKEN_MAX_AGE);
	}

	return new Response(JSON.stringify({ ...payload, data: rest }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

export const GET = handleRefresh;
export const POST = handleRefresh;
