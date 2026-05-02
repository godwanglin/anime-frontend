import { clamp, formatTime } from './utils';

export function createPublicApi(ctx: any) {
	const {
		hls,
		playback,
		settings,
		subtitle,
		thumbnail,
		ambient,
		stats,
		waveform,
		skipIntro,
		notifications
	} = ctx;

	return {
		updateOptions: ctx.updateOptions,
		init: ctx.init,
		destroy: ctx.destroy,
		resetForSourceChange: playback.resetForSourceChange,
		setVideoEl: ctx.setVideoEl,
		setContainerEl: ctx.setContainerEl,
		setSeekbarEl: ctx.setSeekbarEl,
		setupHls: hls.setupHls,
		destroyHls: hls.destroyHls,
		play: playback.play,
		pause: playback.pause,
		togglePlay: playback.togglePlay,
		seek: playback.seek,
		skipBackward: playback.skipBackward,
		skipForward: playback.skipForward,
		setVolume: playback.setVolume,
		setVideoBrightness: playback.setVideoBrightness,
		toggleMute: playback.toggleMute,
		setPlaybackRate: playback.setPlaybackRate,
		startSleepTimer: playback.startSleepTimer,
		cancelSleepTimer: playback.cancelSleepTimer,
		toggleSleepTimer: playback.toggleSleepTimer,
		setQuality: hls.setQuality,
		currentQualityLabel: hls.currentQualityLabel,
		currentResolutionLabel: hls.currentResolutionLabel,
		applySubtitle: subtitle.applySubtitle,
		preferredSubtitleIndex: subtitle.preferredSubtitleIndex,
		loadThumbnails: thumbnail.loadThumbnails,
		handleTap: playback.handleTap,
		toggleFullscreen: playback.toggleFullscreen,
		exitFullscreen: playback.exitFullscreen,
		toggleControlsLock: playback.toggleControlsLock,
		toggleSettings: settings.toggleSettings,
		openShortcutPanel: settings.openShortcutPanel,
		finishSettingsSelection: settings.finishSelection,
		toggleStats: ctx.toggleStats,
		closeAllMenus: settings.closeAllMenus,
		qualityLocked: hls.qualityLocked,
		onMouseMove: playback.onMouseMove,
		onMouseLeave: playback.onMouseLeave,
		onSeekbarMouseMove: thumbnail.onSeekbarMouseMove,
		onSeekbarMouseLeave: thumbnail.onSeekbarMouseLeave,
		onSurfacePointerDown: playback.onSurfacePointerDown,
		onSurfacePointerMove: playback.onSurfacePointerMove,
		onSurfacePointerUp: playback.onSurfacePointerUp,
		onSurfacePointerCancel: playback.onSurfacePointerCancel,
		onSeekbarPointerDown: playback.onSeekbarPointerDown,
		onSeekbarPointerRelease: playback.onSeekbarPointerRelease,
		onSeekbarInput: playback.onSeekbarInput,
		onSurfaceClickCapture: playback.onSurfaceClickCapture,
		onVideoClick: playback.onVideoClick,
		onPlay: ctx.onPlay,
		onPause: ctx.onPause,
		onTimeUpdate: ctx.onTimeUpdate,
		onLoadedMetadata: ctx.onLoadedMetadata,
		onEnded: playback.onEnded,
		onWaiting: playback.onWaiting,
		onCanPlay: playback.onCanPlay,
		onPlaying: playback.onPlaying,
		onVolumeChange: playback.onVolumeChange,
		onProgress: playback.onProgress,
		formatTime,
		clamp,
		get subCfg() {
			return ctx.getSubCfg();
		},
		get themeCfg() {
			return ctx.getThemeCfg();
		},
		get controlsCfg() {
			return ctx.getControlsCfg();
		},
		get statsCfg() {
			return ctx.getStatsCfg();
		},
		get statsVisible() {
			return ctx.getStatsVisible();
		},
		get fullscreenCfg() {
			return ctx.getFullscreenCfg();
		},
		get srcList() {
			return ctx.getSrcList();
		},
		get currentSrcIndex() {
			return ctx.getCurrentSrcIndex();
		},
		get currentSrc() {
			return ctx.getCurrentSrc();
		},
		get isPlaying() {
			return playback.isPlaying;
		},
		get isMuted() {
			return playback.isMuted;
		},
		get volume() {
			return playback.volume;
		},
		get videoBrightness() {
			return playback.videoBrightness;
		},
		get currentTime() {
			return playback.currentTime;
		},
		get duration() {
			return playback.duration;
		},
		get buffered() {
			return playback.buffered;
		},
		get isBuffering() {
			return playback.isBuffering;
		},
		get isFullscreen() {
			return playback.isFullscreen;
		},
		get controlsLocked() {
			return playback.controlsLocked;
		},
		get errorMessage() {
			return hls.errorMessage;
		},
		get RATES() {
			return playback.RATES;
		},
		get playbackRate() {
			return playback.playbackRate;
		},
		get sleepTimerOptions() {
			return playback.sleepTimerOptions;
		},
		get sleepTimerOption() {
			return playback.sleepTimerOption;
		},
		get sleepTimerActive() {
			return playback.sleepTimerActive;
		},
		get sleepTimerLabel() {
			return playback.sleepTimerLabel;
		},
		get sleepTimerCountdown() {
			return playback.sleepTimerCountdown;
		},
		get qualityLevels() {
			return hls.qualityLevels;
		},
		get currentQuality() {
			return hls.currentQuality;
		},
		get activeQualityHeight() {
			return hls.activeQualityHeight;
		},
		get isQualitySwitching() {
			return hls.isQualitySwitching;
		},
		get activeSubtitleIndex() {
			return subtitle.activeSubtitleIndex;
		},
		get allSubtitles() {
			return subtitle.allSubtitles;
		},
		get activeCueText() {
			return subtitle.activeCueText;
		},
		get thumbnailCues() {
			return thumbnail.thumbnailCues;
		},
		get audioWaveformBars() {
			return waveform.bars;
		},
		get audioWaveformAvailable() {
			return waveform.available;
		},
		get hovering() {
			return thumbnail.hovering;
		},
		get hoverTime() {
			return thumbnail.hoverTime;
		},
		get hoverX() {
			return thumbnail.hoverX;
		},
		get previewCue() {
			return thumbnail.previewCue;
		},
		get previewX() {
			return thumbnail.previewX;
		},
		get PREVIEW_WIDTH() {
			return thumbnail.PREVIEW_WIDTH;
		},
		get PREVIEW_HEIGHT() {
			return thumbnail.PREVIEW_HEIGHT;
		},
		get showControls() {
			return playback.showControls;
		},
		get showSettings() {
			return settings.showSettings;
		},
		get settingsSubPanel() {
			return settings.settingsSubPanel;
		},
		set settingsSubPanel(value) {
			settings.settingsSubPanel = value;
		},
		get tapSide() {
			return playback.tapSide;
		},
		get tapAccumulator() {
			return playback.tapAccumulator;
		},
		get tapToastVisible() {
			return playback.tapToastVisible;
		},
		get volumeGestureVisible() {
			return playback.volumeGestureVisible;
		},
		get brightnessGestureVisible() {
			return playback.brightnessGestureVisible;
		},
		get skipIntroSeconds() {
			return skipIntro.seconds;
		},
		get skipIntroVisible() {
			return skipIntro.canSkip;
		},
		get skipOutroSeconds() {
			return skipIntro.outroSeconds;
		},
		get skipOutroVisible() {
			return skipIntro.canSkipOutro;
		},
		get skipIntroToastVisible() {
			return skipIntro.toastVisible;
		},
		skipIntro: skipIntro.skip,
		skipOutro: skipIntro.skipOutro,
		removeNotification: notifications.remove,
		get notifications() {
			return notifications.notifications;
		},
		get seekPercent() {
			return playback.seekPercent;
		},
		get bufferedPercent() {
			return playback.bufferedPercent;
		},
		get volumePercent() {
			return playback.volumePercent;
		},
		get brightnessPercent() {
			return playback.brightnessPercent;
		},
		get brightnessMeterPercent() {
			return playback.brightnessMeterPercent;
		},
		get ambientPrimary() {
			return ambient.primary;
		},
		get ambientSecondary() {
			return ambient.secondary;
		},
		get ambientEnabled() {
			return ambient.enabled;
		},
		get ambientOpacity() {
			return ambient.opacity;
		},
		get ambientBlur() {
			return ambient.blur;
		},
		get ambientSaturation() {
			return ambient.saturation;
		},
		get stats() {
			return stats.stats;
		}
	};
}
