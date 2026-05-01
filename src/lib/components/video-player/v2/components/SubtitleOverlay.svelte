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

	const mobileSubtitleFallback = 'clamp(0.72rem, 3.4vw, 0.95rem)';
	const subtitleFontSize = $derived(cssValue(vp.subCfg.fontSize, '1rem'));
	const subtitleMobileFontSize = $derived(scaleSubtitleFontSize(subtitleFontSize));
	const subtitleMaxWidth = $derived(cssValue(vp.subCfg.maxWidth, '75%'));

	function cssValue(value: string | number | undefined, fallback: string) {
		return String(value ?? fallback).trim() || fallback;
	}

	function roundCssNumber(value: number) {
		return Math.round(value * 1000) / 1000;
	}

	function scaleSubtitleFontSize(fontSize: string) {
		const match = fontSize.trim().match(/^(\d*\.?\d+)(px|rem|em)$/i);
		if (!match) return mobileSubtitleFallback;

		const value = Number(match[1]);
		if (!Number.isFinite(value) || value <= 0) return mobileSubtitleFallback;

		const unit = match[2].toLowerCase();
		const scaled = roundCssNumber(value / 1.7);

		if (unit === 'px') return `clamp(11px, ${scaled}px, 16px)`;
		return `clamp(0.72rem, ${scaled}${unit}, 0.95rem)`;
	}
</script>

{#if showOverlay}
	<div
		class="vp-subtitle-overlay"
		style:bottom={vp.showControls && !vp.controlsLocked
			? 'calc(72px + ' + (vp.subCfg.bottomOffset ?? '2%') + ')'
			: (vp.subCfg.bottomOffset ?? '10%')}
		style:opacity={vp.subCfg.opacity ?? 1}
		style:--vp-subtitle-color={cssValue(vp.subCfg.color, '#fff')}
		style:--vp-subtitle-font-size={subtitleFontSize}
		style:--vp-subtitle-mobile-font-size={subtitleMobileFontSize}
		style:--vp-subtitle-font-family={cssValue(vp.subCfg.fontFamily, 'inherit')}
		style:--vp-subtitle-font-weight={cssValue(vp.subCfg.fontWeight, '600')}
		style:--vp-subtitle-background={cssValue(vp.subCfg.background, 'rgba(0,0,0,0.72)')}
		style:--vp-subtitle-border-radius={cssValue(vp.subCfg.borderRadius, '4px')}
		style:--vp-subtitle-padding={cssValue(vp.subCfg.padding, '3px 10px')}
		style:--vp-subtitle-text-shadow={cssValue(vp.subCfg.textShadow, '0 1px 4px rgba(0,0,0,0.9)')}
		style:--vp-subtitle-letter-spacing={cssValue(vp.subCfg.letterSpacing, 'normal')}
		style:--vp-subtitle-line-height={cssValue(vp.subCfg.lineHeight, '1.45')}
		style:--vp-subtitle-max-width={subtitleMaxWidth}
		aria-live="polite"
		aria-label="Subtitle"
	>
		{#each visibleLines as line}
			<p
				class="vp-subtitle-line{vp.subCfg.className ? ' ' + vp.subCfg.className : ''}"
			>
				{line}
			</p>
		{/each}
	</div>
{/if}
