import config from '$lib/config';

export const GET = async ({ request, cookies }) => {
	const baseUrl = config.API_BASE_URL;

	const response = await fetch(`${baseUrl}/api/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',

			Authorization: `Bearer ${cookies.get('accessToken') ?? ''}`
		},
		body: JSON.stringify({})
	});

	if (!response.ok) {
		const errorData = await response.json();
		return new Response(JSON.stringify({ error: errorData.message || 'Login failed' }), {
			status: response.status
		});
	}

	const data = await response.json();

	return new Response(JSON.stringify(data), {
		status: 200
	});
};
