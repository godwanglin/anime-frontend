<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp, title }: { vp: VideoPlayerState; title: string } = $props();

	const showBack = $derived(vp.fullscreenCfg.showBackButton !== false);
	const showTitle = $derived(vp.fullscreenCfg.showTitle !== false);
	const visible = $derived(!vp.controlsLocked && (vp.showControls || !vp.isPlaying));
</script>

{#if vp.isFullscreen && visible && vp.fullscreenCfg.showTopBar !== false && (showBack || showTitle)}
	<div class="vp-fullscreen-topbar">
		{#if showBack}
			<button class="vp-fullscreen-back" onclick={vp.toggleFullscreen} aria-label="Exit fullscreen">
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
				</svg>
			</button>
		{/if}
		{#if showTitle}
			<span class="vp-fullscreen-title">{title}</span>
		{/if}
	</div>
{/if}
