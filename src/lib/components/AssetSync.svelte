<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import config from '$lib/config';

	const MAX_ASSETS = 100;
	const LEGACY_IMAGE_HOST = 'cdn-static.weebin.site';

	type AssetContext = 'anime' | 'episode';
	type SyncAsset = {
		url: string;
		context: AssetContext;
		id: string;
		field: 'thumbnail' | 'bigCover';
	};

	let mounted = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function toHex(value: string) {
		const bytes = new TextEncoder().encode(value);
		return Array.from(bytes)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	function normalizeSrc(src: string) {
		try {
			const resolved = new URL(src, window.location.href);
			if (resolved.hostname === LEGACY_IMAGE_HOST) {
				return `${config.IMAGE_CDN.replace(/\/+$/, '')}${resolved.pathname}${resolved.search}${resolved.hash}`;
			}
			return resolved.href;
		} catch {
			return '';
		}
	}

	function collectAssets() {
		const cdnPrefix = config.IMAGE_CDN.replace(/\/+$/, '');
		const seen = new Set<string>();
		const assets: SyncAsset[] = [];

		document.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
			const src = normalizeSrc(img.currentSrc || img.src || img.getAttribute('src') || '');
			if (!src || src.startsWith(cdnPrefix)) return;

			const marker = img.closest<HTMLElement>('[data-sync-asset-context][data-sync-asset-id]');
			const context = marker?.dataset.syncAssetContext;
			const id = marker?.dataset.syncAssetId;
			const field = marker?.dataset.syncAssetField ?? 'thumbnail';

			if (
				(context !== 'anime' && context !== 'episode') ||
				(field !== 'thumbnail' && field !== 'bigCover') ||
				!id
			)
				return;

			const key = `${context}:${id}:${field}:${src}`;
			if (seen.has(key)) return;

			seen.add(key);
			assets.push({ url: toHex(src), context, id, field });
		});

		return assets.slice(0, MAX_ASSETS);
	}

	function runSync() {
		const assets = collectAssets();
		if (assets.length === 0) return;

		fetch('/sync-assets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ assets }),
			keepalive: true
		}).catch(() => null);
	}

	function scheduleSync() {
		clearTimeout(timer);
		timer = setTimeout(runSync, 1000);
	}

	onMount(() => {
		mounted = true;
		scheduleSync();
		return () => {
			mounted = false;
			clearTimeout(timer);
		};
	});

	$effect(() => {
		const routeKey = $page.url.href;
		if (routeKey && mounted) scheduleSync();
	});
</script>
