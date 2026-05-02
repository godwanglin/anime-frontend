<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import '../vp.css';
	import CenterControls from './components/CenterControls.svelte';
	import ControlsOverlay from './components/ControlsOverlay.svelte';
	import EpisodeDrawer from './components/EpisodeDrawer.svelte';
	import PlayerOverlays from './components/PlayerOverlays.svelte';
	import SubtitleOverlay from './components/SubtitleOverlay.svelte';
	import VideoSurface from './components/VideoSurface.svelte';
	import {
		createVideoPlayerState,
		type PlayerConfig,
		type PlayerEpisodeList,
		type SubtitleTrack,
		type SubtitleUrlProp
	} from './stores/vpstate.svelte';

	let {
		src,
		poster = '',
		title = 'Video player',
		autoPlay = false,
		subtitles = [],
		subtitlesBySrc = {},
		subtitleUrl,
		thumbnailUrl,
		forceHls = false,
		config = {},
		playerApi = $bindable(),
		videoElement = $bindable(),
		externalSubtitleLines = [],
		preferExternalSubtitles = false,
		prevHref,
		nextHref,
		autoNext = true,
		episodeList,
		onStateChange = () => null
	}: {
		src: string | string[];
		poster?: string;
		title?: string;
		autoPlay?: boolean;
		subtitles?: SubtitleTrack[];
		subtitlesBySrc?: Record<string, SubtitleTrack[]>;
		subtitleUrl?: SubtitleUrlProp;
		thumbnailUrl?: string;
		forceHls?: boolean;
		config?: PlayerConfig;
		playerApi?: ReturnType<typeof createVideoPlayerState>;
		videoElement?: HTMLVideoElement;
		externalSubtitleLines?: string[];
		preferExternalSubtitles?: boolean;
		prevHref?: string;
		nextHref?: string;
		autoNext?: boolean;
		episodeList?: PlayerEpisodeList;
		onStateChange?: (state: {
			currentTime: number;
			duration: number;
			isPlaying: boolean;
		}) => void;
	} = $props();

	let videoEl = $state<HTMLVideoElement>();
	let containerEl = $state<HTMLElement>();
	let seekbarEl = $state<HTMLInputElement>();
	let subtitleReapplyRaf = 0;
	let showEpisodeDrawer = $state(false);
	let qualityLoginPromptOpen = $state(false);

	const playerConfig = $derived({
		...config,
		access: {
			...(config.access ?? {}),
			onLockedQuality: () => {
				qualityLoginPromptOpen = true;
				config.access?.onLockedQuality?.();
			}
		}
	});
	const qualityLoginHref = $derived(playerConfig.access?.loginHref ?? '/login');

	function getOptions() {
		return {
			src,
			autoPlay,
			subtitles,
			subtitlesBySrc,
			subtitleUrl,
			thumbnailUrl,
			forceHls,
			config: playerConfig
		};
	}

	const vp = createVideoPlayerState(getOptions());
	playerApi = vp;

	function toggleEpisodeDrawer() {
		showEpisodeDrawer = !showEpisodeDrawer;
	}

	function closeEpisodeDrawer() {
		showEpisodeDrawer = false;
	}

	$effect(() => {
		if (!vp.isFullscreen && showEpisodeDrawer) showEpisodeDrawer = false;
	});

	$effect(() => {
		vp.updateOptions(getOptions());
	});

	$effect(() => vp.setVideoEl(videoEl));
	$effect(() => {
		videoElement = videoEl;
	});
	$effect(() => vp.setContainerEl(containerEl));
	$effect(() => vp.setSeekbarEl(seekbarEl));

	let playbackTickerRaf = 0;

	function stopPlaybackTicker() {
		if (!playbackTickerRaf) return;
		cancelAnimationFrame(playbackTickerRaf);
		playbackTickerRaf = 0;
	}

	function stopSubtitleReapply() {
		if (!subtitleReapplyRaf) return;
		cancelAnimationFrame(subtitleReapplyRaf);
		subtitleReapplyRaf = 0;
	}

	function emitState() {
		onStateChange({
			currentTime: videoEl?.currentTime ?? vp.currentTime,
			duration: videoEl?.duration || vp.duration,
			isPlaying: videoEl ? !videoEl.paused && !videoEl.ended : vp.isPlaying
		});
	}

	function tickPlaybackState() {
		playbackTickerRaf = 0;
		if (!videoEl || videoEl.paused || videoEl.ended) {
			emitState();
			return;
		}
		emitState();
		playbackTickerRaf = requestAnimationFrame(tickPlaybackState);
	}

	function startPlaybackTicker() {
		if (!videoEl || playbackTickerRaf) return;
		playbackTickerRaf = requestAnimationFrame(tickPlaybackState);
	}

	function scheduleSubtitleReapply(index: number) {
		stopSubtitleReapply();
		subtitleReapplyRaf = requestAnimationFrame(() => {
			subtitleReapplyRaf = 0;
			vp.applySubtitle(index);
		});
	}

	function handlePlay() {
		vp.onPlay();
		emitState();
		startPlaybackTicker();
	}

	function handlePause() {
		vp.onPause();
		stopPlaybackTicker();
		emitState();
	}

	function handleTimeUpdate() {
		vp.onTimeUpdate();
		emitState();
	}

	function handleLoadedMetadata() {
		vp.onLoadedMetadata();
		if (vp.allSubtitles.length > 0) {
			const activeIndex =
				vp.activeSubtitleIndex >= 0 ? vp.activeSubtitleIndex : vp.preferredSubtitleIndex();
			scheduleSubtitleReapply(Math.min(activeIndex, vp.allSubtitles.length - 1));
		}
		emitState();
	}

	function handleEnded() {
		vp.onEnded();
		stopPlaybackTicker();
		emitState();
	}

	$effect(() => {
		if (vp.isPlaying) startPlaybackTicker();
		else stopPlaybackTicker();
	});

	$effect(() => {
		if (!videoEl) return;
		const subtitleCount = vp.allSubtitles.length;
		if (subtitleCount === 0) {
			scheduleSubtitleReapply(-1);
			return;
		}
		const activeIndex =
			vp.activeSubtitleIndex >= 0 ? vp.activeSubtitleIndex : vp.preferredSubtitleIndex();
		scheduleSubtitleReapply(Math.min(activeIndex, subtitleCount - 1));
	});

	onMount(() => vp.init());
	onDestroy(() => {
		stopPlaybackTicker();
		stopSubtitleReapply();
	});
</script>

<div
	class="vp-shell"
	class:vp-ambient-disabled={!vp.ambientEnabled}
	style:--vp-ambient-primary={vp.ambientPrimary}
	style:--vp-ambient-secondary={vp.ambientSecondary}
	style:--vp-ambient-opacity={vp.ambientOpacity}
	style:--vp-ambient-blur={`${vp.ambientBlur}px`}
	style:--vp-ambient-saturation={vp.ambientSaturation}
	style:--vp-video-brightness={vp.videoBrightness}
	style:--vp-primary-color={vp.themeCfg.primaryColor}
	style:--vp-accent-color={vp.themeCfg.accentColor}
	style:--vp-control-text-color={vp.themeCfg.controlTextColor}
	style:--vp-control-background={vp.themeCfg.controlBackground}
	style:--vp-quality-switch-ms={`${config?.playback?.qualitySwitchFadeMs ?? 520}ms`}
>
	<div class="vp-ambient" aria-hidden="true"></div>

	<div
		class="vp-container"
		class:vp-fullscreen={vp.isFullscreen}
		bind:this={containerEl}
		onmousemove={vp.onMouseMove}
		onmouseleave={vp.onMouseLeave}
		onpointerdowncapture={vp.onSurfacePointerDown}
		onpointermovecapture={vp.onSurfacePointerMove}
		onpointerupcapture={vp.onSurfacePointerUp}
		onpointercancelcapture={vp.onSurfacePointerCancel}
		onclickcapture={vp.onSurfaceClickCapture}
		role="region"
		aria-label={title}
	>
		<VideoSurface
			{vp}
			{poster}
			{title}
			bind:videoEl
			onplay={handlePlay}
			onpause={handlePause}
			ontimeupdate={handleTimeUpdate}
			onloadedmetadata={handleLoadedMetadata}
			onended={handleEnded}
		/>
		<div class="vp-brightness-gesture-zone" aria-hidden="true"></div>
		<div class="vp-volume-gesture-zone" aria-hidden="true"></div>
		<SubtitleOverlay
			{vp}
			externalLines={externalSubtitleLines}
			{preferExternalSubtitles}
		/>
		<PlayerOverlays {vp} {title} {nextHref} {autoNext} />
		<CenterControls {vp} {prevHref} {nextHref} />
		<ControlsOverlay
			{vp}
			bind:seekbarEl
			{episodeList}
			{showEpisodeDrawer}
			onToggleEpisodeDrawer={toggleEpisodeDrawer}
		/>
		<EpisodeDrawer
			open={showEpisodeDrawer}
			{episodeList}
			onClose={closeEpisodeDrawer}
		/>
		{#if qualityLoginPromptOpen}
			<div class="vp-login-prompt" role="dialog" aria-modal="true" aria-label="Masuk untuk kualitas terbaik">
				<button
					type="button"
					class="vp-login-prompt-backdrop"
					aria-label="Tutup"
					onclick={() => (qualityLoginPromptOpen = false)}
				></button>
				<div class="vp-login-prompt-card">
					<div class="vp-login-prompt-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none">
							<path
								d="M7 10V8a5 5 0 0 1 10 0v2"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
							<path
								d="M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
								stroke="currentColor"
								stroke-width="2"
							/>
						</svg>
					</div>
					<p class="vp-login-prompt-title">Masuk untuk kualitas terbaik</p>
					<p class="vp-login-prompt-copy">Kualitas 1080p tersedia untuk akun yang sudah masuk.</p>
					<div class="vp-login-prompt-actions">
						<button
							type="button"
							class="vp-login-prompt-secondary"
							onclick={() => (qualityLoginPromptOpen = false)}
						>
							Nanti saja
						</button>
						<a class="vp-login-prompt-primary" href={qualityLoginHref}>Masuk</a>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
