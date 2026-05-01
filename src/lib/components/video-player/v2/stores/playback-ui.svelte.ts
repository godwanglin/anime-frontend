import { createPlaybackInteractions } from './playback-interactions.svelte';
import { STORAGE_KEYS, type PlaybackConfig, type SleepTimerOption } from './types';
import { clamp, formatTime } from './utils';

interface PlaybackUiContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getContainerEl: () => HTMLElement | undefined;
	getPlaybackConfig: () => PlaybackConfig | undefined;
}

export function createPlaybackUiManager(ctx: PlaybackUiContext) {
	let isPlaying = $state(false);
	let isMuted = $state(false);
	let volume = $state(1);
	let videoBrightness = $state(1);
	let currentTime = $state(0);
	let duration = $state(0);
	let buffered = $state(0);
	let isBuffering = $state(false);
	let playbackRate = $state(1);
	let showControls = $state(true);
	let sleepTimerOption = $state<SleepTimerOption | null>(null);
	let sleepTimerTargetAt = $state<number | null>(null);
	let sleepTimerRemainingSeconds = $state<number | null>(null);
	let sleepTimerTicker: ReturnType<typeof setInterval> | null = null;

	const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	const MAX_VIDEO_BRIGHTNESS = 2;
	const EPISODE_SLEEP_GAP_SECONDS = 5;
	const SLEEP_TIMER_DURATIONS: Record<Exclude<SleepTimerOption, 'episode'>, number> = {
		'30m': 30 * 60,
		'1h': 60 * 60,
		'2h': 2 * 60 * 60,
		'3h': 3 * 60 * 60,
		'4h': 4 * 60 * 60,
		'5h': 5 * 60 * 60
	};
	const SLEEP_TIMER_OPTIONS: { value: SleepTimerOption; label: string }[] = [
		{ value: 'episode', label: 'Setelah episode ini' },
		{ value: '30m', label: '30 menit' },
		{ value: '1h', label: '1 jam' },
		{ value: '2h', label: '2 jam' },
		{ value: '3h', label: '3 jam' },
		{ value: '4h', label: '4 jam' },
		{ value: '5h', label: '5 jam' }
	];
	const RATES = $derived(
		ctx.getPlaybackConfig()?.speeds?.length ? ctx.getPlaybackConfig()!.speeds! : DEFAULT_RATES
	);
	const seekPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
	const bufferedPercent = $derived(duration > 0 ? (buffered / duration) * 100 : 0);
	const volumePercent = $derived(isMuted ? 0 : volume * 100);
	const brightnessPercent = $derived(videoBrightness * 100);
	const brightnessMeterPercent = $derived((videoBrightness / MAX_VIDEO_BRIGHTNESS) * 100);

	function getPlaybackActive() {
		const trackedIsPlaying = isPlaying;
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return trackedIsPlaying;
		return trackedIsPlaying || (!videoEl.paused && !videoEl.ended);
	}

	const interactions = createPlaybackInteractions({
		getContainerEl: ctx.getContainerEl,
		getIsPlaying: getPlaybackActive,
		getControlsVisible: () => showControls,
		getCurrentTime: () => currentTime,
		getVolume: () => (isMuted ? 0 : volume),
		getBrightness: () => videoBrightness,
		getPlaybackConfig: ctx.getPlaybackConfig,
		setVolume,
		setBrightness: setVideoBrightness,
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
			const savedBrightness = localStorage.getItem(STORAGE_KEYS.brightness);
			if (savedVol !== null) volume = clamp(parseFloat(savedVol), 0, 1);
			if (savedMuted !== null) isMuted = savedMuted === 'true';
			if (savedBrightness !== null) {
				const nextBrightness = parseFloat(savedBrightness);
				if (Number.isFinite(nextBrightness)) {
					videoBrightness = clamp(nextBrightness, 0, MAX_VIDEO_BRIGHTNESS);
				}
			}
		} catch {
			// localStorage may be unavailable.
		}
	}

	function persistState() {
		try {
			localStorage.setItem(STORAGE_KEYS.volume, String(volume));
			localStorage.setItem(STORAGE_KEYS.muted, String(isMuted));
			localStorage.setItem(STORAGE_KEYS.brightness, String(videoBrightness));
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

	function resetForSourceChange() {
		const videoEl = ctx.getVideoEl();
		isPlaying = false;
		currentTime = 0;
		duration = 0;
		buffered = 0;
		isBuffering = true;
		showControls = true;
		if (!videoEl) return;
		videoEl.pause();
		videoEl.currentTime = 0;
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

	function stopSleepTimerTicker() {
		if (!sleepTimerTicker) return;
		clearInterval(sleepTimerTicker);
		sleepTimerTicker = null;
	}

	function getEpisodeSleepRemainingSeconds() {
		if (!Number.isFinite(duration) || duration <= 0) return null;
		return Math.max(0, duration - currentTime - EPISODE_SLEEP_GAP_SECONDS);
	}

	function refreshSleepTimerRemaining() {
		if (!sleepTimerOption) {
			sleepTimerRemainingSeconds = null;
			return;
		}

		if (sleepTimerOption === 'episode') {
			sleepTimerRemainingSeconds = getEpisodeSleepRemainingSeconds();
			return;
		}

		if (!sleepTimerTargetAt) {
			sleepTimerRemainingSeconds = null;
			return;
		}

		sleepTimerRemainingSeconds = Math.max(0, Math.ceil((sleepTimerTargetAt - Date.now()) / 1000));
		if (sleepTimerRemainingSeconds <= 0) runSleepTimerAction();
	}

	function runSleepTimerAction() {
		if (!sleepTimerOption) return;
		cancelSleepTimer();
		pause();
		interactions.exitFullscreen();
	}

	function startSleepTimer(option: SleepTimerOption) {
		sleepTimerOption = option;
		sleepTimerTargetAt = option === 'episode' ? null : Date.now() + SLEEP_TIMER_DURATIONS[option] * 1000;
		refreshSleepTimerRemaining();
		stopSleepTimerTicker();
		sleepTimerTicker = setInterval(refreshSleepTimerRemaining, 1000);
		interactions.resetControlsTimer();
	}

	function cancelSleepTimer() {
		sleepTimerOption = null;
		sleepTimerTargetAt = null;
		sleepTimerRemainingSeconds = null;
		stopSleepTimerTicker();
	}

	function toggleSleepTimer(option: SleepTimerOption) {
		if (sleepTimerOption === option) cancelSleepTimer();
		else startSleepTimer(option);
	}

	function checkEpisodeSleepTimer(force = false) {
		if (sleepTimerOption !== 'episode') return;
		refreshSleepTimerRemaining();
		if (force || (duration > 0 && currentTime >= Math.max(0, duration - EPISODE_SLEEP_GAP_SECONDS))) {
			runSleepTimerAction();
		}
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

	function setVideoBrightness(val: number) {
		if (!Number.isFinite(val)) return;
		videoBrightness = clamp(val, 0, MAX_VIDEO_BRIGHTNESS);
		persistState();
	}

	function seek(time: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;
		const target = clamp(time, 0, duration || 0);
		currentTime = target;
		videoEl.currentTime = target;
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
		checkEpisodeSleepTimer();
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

	function onEnded() {
		isPlaying = false;
		checkEpisodeSleepTimer(true);
	}

	return {
		loadPersistedState,
		syncVideoPrefs,
		resetForSourceChange,
		play,
		pause,
		togglePlay,
		seek,
		skipBackward: interactions.skipBackward,
		skipForward: interactions.skipForward,
		setVolume,
		setVideoBrightness,
		toggleMute,
		setPlaybackRate,
		startSleepTimer,
		cancelSleepTimer,
		toggleSleepTimer,
		toggleFullscreen: interactions.toggleFullscreen,
		exitFullscreen: interactions.exitFullscreen,
		toggleControlsLock: interactions.toggleControlsLock,
		handleTap: interactions.handleTap,
		onKeydown: interactions.onKeydown,
		onFullscreenChange: interactions.onFullscreenChange,
		onSurfacePointerDown: interactions.onSurfacePointerDown,
		onSurfacePointerMove: interactions.onSurfacePointerMove,
		onSurfacePointerUp: interactions.onSurfacePointerUp,
		onSurfacePointerCancel: interactions.onSurfacePointerCancel,
		onSeekbarPointerDown: interactions.onSeekbarPointerDown,
		onSeekbarPointerRelease: interactions.onSeekbarPointerRelease,
		onSeekbarInput: interactions.onSeekbarInput,
		onSurfaceClickCapture: interactions.onSurfaceClickCapture,
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
		onEnded,
		onProgress: updateBuffered,
		destroy: () => {
			cancelSleepTimer();
			interactions.destroy();
		},
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
		get videoBrightness() {
			return videoBrightness;
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
		get controlsLocked() {
			return interactions.controlsLocked;
		},
		get playbackRate() {
			return playbackRate;
		},
		get sleepTimerOptions() {
			return SLEEP_TIMER_OPTIONS;
		},
		get sleepTimerOption() {
			return sleepTimerOption;
		},
		get sleepTimerActive() {
			return sleepTimerOption !== null;
		},
		get sleepTimerLabel() {
			return SLEEP_TIMER_OPTIONS.find((option) => option.value === sleepTimerOption)?.label ?? '';
		},
		get sleepTimerCountdown() {
			if (!sleepTimerOption) return '';
			if (sleepTimerRemainingSeconds === null) return sleepTimerOption === 'episode' ? 'Akhir ep' : '';
			return formatTime(sleepTimerRemainingSeconds);
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
		get volumeGestureVisible() {
			return interactions.volumeGestureVisible;
		},
		get brightnessGestureVisible() {
			return interactions.brightnessGestureVisible;
		},
		get seekPercent() {
			return seekPercent;
		},
		get bufferedPercent() {
			return bufferedPercent;
		},
		get volumePercent() {
			return volumePercent;
		},
		get brightnessPercent() {
			return brightnessPercent;
		},
		get brightnessMeterPercent() {
			return brightnessMeterPercent;
		}
	};
}
