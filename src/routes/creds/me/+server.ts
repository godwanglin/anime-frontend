import config from '$lib/config';

export const GET = async ({ request }) => {
	const baseUrl = config.API_BASE_URL;
	const authorization = request.headers.get('authorization') ?? '';

	const response = await fetch(`${baseUrl}/api/auth/me`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authorization
		}
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

export const PUT = async ({ request }) => {
	const baseUrl = config.API_BASE_URL;
	const authorization = request.headers.get('authorization') ?? '';

	const response = await fetch(`${baseUrl}/api/auth/me`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authorization
		},
		body: await request.text()
	});

	const data = await response.json();

	return new Response(JSON.stringify(data), {
		status: response.ok ? 200 : response.status,
		headers: { 'Content-Type': 'application/json' }
	});
};
