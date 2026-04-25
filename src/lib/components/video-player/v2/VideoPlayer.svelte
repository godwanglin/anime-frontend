<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import '../vp.css';
	import ControlsOverlay from './components/ControlsOverlay.svelte';
	import PlayerOverlays from './components/PlayerOverlays.svelte';
	import SubtitleOverlay from './components/SubtitleOverlay.svelte';
	import VideoSurface from './components/VideoSurface.svelte';
	import {
		createVideoPlayerState,
		type PlayerConfig,
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
		onStateChange?: (state: {
			currentTime: number;
			duration: number;
			isPlaying: boolean;
		}) => void;
	} = $props();

	function getOptions() {
		return { src, autoPlay, subtitles, subtitlesBySrc, subtitleUrl, thumbnailUrl, forceHls, config };
	}

	const vp = createVideoPlayerState(getOptions());
	playerApi = vp;

	let videoEl = $state<HTMLVideoElement>();
	let containerEl = $state<HTMLElement>();
	let seekbarEl = $state<HTMLInputElement>();
	let subtitleReapplyRaf = 0;

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
		const activeIndex = vp.activeSubtitleIndex >= 0 ? vp.activeSubtitleIndex : 0;
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
	style:--vp-primary-color={vp.themeCfg.primaryColor}
	style:--vp-accent-color={vp.themeCfg.accentColor}
	style:--vp-control-text-color={vp.themeCfg.controlTextColor}
	style:--vp-control-background={vp.themeCfg.controlBackground}
	style:--vp-quality-switch-ms={`${config?.playback?.qualitySwitchFadeMs ?? 520}ms`}
>
	<div class="vp-ambient" aria-hidden="true"></div>

	<div
		class="vp-container"
		bind:this={containerEl}
		onmousemove={vp.onMouseMove}
		onmouseleave={vp.onMouseLeave}
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
		/>
		<SubtitleOverlay
			{vp}
			externalLines={externalSubtitleLines}
			{preferExternalSubtitles}
		/>
		<PlayerOverlays {vp} {title} />
		<ControlsOverlay {vp} bind:seekbarEl />
	</div>
</div>
