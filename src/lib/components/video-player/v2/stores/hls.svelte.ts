import type { QualityLevel, VideoPlayerOptions } from './types';
import { normalizedQualityHeight, qualityLabel } from '$lib/video-quality';
import { STORAGE_KEYS } from './types';

interface HlsContext {
	getOptions: () => VideoPlayerOptions;
	getVideoEl: () => HTMLVideoElement | undefined;
	getSrcList: () => string[];
	getCurrentSrcIndex: () => number;
	setCurrentSrcIndex: (index: number) => void;
	buildSubtitleList: () => Promise<void>;
	resetHlsSubtitleMode: () => void;
	cleanupSubtitleCue: () => void;
	setHlsSubtitleTracks: (tracks: { name: string; lang?: string; id: number }[], hls: any) => void;
	notify?: (message: string) => void;
}

export function createHlsManager(ctx: HlsContext) {
	let qualityLevels = $state<QualityLevel[]>([]);
	let currentQuality = $state(-1);
	let activeQualityHeight = $state(0);
	let isQualitySwitching = $state(false);
	let errorMessage = $state('');

	let hlsInstance: any = null;
	let HlsConstructor: any = null;
	let lastNotifiedHeight = 0;
	let qualitySwitchTimer: ReturnType<typeof setTimeout> | null = null;

	function loadPersistedQuality() {
		try {
			const savedQuality = localStorage.getItem(STORAGE_KEYS.quality);
			if (savedQuality !== null) currentQuality = parseInt(savedQuality, 10);
		} catch {
			// localStorage may be unavailable.
		}
	}

	function persistQuality() {
		try {
			localStorage.setItem(STORAGE_KEYS.quality, String(currentQuality));
		} catch {
			// ignore storage failures
		}
	}

	function destroyHls() {
		ctx.cleanupSubtitleCue();
		clearQualitySwitch();
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
	}

	function maxAllowedDisplayHeight() {
		const access = ctx.getOptions().config?.access;
		if (access?.hasPremiumAccess) return Infinity;
		return access?.maxFreeQuality ?? access?.maxGuestQuality ?? 720;
	}

	function qualityLocked(level: number) {
		if (level === -1) return false;
		const q = qualityLevels.find((item) => item.level === level);
		return Boolean(q && q.displayHeight > maxAllowedDisplayHeight());
	}

	function lockedQualityMessage() {
		return (
			ctx.getOptions().config?.access?.lockedQualityMessage ??
			'Premium diperlukan untuk membuka kualitas di atas 720p'
		);
	}

	function showLockedQualityPrompt() {
		ctx.getOptions().config?.access?.onLockedQuality?.();
		ctx.notify?.(lockedQualityMessage());
	}

	function highestAllowedLevel() {
		let selected = -1;
		for (let index = 0; index < qualityLevels.length; index += 1) {
			const q = qualityLevels[index];
			if (q.displayHeight <= maxAllowedDisplayHeight()) {
				selected = q.level;
				break;
			}
		}
		return selected;
	}

	function applyAutoLevelCap() {
		if (!hlsInstance) return;
		const allowedLevel = highestAllowedLevel();
		hlsInstance.autoLevelCapping = allowedLevel;
		if (currentQuality !== -1 && qualityLocked(currentQuality)) {
			setQuality(-1);
		}
	}

	function refreshQualityAccess() {
		applyAutoLevelCap();
	}

	function clearQualitySwitch() {
		if (qualitySwitchTimer) clearTimeout(qualitySwitchTimer);
		qualitySwitchTimer = null;
		isQualitySwitching = false;
	}

	function smoothSwitchEnabled() {
		return ctx.getOptions().config?.playback?.smoothQualitySwitch !== false;
	}

	function switchFadeMs() {
		const ms = ctx.getOptions().config?.playback?.qualitySwitchFadeMs ?? 520;
		return Math.max(180, Math.min(1400, ms));
	}

	function startQualitySwitch() {
		if (!smoothSwitchEnabled()) return;
		if (qualitySwitchTimer) clearTimeout(qualitySwitchTimer);
		isQualitySwitching = true;
		qualitySwitchTimer = setTimeout(() => {
			isQualitySwitching = false;
			qualitySwitchTimer = null;
		}, switchFadeMs());
	}

	function finishQualitySwitch() {
		if (!isQualitySwitching) return;
		if (qualitySwitchTimer) clearTimeout(qualitySwitchTimer);
		qualitySwitchTimer = setTimeout(
			() => {
				isQualitySwitching = false;
				qualitySwitchTimer = null;
			},
			Math.round(switchFadeMs() * 0.45)
		);
	}

	function isHlsSource(videoSrc: string) {
		const options = ctx.getOptions();
		const normalizedSrc = videoSrc.toLowerCase();
		const isDirectMp4 = /\.mp4(?:$|[?#])/.test(normalizedSrc);
		if (isDirectMp4) return false;

		return (
			options.forceHls ||
			normalizedSrc.includes('.m3u8') ||
			normalizedSrc.includes('application/vnd.apple.mpegurl') ||
			normalizedSrc.includes('/playlist/')
		);
	}

	function directQualityHeight(src: string, index: number) {
		const label = ctx.getOptions().sourceLabels?.[index] ?? '';
		const source = `${label} ${src}`;
		const match = source.match(/(\d{3,4})\s*p/i);
		if (!match) return 0;

		const height = Number.parseInt(match[1], 10);
		return Number.isFinite(height) ? height : 0;
	}

	function refreshDirectQualityLevels(videoSrc: string) {
		const srcList = ctx.getSrcList();
		if (isHlsSource(videoSrc) || srcList.length <= 1) {
			if (!isHlsSource(videoSrc)) qualityLevels = [];
			return;
		}

		qualityLevels = srcList
			.map((src, index) => {
				const height = directQualityHeight(src, index);
				if (!height) return null;
				return {
					height,
					displayHeight: normalizedQualityHeight(height),
					bitrate: 0,
					level: index
				};
			})
			.filter((level): level is QualityLevel => Boolean(level))
			.sort((a, b) => b.displayHeight - a.displayHeight);
		currentQuality = ctx.getCurrentSrcIndex();
		activeQualityHeight = directQualityHeight(videoSrc, ctx.getCurrentSrcIndex());
	}

	function resumePlayback(resumeTime?: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl || resumeTime === undefined) return;

		const seekFn = () => {
			const activeVideo = ctx.getVideoEl();
			if (!activeVideo) return;
			if (isFinite(activeVideo.duration) && activeVideo.duration > 0) {
				activeVideo.currentTime = Math.min(resumeTime, activeVideo.duration - 1);
			} else {
				activeVideo.currentTime = resumeTime;
			}
		};

		if (isFinite(videoEl.duration) && videoEl.duration > 0) seekFn();
		else videoEl.addEventListener('loadedmetadata', seekFn, { once: true });
	}

	async function setupHls(videoSrc: string, resumeTime?: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl || !videoSrc) return;

		destroyHls();
		errorMessage = '';
		qualityLevels = [];
		activeQualityHeight = 0;
		ctx.resetHlsSubtitleMode();
		await ctx.buildSubtitleList();

		if (!isHlsSource(videoSrc)) {
			refreshDirectQualityLevels(videoSrc);
			videoEl.src = videoSrc;
			resumePlayback(resumeTime);
			if (ctx.getOptions().autoPlay) videoEl.play().catch(() => {});
			return;
		}

		if (!HlsConstructor) {
			try {
				const mod = await import('hls.js');
				HlsConstructor = mod.default;
			} catch {
				videoEl.src = videoSrc;
				if (resumeTime !== undefined) videoEl.currentTime = resumeTime;
				return;
			}
		}

		if (HlsConstructor.isSupported()) {
			setupHlsJs(videoSrc, resumeTime);
		} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
			videoEl.src = videoSrc;
			resumePlayback(resumeTime);
			if (ctx.getOptions().autoPlay) videoEl.play().catch(() => {});
		} else {
			errorMessage = 'Browser ini tidak mendukung video HLS.';
		}
	}

	function setupHlsJs(videoSrc: string, resumeTime?: number) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;

		const hls = new HlsConstructor({
			enableWorker: true,
			lowLatencyMode: false,
			backBufferLength: 90
		});

		hls.loadSource(videoSrc);
		hls.attachMedia(videoEl);
		hlsInstance = hls;

		hls.on(
			HlsConstructor.Events.MANIFEST_PARSED,
			(_: unknown, data: { levels: { height: number; bitrate: number }[] }) => {
				setTimeout(() => {
					const seen = new Map<number, QualityLevel>();
					data.levels.forEach((level, i) => {
						const displayHeight = normalizedQualityHeight(level.height);
						if (!displayHeight) return;
						const existing = seen.get(displayHeight);
						if (!existing || level.bitrate > existing.bitrate) {
							seen.set(displayHeight, {
								height: level.height,
								displayHeight,
								bitrate: level.bitrate,
								level: i
							});
						}
					});
					qualityLevels = Array.from(seen.values()).sort(
						(a, b) => b.displayHeight - a.displayHeight
					);
					applyAutoLevelCap();
					const currentLevel = hls.currentLevel >= 0 ? hls.currentLevel : hls.loadLevel;
					activeQualityHeight = hls.levels?.[currentLevel]?.height ?? qualityLevels[0]?.height ?? 0;
				}, 0);

				if (currentQuality !== -1 && currentQuality < data.levels.length) {
					hls.currentLevel = currentQuality;
				}
				resumePlayback(resumeTime);
				if (ctx.getOptions().autoPlay)
					ctx
						.getVideoEl()
						?.play()
						.catch(() => {});
			}
		);

		hls.on(
			HlsConstructor.Events.SUBTITLE_TRACKS_UPDATED,
			(_: unknown, data: { subtitleTracks: { name: string; lang?: string; id: number }[] }) => {
				if (!data.subtitleTracks || data.subtitleTracks.length === 0) return;
				setTimeout(() => ctx.setHlsSubtitleTracks(data.subtitleTracks, hls), 0);
			}
		);

		hls.on(HlsConstructor.Events.LEVEL_SWITCHING, (_: unknown, data: { level: number }) => {
			const height = hls.levels?.[data.level]?.height ?? 0;
			activeQualityHeight = height || activeQualityHeight;
			if (!height || height === lastNotifiedHeight) return;
			startQualitySwitch();
		});

		hls.on(HlsConstructor.Events.LEVEL_SWITCHED, (_: unknown, data: { level: number }) => {
			finishQualitySwitch();
			const level = hls.levels?.[data.level];
			const height = level?.height ?? 0;
			activeQualityHeight = height || activeQualityHeight;
			const video = ctx.getVideoEl();
			if (!height || height === lastNotifiedHeight || (video?.currentTime ?? 0) < 1) return;
			lastNotifiedHeight = height;
			ctx.notify?.(`Resolusi berubah ke ${qualityLabel(height)}`);
		});

		hls.on(HlsConstructor.Events.ERROR, (_: unknown, data: { fatal: boolean }) => {
			if (!data.fatal) return;
			const video = ctx.getVideoEl();
			const resumeAt = video?.currentTime ?? 0;
			const srcList = ctx.getSrcList();
			const currentSrcIndex = ctx.getCurrentSrcIndex();

			if (currentSrcIndex < srcList.length - 1) {
				ctx.setCurrentSrcIndex(currentSrcIndex + 1);
				setupHls(srcList[currentSrcIndex + 1], resumeAt);
			} else {
				errorMessage = 'Video tidak bisa dimuat. Coba refresh halaman.';
			}
		});
	}

	function setQuality(level: number) {
		if (qualityLocked(level)) {
			showLockedQualityPrompt();
			return false;
		}

		if (!hlsInstance && qualityLevels.length > 0) {
			const nextSrc = ctx.getSrcList()[level];
			const video = ctx.getVideoEl();
			if (!nextSrc || !video) return false;

			currentQuality = level;
			ctx.setCurrentSrcIndex(level);
			setupHls(nextSrc, video.currentTime);
			ctx.notify?.(`Quality: ${currentQualityLabel()}`);
			persistQuality();
			return true;
		}

		currentQuality = level;
		if (hlsInstance) {
			applyAutoLevelCap();
			const video = ctx.getVideoEl();
			const canSmooth = level !== -1 && smoothSwitchEnabled() && !!video && video.currentTime > 0;
			if (canSmooth) {
				startQualitySwitch();
				hlsInstance.nextLevel = level;
			} else {
				hlsInstance.currentLevel = level;
			}
		}
		ctx.notify?.(level === -1 ? 'Quality: Auto' : `Quality: ${currentQualityLabel()}`);
		persistQuality();
		return true;
	}

	function currentQualityLabel(): string {
		if (currentQuality === -1) return 'Auto';
		const q = qualityLevels.find((level) => level.level === currentQuality);
		return q ? qualityLabel(q.height).toUpperCase() : 'Auto';
	}

	function currentResolutionLabel(): string {
		if (currentQuality === -1)
			return activeQualityHeight ? `AUTO ${qualityLabel(activeQualityHeight).toUpperCase()}` : 'AUTO';
		return currentQualityLabel();
	}

	function hasAutoQuality() {
		return Boolean(hlsInstance);
	}

	return {
		loadPersistedQuality,
		setupHls,
		destroyHls,
		setQuality,
		refreshQualityAccess,
		currentQualityLabel,
		currentResolutionLabel,
		hasAutoQuality,
		qualityLocked,
		get hlsInstance() {
			return hlsInstance;
		},
		get qualityLevels() {
			return qualityLevels;
		},
		get currentQuality() {
			return currentQuality;
		},
		get activeQualityHeight() {
			return activeQualityHeight;
		},
		get isQualitySwitching() {
			return isQualitySwitching;
		},
		get errorMessage() {
			return errorMessage;
		}
	};
}
