export interface SubtitleTrack {
	label: string;
	lang: string;
	src: string;
}

export interface SubtitleUrlProp {
	url: string;
	lang?: string;
	label?: string;
}

export interface SubtitleConfig {
	className?: string;
	color?: string;
	fontSize?: string;
	fontFamily?: string;
	fontWeight?: string | number;
	background?: string;
	borderRadius?: string;
	padding?: string;
	bottomOffset?: string;
	textShadow?: string;
	letterSpacing?: string;
	lineHeight?: string;
	opacity?: number;
	maxWidth?: string;
	defaultLanguage?: string;
	enabled?: boolean;
}

export interface ThemeConfig {
	primaryColor?: string;
	accentColor?: string;
	controlTextColor?: string;
	controlBackground?: string;
}

export interface AmbientConfig {
	enabled?: boolean;
	intensity?: number;
	opacity?: number;
	blur?: number;
	saturation?: number;
	contrast?: number;
}

export interface ControlsConfig {
	enabled?: boolean;
	position?: 'top' | 'bottom';
	showPlay?: boolean;
	showSeek?: boolean;
	showSkip?: boolean;
	showVolume?: boolean;
	showTime?: boolean;
	showSettings?: boolean;
	showFullscreen?: boolean;
	showSourceBadge?: boolean;
	showThumbnailPreview?: boolean;
	waveformEnable?: boolean;
	showAudioWaveform?: boolean;
	preloadAudioWaveform?: boolean;
	maxAudioWaveformBytes?: number;
	showStats?: boolean;
}

export interface PlaybackConfig {
	speeds?: number[];
	skipSeconds?: number;
	persistProgress?: boolean;
	smoothQualitySwitch?: boolean;
	qualitySwitchFadeMs?: number;
}

export interface StatsConfig {
	enabled?: boolean;
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	showCodec?: boolean;
	showNetwork?: boolean;
	showBitrate?: boolean;
	showRefreshRate?: boolean;
	showResolution?: boolean;
	showDroppedFrames?: boolean;
}

export interface FullscreenConfig {
	showTopBar?: boolean;
	showBackButton?: boolean;
	showTitle?: boolean;
}

export interface SkipIntroConfig {
	enabled?: boolean;
	seconds?: number | null;
	outroSeconds?: number | null;
	autoSkip?: boolean;
	autoSkipOutro?: boolean;
	showButton?: boolean;
	buttonUntil?: number;
	outroButtonLead?: number;
}

export interface AccessConfig {
	isLoggedIn?: boolean;
	hasPremiumAccess?: boolean;
	maxGuestQuality?: number;
	maxFreeQuality?: number;
	loginHref?: string;
	lockedQualityMessage?: string;
	lockedQualityBadge?: string;
	onLockedQuality?: () => void;
}

export interface PlayerConfig {
	theme?: ThemeConfig;
	ambient?: AmbientConfig;
	controls?: ControlsConfig;
	playback?: PlaybackConfig;
	stats?: StatsConfig;
	fullscreen?: FullscreenConfig;
	skipIntro?: SkipIntroConfig;
	subtitle?: SubtitleConfig;
	access?: AccessConfig;
}

export interface PlaybackStats {
	bitrate: number | null;
	downloadSpeed: number | null;
	refreshRate: number | null;
	audioCodec: string;
	videoCodec: string;
	resolution: string;
	droppedFrames: number | null;
}

export interface VideoPlayerOptions {
	src: string | string[];
	sourceLabels?: string[];
	autoPlay?: boolean;
	subtitles?: SubtitleTrack[];
	subtitlesBySrc?: Record<string, SubtitleTrack[]>;
	subtitleUrl?: SubtitleUrlProp;
	thumbnailUrl?: string;
	forceHls?: boolean;
	config?: PlayerConfig;
}

export interface ThumbnailCue {
	start: number;
	end: number;
	url: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface QualityLevel {
	height: number;
	displayHeight: number;
	bitrate: number;
	level: number;
}

export type SettingsSubPanel = 'speed' | 'quality' | 'subtitle' | 'sleep' | null;
export type SleepTimerOption = 'episode' | '30m' | '1h' | '2h' | '3h' | '4h' | '5h';
export type TapSide = 'left' | 'right' | null;

export interface PlayerEpisodeItem {
	slug: string;
	number: number;
	title?: string;
	sub?: string;
	href: string;
	progressPct?: number;
	locked?: boolean;
}

export interface PlayerEpisodeSeason {
	season: number;
	label?: string;
	isCurrent?: boolean;
	episodes: PlayerEpisodeItem[];
}

export interface PlayerEpisodeList {
	currentSlug?: string;
	currentNumber?: number;
	episodes?: PlayerEpisodeItem[];
	seasons?: PlayerEpisodeSeason[];
	animeTitle?: string;
}

export const STORAGE_KEYS = {
	volume: 'vp_volume',
	muted: 'vp_muted',
	brightness: 'vp_brightness',
	quality: 'vp_quality',
	progressPrefix: 'vp_progress:'
};
