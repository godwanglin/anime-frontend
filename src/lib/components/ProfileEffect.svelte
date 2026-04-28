<script lang="ts">
	import { onDestroy } from 'svelte';
	import { preloadEffect, getCachedEffect } from '$lib/effect-preloader';

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

	// Resolved src = blob URL hasil preloader. Kalau sudah ter-cache di pre-fetch
	// (lewat halaman store), pakai langsung — tidak ada flicker. Kalau belum,
	// kita resolve di mount.
	let resolvedSrc = $state<string>('');
	let iteration = $state(0);
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	// console.log(blob);

	$effect(() => {
		// Re-resolve kalau prop src berubah
		// console.log(src);

		const current = src;
		const cached = getCachedEffect(current);
		if (cached) {
			resolvedSrc = cached;
			return;
		}
		let cancelled = false;
		preloadEffect(current).then((url) => {
			if (!cancelled) resolvedSrc = url;
		});
		return () => {
			cancelled = true;
		};
	});

	function clearTimer() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function scheduleNext() {
		clearTimer();
		if (!loop) return;
		timeoutId = setTimeout(() => {
			iteration++;
			const current = `${src}?_=${Date.now()}`;
			resolvedSrc = current;
		}, duration);
	}

	// Timer di-arm SETELAH image load — 1 siklus = duration ms dari munculnya
	// animasi, konsisten antar iterasi.
	function handleLoad(event: Event) {
		scheduleNext();
		onFinishLoaded?.(event.currentTarget as HTMLImageElement);
	}

	function handleVisibility() {
		if (document.hidden) {
			clearTimer();
		} else if (loop && timeoutId === null) {
			scheduleNext();
		}
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.addEventListener('visibilitychange', handleVisibility);
		return () => document.removeEventListener('visibilitychange', handleVisibility);
	});

	$effect(() => {
		// console.log('iteration:', iteration, 'with duration:', duration, 'and src:', resolvedSrc);

		return () => {
			clearTimer();
		};
	});

	onDestroy(clearTimer);
</script>

<div class="effect-layer {_class}" aria-hidden="true">
	{#if resolvedSrc}
		{#key iteration}
			<img
				src={blob ? blob : resolvedSrc}
				alt=""
				class="effect-img"
				onload={handleLoad}
				decoding="async"
				loading="eager"
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
		/* Isolasi paint/layout supaya repaint frame animasi tidak ikut menggetarkan parent */
		contain: layout paint style;
		transform: translateZ(0);
	}

	.effect-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		/* Promote ke compositor layer sendiri — frame APNG/WEBP cukup re-composite, bukan re-paint */
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>
