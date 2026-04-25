<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';
	import FullscreenTopBar from './FullscreenTopBar.svelte';
	import NotificationOverlay from './NotificationOverlay.svelte';
	import SkipIntroOverlay from './SkipIntroOverlay.svelte';
	import StatsOverlay from './StatsOverlay.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp, title }: { vp: VideoPlayerState; title: string } = $props();
</script>

<FullscreenTopBar {vp} {title} />
<StatsOverlay {vp} />
<NotificationOverlay {vp} />
<SkipIntroOverlay {vp} />

{#if vp.isQualitySwitching && !vp.errorMessage}
	<div class="vp-quality-switch" aria-hidden="true"></div>
{/if}

{#if vp.isBuffering && !vp.errorMessage && !vp.isQualitySwitching}
	<div class="vp-spinner" aria-hidden="true">
		<div class="vp-spinner-ring"></div>
	</div>
{/if}

{#if vp.errorMessage}
	<div class="vp-error">
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<line x1="12" y1="8" x2="12" y2="12" />
			<line x1="12" y1="16" x2="12.01" y2="16" />
		</svg>
		<p>{vp.errorMessage}</p>
	</div>
{/if}

{#if vp.tapToastVisible && vp.tapSide}
	<div class="vp-tap-toast vp-tap-toast-{vp.tapSide}" aria-hidden="true">
		{#if vp.tapSide === 'left'}
			<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
				<path
					d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
				/>
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
				<path
					d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"
				/>
			</svg>
		{/if}
		<span>{vp.tapAccumulator} detik</span>
	</div>
{/if}
