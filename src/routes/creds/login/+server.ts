import config from '$lib/config';

export const POST = async ({ request }: { request: Request }) => {
	const baseUrl = config.API_BASE_URL;
	const { email, password } = await request.json();
	const response = await fetch(`${baseUrl}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ email, password })
	});
	if (!response.ok) {
		const errorData = await response.json();
		return new Response(JSON.stringify({ error: errorData.message || 'Login failed' }), {
			status: response.status
		});
	}
	const data = await response.json();
	// console.log(data);

	const { accessToken } = data.data;
	// set cookie to store access token
	const cookie = `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Secure`;
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: {
			'Set-Cookie': cookie,
			'Content-Type': 'application/json'
		}
	});
};
