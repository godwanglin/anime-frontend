import config from '$lib/config';
import type { Cookies, RequestHandler } from '@sveltejs/kit';

function authHeaders(request: Request, cookies: Cookies) {
	const headers = new Headers({ 'Content-Type': 'application/json' });
	const authorization = request.headers.get('authorization');
	const accessToken = cookies.get('accessToken');
	const refreshToken = cookies.get('refreshToken');
	const cookieParts: string[] = [];

	if (authorization) headers.set('Authorization', authorization);
	if (accessToken) cookieParts.push(`accessToken=${accessToken}`);
	if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`);
	if (cookieParts.length) headers.set('Cookie', cookieParts.join('; '));

	return headers;
}

export const GET: RequestHandler = async ({ request, cookies }) => {
	const baseUrl = config.API_BASE_URL;

	const response = await fetch(`${baseUrl}/api/auth/me`, {
		method: 'GET',
		headers: authHeaders(request, cookies)
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		return new Response(JSON.stringify({ error: errorData.message || 'Unauthorized' }), {
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = await response.json();

	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

export const PUT: RequestHandler = async ({ request, cookies }) => {
	const baseUrl = config.API_BASE_URL;

	const response = await fetch(`${baseUrl}/api/auth/me`, {
		method: 'PUT',
		headers: authHeaders(request, cookies),
		body: await request.text()
	});

	const data = await response.json();

	return new Response(JSON.stringify(data), {
		status: response.ok ? 200 : response.status,
		headers: { 'Content-Type': 'application/json' }
	});
};
