import { env } from '$env/dynamic/public';
import config from '$lib/config';
import type { RequestHandler } from './$types';

const LEGACY_IMAGE_HOST = 'cdn-static.weebin.site';

function apiBaseUrl() {
	return (env.PUBLIC_API_BASE_URL || config.API_BASE_URL || 'https://weebinhub.com').replace(/\/+$/, '');
}

function decodeHex(hex: string) {
	if (!/^[a-fA-F0-9]+$/.test(hex) || hex.length % 2 !== 0) return '';
	try {
		const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
		return new TextDecoder().decode(bytes);
	} catch {
		return '';
	}
}

function toHex(value: string) {
	return Array.from(new TextEncoder().encode(value))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

function normalizeAssetUrl(rawUrlHex: string) {
	const decoded = decodeHex(rawUrlHex);
	if (!decoded) return rawUrlHex;

	try {
		const parsed = new URL(decoded);
		if (parsed.hostname !== LEGACY_IMAGE_HOST) return rawUrlHex;
		const cdn = config.IMAGE_CDN.replace(/\/+$/, '');
		return toHex(`${cdn}${parsed.pathname}${parsed.search}${parsed.hash}`);
	} catch {
		return rawUrlHex;
	}
}

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204 });
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	const payload = await request.json();
	const assets = Array.isArray(payload?.assets)
		? payload.assets.map((asset: { url?: string }) => ({
				...asset,
				...(asset.url ? { url: normalizeAssetUrl(asset.url) } : {})
			}))
		: [];
	const response = await fetch(`${apiBaseUrl()}/api/sync-assets`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ assets })
	});

	return new Response(null, { status: response.status });
};
