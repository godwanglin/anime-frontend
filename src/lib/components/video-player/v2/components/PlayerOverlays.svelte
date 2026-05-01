<script lang="ts">
	import { goto } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';
	import FullscreenTopBar from './FullscreenTopBar.svelte';
	import NotificationOverlay from './NotificationOverlay.svelte';
	import SkipIntroOverlay from './SkipIntroOverlay.svelte';
	import StatsOverlay from './StatsOverlay.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let {
		vp,
		title,
		nextHref,
		autoNext = true
	}: { vp: VideoPlayerState; title: string; nextHref?: string; autoNext?: boolean } = $props();

	let nextEpisodeNavigating = $state(false);
	const defaultNextEpisodeLead = 20;
	const nextEpisodeLead = $derived.by(() => {
		const skipOutroSeconds = Number(vp.skipOutroSeconds ?? 0);
		if (
			Number.isFinite(skipOutroSeconds) &&
			skipOutroSeconds > 0 &&
			vp.duration > 0 &&
			skipOutroSeconds < vp.duration
		) {
			return Math.max(0, Math.ceil(vp.duration - skipOutroSeconds));
		}

		return defaultNextEpisodeLead;
	});
	const nextEpisodeRemaining = $derived(
		vp.duration > 0 ? Math.max(0, Math.ceil(vp.duration - vp.currentTime)) : 0
	);
	const showNextEpisodeOverlay = $derived(
		!!nextHref &&
			!vp.controlsLocked &&
			vp.duration > 0 &&
			nextEpisodeRemaining <= nextEpisodeLead
	);

	function openNextEpisode() {
		if (!nextHref || nextEpisodeNavigating) return;
		nextEpisodeNavigating = true;
		vp.pause();
		window.setTimeout(() => {
			void goto(nextHref, { replaceState: true });
		}, 160);
	}

	$effect(() => {
		nextHref;
		nextEpisodeNavigating = false;
	});

	$effect(() => {
		if (!autoNext || !showNextEpisodeOverlay || !vp.isPlaying || nextEpisodeRemaining > 0) return;
		openNextEpisode();
	});
</script>

<FullscreenTopBar {vp} {title} />
<StatsOverlay {vp} />
<NotificationOverlay {vp} />
<SkipIntroOverlay {vp} suppressOutro={!!nextHref} />

{#if vp.sleepTimerActive && (vp.showControls || !vp.isPlaying || vp.showSettings)}
	<div class="vp-sleep-timer-badge" aria-label="Timer tidur aktif">
		<AppIcon name="schedule" />
		<span>{vp.sleepTimerLabel}</span>
		<b>{vp.sleepTimerCountdown}</b>
	</div>
{/if}

{#if showNextEpisodeOverlay}
	<div class="vp-next-episode-overlay">
		<button
			type="button"
			class="vp-next-episode-btn"
			class:vp-next-episode-btn-loading={nextEpisodeNavigating}
			disabled={nextEpisodeNavigating}
			onclick={openNextEpisode}
		>
			<span class="vp-next-episode-icon">
				<AppIcon name="skip_next" />
			</span>
			<span class="vp-next-episode-copy">
				<small>{nextEpisodeNavigating ? 'Menyiapkan episode...' : `Berikutnya dalam ${nextEpisodeRemaining}s`}</small>
				<b>{nextEpisodeNavigating ? 'Memuat' : 'Episode Berikutnya'}</b>
			</span>
		</button>
	</div>
{/if}

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

{#if vp.brightnessGestureVisible}
	<div class="vp-brightness-gesture-toast" aria-hidden="true">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2" />
			<path d="M12 20v2" />
			<path d="m4.93 4.93 1.41 1.41" />
			<path d="m17.66 17.66 1.41 1.41" />
			<path d="M2 12h2" />
			<path d="M20 12h2" />
			<path d="m6.34 17.66-1.41 1.41" />
			<path d="m19.07 4.93-1.41 1.41" />
		</svg>
		<div class="vp-brightness-gesture-meter">
			<div style:height={`${vp.brightnessMeterPercent}%`}></div>
		</div>
		<span>{Math.round(vp.brightnessPercent)}%</span>
	</div>
{/if}

{#if vp.volumeGestureVisible}
	<div class="vp-volume-gesture-toast" aria-hidden="true">
		{#if vp.volumePercent === 0}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<line x1="23" y1="9" x2="17" y2="15" />
				<line x1="17" y1="9" x2="23" y2="15" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
				<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
			</svg>
		{/if}
		<div class="vp-volume-gesture-meter">
			<div style:height={`${vp.volumePercent}%`}></div>
		</div>
		<span>{Math.round(vp.volumePercent)}%</span>
	</div>
{/if}
