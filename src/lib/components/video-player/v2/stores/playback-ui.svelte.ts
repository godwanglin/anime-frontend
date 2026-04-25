import { createPlaybackInteractions } from './playback-interactions.svelte';
import { STORAGE_KEYS, type PlaybackConfig } from './types';
import { clamp } from './utils';

interface PlaybackUiContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getContainerEl: () => HTMLElement | undefined;
	getPlaybackConfig: () => PlaybackConfig | undefined;
}

export function createPlaybackUiManager(ctx: PlaybackUiContext) {
	let isPlaying = $state(false);
	let isMuted = $state(false);
	let volume = $state(1);
	let currentTime = $state(0);
	let duration = $state(0);
	let buffered = $state(0);
	let isBuffering = $state(false);
	let playbackRate = $state(1);
	let showControls = $state(true);

	const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	const RATES = $derived(
		ctx.getPlaybackConfig()?.speeds?.length ? ctx.getPlaybackConfig()!.speeds! : DEFAULT_RATES
	);
	const seekPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
	const bufferedPercent = $derived(duration > 0 ? (buffered / duration) * 100 : 0);
	const volumePercent = $derived(isMuted ? 0 : volume * 100);

	const interactions = createPlaybackInteractions({
		getContainerEl: ctx.getContainerEl,
		getIsPlaying: () => isPlaying,
		getCurrentTime: () => currentTime,
		getVolume: () => (isMuted ? 0 : volume),
		getPlaybackConfig: ctx.getPlaybackConfig,
		setVolume,
		toggleMute,
		seek,
		togglePlay,
		setControlsVisible: (value) => {
			showControls = value;
		}
	});

	function loadPersistedState() {
		try {
			const savedVol = localStorage.getItem(STORAGE_KEYS.volume);
			const savedMuted = localStorage.getItem(STORAGE_KEYS.muted);
			if (savedVol !== null) volume = clamp(parseFloat(savedVol), 0, 1);
			if (savedMuted !== null) isMuted = savedMuted === 'true';
		} catch {
			// localStorage may be unavailable.
		}
	}

	function persistState() {
		try {
			localStorage.setItem(STORAGE_KEYS.volume, String(volume));
			localStorage.setItem(STORAGE_KEYS.muted, String(isMuted));
		} catch {
			// ignore storage failures
		}
	}

	function syncVideoPrefs() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		videoEl.volume = volume;
		videoEl.muted = isMuted;
		videoEl.playbackRate = playbackRate;
	}

	function play() {
		ctx
			.getVideoEl()
			?.play()
			.catch(() => {});
	}

	function pause() {
		ctx.getVideoEl()?.pause();
	}

	function togglePlay() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		if (videoEl.paused) play();
		else pause();
	}

	function toggleMute() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		isMuted = !isMuted;
		videoEl.muted = isMuted;
		persistState();
	}

	function setVolume(val: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		volume = clamp(val, 0, 1);
		videoEl.volume = volume;
		isMuted = volume === 0;
		videoEl.muted = isMuted;
		persistState();
	}

	function seek(time: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		videoEl.currentTime = clamp(time, 0, duration || 0);
	}

	function setPlaybackRate(rate: number) {
		playbackRate = rate;
		const videoEl = ctx.getVideoEl();
		if (videoEl) videoEl.playbackRate = rate;
	}

	function updateBuffered() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl || videoEl.buffered.length === 0) return;
		for (let i = videoEl.buffered.length - 1; i >= 0; i--) {
			if (videoEl.buffered.start(i) <= videoEl.currentTime) {
				buffered = videoEl.buffered.end(i);
				break;
			}
		}
	}

	function onPlay() {
		isPlaying = true;
		interactions.resetControlsTimer();
	}

	function onPause() {
		isPlaying = false;
		showControls = true;
	}

	function onTimeUpdate() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		currentTime = videoEl.currentTime;
		updateBuffered();
	}

	function onLoadedMetadata() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		duration = videoEl.duration;
		syncVideoPrefs();
	}

	function onVolumeChange() {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		volume = videoEl.volume;
		isMuted = videoEl.muted;
	}

	return {
		loadPersistedState,
		syncVideoPrefs,
		play,
		pause,
		togglePlay,
		seek,
		skipBackward: interactions.skipBackward,
		skipForward: interactions.skipForward,
		setVolume,
		toggleMute,
		setPlaybackRate,
		toggleFullscreen: interactions.toggleFullscreen,
		handleTap: interactions.handleTap,
		onKeydown: interactions.onKeydown,
		onFullscreenChange: interactions.onFullscreenChange,
		onMouseMove: interactions.onMouseMove,
		onMouseLeave: interactions.onMouseLeave,
		onVideoClick: interactions.onVideoClick,
		onPlay,
		onPause,
		onTimeUpdate,
		onLoadedMetadata,
		onWaiting: () => (isBuffering = true),
		onCanPlay: () => (isBuffering = false),
		onPlaying: () => (isBuffering = false),
		onVolumeChange,
		onProgress: updateBuffered,
		destroy: interactions.destroy,
		get RATES() {
			return RATES;
		},
		get isPlaying() {
			return isPlaying;
		},
		get isMuted() {
			return isMuted;
		},
		get volume() {
			return volume;
		},
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		get buffered() {
			return buffered;
		},
		get isBuffering() {
			return isBuffering;
		},
		get isFullscreen() {
			return interactions.isFullscreen;
		},
		get playbackRate() {
			return playbackRate;
		},
		get showControls() {
			return showControls;
		},
		get tapSide() {
			return interactions.tapSide;
		},
		get tapAccumulator() {
			return interactions.tapAccumulator;
		},
		get tapToastVisible() {
			return interactions.tapToastVisible;
		},
		get seekPercent() {
			return seekPercent;
		},
		get bufferedPercent() {
			return bufferedPercent;
		},
		get volumePercent() {
			return volumePercent;
		}
	};
}
