import config from '$lib/config';

const LEGACY_IMAGE_HOST = 'cdn-static.weebin.site';

export function imageUrl(value: string | null | undefined) {
	if (!value) return value ?? '';

	const trimmed = value.trim();
	if (!trimmed) return '';

	try {
		const url = new URL(trimmed);
		if (url.hostname === LEGACY_IMAGE_HOST) {
			return `${config.IMAGE_CDN.replace(/\/+$/, '')}${url.pathname}${url.search}${url.hash}`;
		}
		return trimmed;
	} catch {
		return `${config.IMAGE_CDN.replace(/\/+$/, '')}/${trimmed.replace(/^\/+/, '')}`;
	}
}
