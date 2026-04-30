<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';

	type Props = {
		href?: string;
		enabled?: boolean;
	};

	const { href, enabled = true }: Props = $props();
	let cleanup: (() => void) | null = null;

	function bindEnded() {
		cleanup?.();
		const video = document.querySelector('video') as HTMLVideoElement | null;
		if (!video || !href || !enabled) return;

		const onEnded = () => {
			if (href) goto(href, { replaceState: true });
		};

		video.addEventListener('ended', onEnded);
		cleanup = () => video.removeEventListener('ended', onEnded);
	}

	onMount(() => {
		const timer = setTimeout(bindEnded, 500);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		href;
		enabled;
		bindEnded();
	});

	onDestroy(() => cleanup?.());
</script>
