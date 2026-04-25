<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		src: string[];
		poster: string;
		title: string;
		autoPlay?: boolean;
		subtitlesBySrc?: Record<string, unknown>;
		forceHls?: boolean;
		config?: Record<string, unknown>;
	};

	let {
		src,
		poster,
		title,
		autoPlay = false,
		subtitlesBySrc = {},
		forceHls = false,
		config = {}
	}: Props = $props();

	let VideoPlayer: any = $state(null);

	onMount(async () => {
		VideoPlayer = (await import('$lib/components/video-player/v2/VideoPlayer.svelte')).default;
	});
</script>

{#if VideoPlayer}
	<VideoPlayer {src} {poster} {title} {autoPlay} {subtitlesBySrc} {forceHls} {config} />
{:else}
	<div class="lazy-video-shell">
		{#if poster}
			<img src={poster} alt={title} decoding="async" fetchpriority="high" />
		{/if}
		<div class="lazy-video-overlay">
			<span class="material-symbols-rounded">play_circle</span>
		</div>
	</div>
{/if}

<style>
	.lazy-video-shell {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: hidden;
		background: #050505;
	}

	.lazy-video-shell img {
		height: 100%;
		width: 100%;
		object-fit: cover;
		opacity: 0.5;
	}

	.lazy-video-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(to top, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.12));
		color: white;
	}

	.lazy-video-overlay span {
		font-size: 48px;
		opacity: 0.9;
	}
</style>
