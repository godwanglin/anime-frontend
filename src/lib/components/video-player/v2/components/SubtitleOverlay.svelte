<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let {
		vp,
		externalLines = [],
		preferExternalSubtitles = false
	}: {
		vp: VideoPlayerState;
		externalLines?: string[];
		preferExternalSubtitles?: boolean;
	} = $props();

	const visibleLines = $derived(
		preferExternalSubtitles ? externalLines : externalLines.length > 0 ? externalLines : vp.activeCueText
	);
	const showOverlay = $derived(
		visibleLines.length > 0 && (preferExternalSubtitles || externalLines.length > 0 || vp.activeSubtitleIndex !== -1)
	);
</script>

{#if showOverlay}
	<div
		class="vp-subtitle-overlay"
		style:bottom={vp.showControls
			? 'calc(72px + ' + (vp.subCfg.bottomOffset ?? '2%') + ')'
			: (vp.subCfg.bottomOffset ?? '10%')}
		style:max-width={vp.subCfg.maxWidth ?? '90%'}
		style:opacity={vp.subCfg.opacity ?? 1}
		aria-live="polite"
		aria-label="Subtitle"
	>
		{#each visibleLines as line}
			<p
				class="vp-subtitle-line{vp.subCfg.className ? ' ' + vp.subCfg.className : ''}"
				style:color={vp.subCfg.color ?? '#fff'}
				style:font-size={vp.subCfg.fontSize ?? '1rem'}
				style:font-family={vp.subCfg.fontFamily ?? 'inherit'}
				style:font-weight={String(vp.subCfg.fontWeight ?? 600)}
				style:background={vp.subCfg.background ?? 'rgba(0,0,0,0.72)'}
				style:border-radius={vp.subCfg.borderRadius ?? '4px'}
				style:padding={vp.subCfg.padding ?? '3px 10px'}
				style:text-shadow={vp.subCfg.textShadow ?? '0 1px 4px rgba(0,0,0,0.9)'}
				style:letter-spacing={vp.subCfg.letterSpacing ?? 'normal'}
				style:line-height={vp.subCfg.lineHeight ?? '1.45'}
			>
				{line}
			</p>
		{/each}
	</div>
{/if}
