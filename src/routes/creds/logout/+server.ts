export const POST = async ({ cookies }) => {
	// delete the access token cookie
	cookies.delete('accessToken', { path: '/' });

	await fetch('/creds/logout', {
		method: 'POST',
		credentials: 'include'
	}).catch(() => null);
	return new Response(null, {
		status: 200
	});
};
