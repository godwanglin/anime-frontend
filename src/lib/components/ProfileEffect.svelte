<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { getCachedEffectV2, preloadEffectV2, refreshEffectV2 } from '$lib/effect-preloader';

	let {
		src,
		loop = false,
		duration = 10000,
		class: _class = '',
		onFinishLoaded,
		blob
	}: {
		src: string;
		blob?: string;
		loop?: boolean;
		duration?: number;
		class?: string;
		onFinishLoaded?: (img: HTMLImageElement) => void;
	} = $props();

	let resolvedSrc = $state<string>('');
	let iteration = $state(0);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let precacheTimeoutId: ReturnType<typeof setTimeout> | null = null;
	let renderVersion = 0;

	// Token bertambah tiap kali deps berubah / unmount, dipakai untuk
	// invalidate async callback yang sudah basi tanpa harus mutate $state
	// dari luar tracking scope.
	let runToken = 0;
	// Buffer non-state untuk URL iterasi berikutnya. Tidak perlu reaktif —
	// hanya dibaca imperatively saat timer fire.
	let nextBlobUrl = '';

	function clearTimer() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function clearPrecacheTimer() {
		if (precacheTimeoutId !== null) {
			clearTimeout(precacheTimeoutId);
			precacheTimeoutId = null;
		}
	}

	function bust(url: string) {
		return `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
	}

	function advanceIteration() {
		renderVersion += 1;
		iteration = renderVersion;
	}

	function precacheLatest(currentSrc: string) {
		if (!currentSrc) return;
		void refreshEffectV2(currentSrc, bust(currentSrc));
	}

	function scheduleMountPrecache(currentSrc: string) {
		clearPrecacheTimer();
		precacheTimeoutId = setTimeout(() => {
			precacheTimeoutId = null;
			precacheLatest(currentSrc);
		}, 500);
	}

	// Fire-and-forget: warming the V2 cache for the next loop iteration so that
	// when the timer fires we already have the blob URL ready.
	function warmNext(currentSrc: string, token: number) {
		const nextUrl = bust(currentSrc);
		refreshEffectV2(currentSrc, nextUrl)
			.then((url) => {
				if (token !== runToken) return;
				nextBlobUrl = url;
			})
			.catch(() => {
				// stale or fetch failed — biarkan, fallback di scheduleNext
			});
	}

	function scheduleNext(currentSrc: string, currentDuration: number, token: number) {
		clearTimer();
		timeoutId = setTimeout(() => {
			if (token !== runToken) return;
			const ready = nextBlobUrl;
			nextBlobUrl = '';
			if (ready) {
				resolvedSrc = ready;
				advanceIteration();
				warmNext(currentSrc, token);
				return;
			}
			// Belum siap (CDN lambat) — load on the fly, lalu lanjutkan.
			refreshEffectV2(currentSrc, bust(currentSrc))
				.then((url) => {
					if (token !== runToken) return;
					resolvedSrc = url;
					advanceIteration();
					warmNext(currentSrc, token);
				})
				.catch(() => {});
		}, currentDuration);
	}

	function handleLoad(event: Event) {
		if (loop) scheduleNext(src, duration, runToken);
		onFinishLoaded?.(event.currentTarget as HTMLImageElement);
	}

	function handleVisibility() {
		if (document.hidden) {
			clearTimer();
		} else if (loop && timeoutId === null && resolvedSrc) {
			scheduleNext(src, duration, runToken);
		}
	}

	// Re-init setiap kali src / loop / blob berubah. Mutasi state dilakukan
	// SECARA SINKRON di dalam effect body kalau cache hit; kalau miss, mutasi
	// dilakukan di .then() dengan token guard untuk invalidasi.
	$effect(() => {
		const currentSrc = src;
		const currentBlob = blob;
		const currentLoop = loop;

		runToken += 1;
		const token = runToken;
		clearTimer();
		nextBlobUrl = '';

		const cached = currentBlob ?? getCachedEffectV2(currentSrc);
		if (cached) {
			resolvedSrc = cached;
			advanceIteration();
			if (currentLoop) warmNext(currentSrc, token);
		} else {
			resolvedSrc = '';
			preloadEffectV2(currentSrc, currentSrc)
				.then((url) => {
					if (token !== runToken) return;
					resolvedSrc = url;
					advanceIteration();
					if (currentLoop) warmNext(currentSrc, token);
				})
				.catch(() => {});
		}

		return () => {
			clearTimer();
		};
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	});

	onMount(() => {
		scheduleMountPrecache(src);
		return clearPrecacheTimer;
	});

	onDestroy(() => {
		runToken += 1;
		clearTimer();
		clearPrecacheTimer();
	});
</script>

<div class="effect-layer {_class}" aria-hidden="true">
	{#if resolvedSrc}
		{#key `${iteration}-${resolvedSrc}`}
			<img
				src={resolvedSrc}
				alt=""
				class="effect-img"
				onload={handleLoad}
				decoding="async"
				loading="eager"
				fetchpriority="high"
				draggable="false"
			/>
		{/key}
	{/if}
</div>

<style>
	.effect-layer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
		contain: layout paint style;
		transform: translateZ(0);
	}

	.effect-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top center;
		display: block;
		transform: translateZ(0);
		backface-visibility: hidden;
		opacity: 0;
		animation: profile-effect-fade-in 220ms ease-out forwards;
	}

	@keyframes profile-effect-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 767px) {
		.effect-layer {
			left: 50%;
			right: auto;
			width: 100vw;
			transform: translateX(-50%) translateZ(0);
		}

		.effect-img {
			object-fit: contain;
			object-position: top center;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.effect-img {
			animation: none;
			opacity: 1;
		}
	}
</style>
