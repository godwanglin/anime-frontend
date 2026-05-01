import { createAmbientManager } from './ambient.svelte';
import { createAudioWaveformManager } from './audio-waveform.svelte';
import { createHlsManager } from './hls.svelte';
import { createNotificationManager } from './notifications.svelte';
import { createPlaybackUiManager } from './playback-ui.svelte';
import { createProgressManager } from './progress';
import { createPublicApi } from './public-api';
import { createSettingsManager } from './settings.svelte';
import { createSkipIntroManager } from './skip-intro.svelte';
import { createStatsManager } from './stats.svelte';
import { createSubtitleManager } from './subtitle.svelte';
import { createThumbnailManager } from './thumbnail.svelte';
import type { VideoPlayerOptions } from './types';

export type {
	PlayerConfig,
	PlaybackStats,
	PlayerEpisodeItem,
	PlayerEpisodeList,
	PlayerEpisodeSeason,
	QualityLevel,
	SubtitleConfig,
	SubtitleTrack,
	SubtitleUrlProp,
	ThumbnailCue,
	VideoPlayerOptions
} from './types';

export function createVideoPlayerState(initialOptions: VideoPlayerOptions) {
	let options = $state<VideoPlayerOptions>({
		src: initialOptions.src,
		autoPlay: initialOptions.autoPlay ?? false,
		subtitles: initialOptions.subtitles ?? [],
		subtitlesBySrc: initialOptions.subtitlesBySrc ?? {},
		subtitleUrl: initialOptions.subtitleUrl,
		thumbnailUrl: initialOptions.thumbnailUrl,
		forceHls: initialOptions.forceHls ?? false,
		config: initialOptions.config ?? {}
	});

	let videoEl = $state<HTMLVideoElement | undefined>(undefined);
	let containerEl = $state<HTMLElement | undefined>(undefined);
	let seekbarEl = $state<HTMLInputElement | undefined>(undefined);
	let currentSrcIndex = $state(0);

	let initialized = false;
	let previousSrcKey = '';
	let previousThumbnailUrl: string | undefined;
	let previousSubtitleSignature = '';
	let subtitleBuildToken = 0;

	const srcList = $derived(Array.isArray(options.src) ? options.src : [options.src]);
	const currentSrc = $derived(srcList[currentSrcIndex]);
	const subCfg = $derived(options.config?.subtitle ?? {});
	const themeCfg = $derived(options.config?.theme ?? {});
	const controlsCfg = $derived(options.config?.controls ?? {});
	const playbackCfg = $derived(options.config?.playback ?? {});
	const statsCfg = $derived(options.config?.stats ?? {});
	const fullscreenCfg = $derived(options.config?.fullscreen ?? {});

	let hls!: ReturnType<typeof createHlsManager>;

	const playback = createPlaybackUiManager({
		getVideoEl: () => videoEl,
		getContainerEl: () => containerEl,
		getPlaybackConfig: () => playbackCfg
	});
	const notifications = createNotificationManager();
	const settings = createSettingsManager();
	const ambient = createAmbientManager({
		getVideoEl: () => videoEl,
		getConfig: () => options.config?.ambient
	});
	const progress = createProgressManager({
		getSrcList: () => srcList
	});

	const subtitle = createSubtitleManager({
		getOptions: () => options,
		getVideoEl: () => videoEl,
		getHlsInstance: () => hls?.hlsInstance,
		getCurrentSrc: () => currentSrc,
		getCurrentTime: () => playback.currentTime
	});

	const thumbnail = createThumbnailManager({
		getDuration: () => playback.duration,
		getSeekbarEl: () => seekbarEl,
		getContainerEl: () => containerEl
	});
	const stats = createStatsManager({
		getVideoEl: () => videoEl,
		getHlsInstance: () => hls?.hlsInstance
	});
	const waveform = createAudioWaveformManager({
		getVideoEl: () => videoEl,
		getCurrentSrc: () => currentSrc,
		getDuration: () => playback.duration,
		getCurrentTime: () => playback.currentTime,
		getEnabled: () => controlsCfg.waveformEnable ?? controlsCfg.showAudioWaveform !== false,
		getPreloadEnabled: () => controlsCfg.preloadAudioWaveform !== false,
		getMaxPreloadBytes: () => controlsCfg.maxAudioWaveformBytes ?? 30 * 1024 * 1024
	});
	const skipIntro = createSkipIntroManager({
		getVideoEl: () => videoEl,
		getCurrentTime: () => playback.currentTime,
		getDuration: () => playback.duration,
		getConfig: () => options.config?.skipIntro,
		notify: notifications.show
	});
	const statsVisible = $derived(
		stats.visibleOverride ?? !!(statsCfg.enabled || controlsCfg.showStats)
	);

	hls = createHlsManager({
		getOptions: () => options,
		getVideoEl: () => videoEl,
		getSrcList: () => srcList,
		getCurrentSrcIndex: () => currentSrcIndex,
		setCurrentSrcIndex: (index) => {
			currentSrcIndex = index;
		},
		buildSubtitleList: subtitle.buildSubtitleList,
		resetHlsSubtitleMode: subtitle.resetHlsSubtitleMode,
		cleanupSubtitleCue: subtitle.cleanupCueListener,
		setHlsSubtitleTracks: subtitle.setHlsSubtitleTracks,
		notify: notifications.show
	});

	function updateOptions(next: VideoPlayerOptions) {
		options = {
			src: next.src,
			autoPlay: next.autoPlay ?? false,
			subtitles: next.subtitles ?? [],
			subtitlesBySrc: next.subtitlesBySrc ?? {},
			subtitleUrl: next.subtitleUrl,
			thumbnailUrl: next.thumbnailUrl,
			forceHls: next.forceHls ?? false,
			config: next.config ?? {}
		};
	}

	function setVideoEl(el: HTMLVideoElement | undefined) {
		videoEl = el;
		playback.syncVideoPrefs();
	}

	function setContainerEl(el: HTMLElement | undefined) {
		containerEl = el;
	}

	function setSeekbarEl(el: HTMLInputElement | undefined) {
		seekbarEl = el;
	}

	function init() {
		if (initialized) return destroy;
		initialized = true;

		playback.loadPersistedState();
		hls.loadPersistedQuality();
		playback.syncVideoPrefs();

		previousSrcKey = srcList.join('||');
		previousThumbnailUrl = options.thumbnailUrl;
		if (options.thumbnailUrl) thumbnail.loadThumbnails(options.thumbnailUrl);
		hls.setupHls(currentSrc, playbackCfg.persistProgress === false ? undefined : progress.load());
		ambient.start();
		stats.start();

		document.addEventListener('keydown', playback.onKeydown);
		document.addEventListener('fullscreenchange', playback.onFullscreenChange);
		document.addEventListener('click', settings.onDocClick);
		return destroy;
	}

	function destroy() {
		hls.destroyHls();
		subtitle.destroy();
		playback.destroy();
		ambient.destroy();
		stats.destroy();
		skipIntro.destroy();
		waveform.destroy();
		notifications.destroy();
		document.removeEventListener('keydown', playback.onKeydown);
		document.removeEventListener('fullscreenchange', playback.onFullscreenChange);
		document.removeEventListener('click', settings.onDocClick);
	}

	$effect(() => {
		const newKey = srcList.join('||');
		if (!initialized) return;
		if (newKey !== previousSrcKey) {
			previousSrcKey = newKey;
			currentSrcIndex = 0;
			playback.resetForSourceChange();
			hls.destroyHls();
			waveform.reset();
			hls.setupHls(srcList[0], playbackCfg.persistProgress === false ? undefined : progress.load());
		}
	});

	$effect(() => {
		if (!initialized) return;
		if (options.thumbnailUrl !== previousThumbnailUrl) {
			previousThumbnailUrl = options.thumbnailUrl;
			thumbnail.clearThumbnails();
			if (options.thumbnailUrl) thumbnail.loadThumbnails(options.thumbnailUrl);
		}
	});

	$effect(() => {
		if (!initialized) return;
		const subtitleSignature = JSON.stringify({
			currentSrc,
			subtitleUrl: options.subtitleUrl ?? null,
			subtitles: options.subtitles ?? [],
			subtitlesBySrc: options.subtitlesBySrc?.[currentSrc] ?? []
		});
		if (subtitleSignature === previousSubtitleSignature) return;
		previousSubtitleSignature = subtitleSignature;
		const buildToken = ++subtitleBuildToken;
		void subtitle.buildSubtitleList().then(() => {
			if (buildToken !== subtitleBuildToken) return;
			const nextIndex =
				subtitle.activeSubtitleIndex >= 0 && subtitle.activeSubtitleIndex < subtitle.allSubtitles.length
					? subtitle.activeSubtitleIndex
					: subtitle.preferredSubtitleIndex();
			subtitle.applySubtitle(nextIndex);
		});
	});

	$effect(() => {
		playback.syncVideoPrefs();
	});

	function onTimeUpdate() {
		playback.onTimeUpdate();
		subtitle.syncActiveCues();
		skipIntro.onTimeUpdate();
		if (playbackCfg.persistProgress !== false) {
			progress.remember(playback.currentTime, playback.duration);
		}
	}

	function onPause() {
		playback.onPause();
		waveform.stop();
		if (playbackCfg.persistProgress !== false) {
			progress.remember(playback.currentTime, playback.duration, true);
		}
	}

	function onPlay() {
		playback.onPlay();
		waveform.start();
	}

	function onLoadedMetadata() {
		playback.onLoadedMetadata();
		skipIntro.onLoadedMetadata();
		subtitle.syncActiveCues();
	}

	function toggleStats() {
		stats.toggleVisible(!!statsVisible);
	}

	return createPublicApi({
		updateOptions,
		init,
		destroy,
		setVideoEl,
		setContainerEl,
		setSeekbarEl,
		onPause,
		onPlay,
		onTimeUpdate,
		onLoadedMetadata,
		toggleStats,
		hls,
		playback,
		settings,
		subtitle,
		thumbnail,
		ambient,
		stats,
		waveform,
		skipIntro,
		notifications,
		getSubCfg: () => subCfg,
		getThemeCfg: () => themeCfg,
		getControlsCfg: () => controlsCfg,
		getStatsCfg: () => statsCfg,
		getStatsVisible: () => statsVisible,
		getFullscreenCfg: () => fullscreenCfg,
		getSrcList: () => srcList,
		getCurrentSrcIndex: () => currentSrcIndex,
		getCurrentSrc: () => currentSrc
	});
}
