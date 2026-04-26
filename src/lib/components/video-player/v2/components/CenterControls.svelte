<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let {
		vp,
		prevHref,
		nextHref
	}: {
		vp: VideoPlayerState;
		prevHref?: string;
		nextHref?: string;
	} = $props();

	const visible = $derived(vp.showControls || !vp.isPlaying);
</script>

{#if prevHref || nextHref}
	<div
		class="vp-center-controls"
		class:vp-center-controls-visible={visible}
		aria-hidden={!visible}
	>
		{#if prevHref}
			<a
				href={prevHref}
				class="vp-center-btn vp-center-btn-side"
				aria-label="Episode sebelumnya"
				data-sveltekit-preload-data="hover"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
				</svg>
			</a>
		{:else}
			<span class="vp-center-btn vp-center-btn-side vp-center-btn-disabled" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
				</svg>
			</span>
		{/if}

		<button
			type="button"
			class="vp-center-btn vp-center-btn-main"
			onclick={vp.togglePlay}
			aria-label={vp.isPlaying ? 'Pause' : 'Play'}
		>
			{#if vp.isPlaying}
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<rect x="6" y="4" width="4" height="16" rx="1" />
					<rect x="14" y="4" width="4" height="16" rx="1" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<polygon points="6,3 21,12 6,21" />
				</svg>
			{/if}
		</button>

		{#if nextHref}
			<a
				href={nextHref}
				class="vp-center-btn vp-center-btn-side"
				aria-label="Episode selanjutnya"
				data-sveltekit-preload-data="hover"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M6 18l8.5-6L6 6zM16 6h2v12h-2z" />
				</svg>
			</a>
		{:else}
			<span class="vp-center-btn vp-center-btn-side vp-center-btn-disabled" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M6 18l8.5-6L6 6zM16 6h2v12h-2z" />
				</svg>
			</span>
		{/if}
	</div>
{/if}
