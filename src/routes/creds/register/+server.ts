import config from '$lib/config';

export const POST = async ({ request }: { request: Request }) => {
	const baseUrl = config.API_BASE_URL;
	const { email, password, username } = await request.json();
	const response = await fetch(`${baseUrl}/api/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		// credentials: 'include',
		body: JSON.stringify({ email, password, username })
	});
	// if (!response.ok) {
	// 	const errorData = await response.json();
	// 	return new Response(await response.json(), {
	// 		status: response.status
	// 	});
	// }
	const data = await response.json();
	// console.log(data);

	// set cookie to store access token
	return new Response(JSON.stringify(data), {
		status: response.ok ? 200 : response.status,
		headers: {
			'Content-Type': 'application/json'
		}
	});
};
