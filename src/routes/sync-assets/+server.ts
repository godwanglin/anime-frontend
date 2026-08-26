import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

function apiBaseUrl() {
	return (env.PUBLIC_API_BASE_URL || 'https://weebinhub.com').replace(/\/+$/, '');
}

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204 });
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = await request.text();
	const response = await fetch(`${apiBaseUrl()}/api/sync-assets`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body
	});

	return new Response(null, { status: response.status });
};
