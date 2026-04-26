import { dev } from '$app/environment';
import config from '$lib/config';
import type { Cookies } from '@sveltejs/kit';

export const POST = async ({
	request,
	cookies
}: {
	request: Request;
	cookies: Cookies;
}) => {
	const baseUrl = config.API_BASE_URL;
	const { email, password } = await request.json();

	const response = await fetch(`${baseUrl}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});

	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		return new Response(JSON.stringify({ error: payload?.message ?? 'Login failed' }), {
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = payload?.data ?? {};
	const { refreshToken, ...rest } = data as {
		refreshToken?: string;
		accessToken?: string;
		user?: unknown;
	};

	if (refreshToken) {
		cookies.set('refreshToken', refreshToken, {
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
