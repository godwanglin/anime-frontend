import config from '$lib/config';
import type { Cookies } from '@sveltejs/kit';

export const POST = async ({ cookies }: { cookies: Cookies }) => {
	const baseUrl = config.API_BASE_URL;
	const refreshToken = cookies.get('refreshToken');

	cookies.delete('refreshToken', { path: '/' });
	cookies.delete('accessToken', { path: '/' });

	if (refreshToken) {
		await fetch(`${baseUrl}/api/auth/logout`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				cookie: `refreshToken=${refreshToken}`
			}
		}).catch(() => null);
	}

	return new Response(null, { status: 200 });
};
