import type { PlaybackStats } from './types';

interface StatsContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getHlsInstance: () => any;
}

export function createStatsManager(ctx: StatsContext) {
	let visibleOverride = $state<boolean | null>(null);
	let stats = $state<PlaybackStats>({
		bitrate: null,
		downloadSpeed: null,
		refreshRate: null,
		audioCodec: '',
		videoCodec: '',
		resolution: '',
		droppedFrames: null
	});

	let interval: ReturnType<typeof setInterval> | null = null;
	let lastFrames = 0;
	let lastTime = performance.now();

	function start() {
		if (interval) return;
		collect();
		interval = setInterval(collect, 1000);
	}

	function destroy() {
		if (interval) clearInterval(interval);
		interval = null;
	}

	function toggleVisible(defaultVisible: boolean) {
		visibleOverride = !(visibleOverride ?? defaultVisible);
	}

	function collect() {
		const video = ctx.getVideoEl();
		const hls = ctx.getHlsInstance();
		const quality = getPlaybackQuality(video);
		const levelIndex =
			hls?.currentLevel >= 0
				? hls.currentLevel
				: hls?.loadLevel >= 0
					? hls.loadLevel
					: hls?.nextLevel;
		const level = hls?.levels?.[levelIndex];
		const now = performance.now();
		const frameDelta = quality.totalVideoFrames - lastFrames;
		const seconds = Math.max(0.001, (now - lastTime) / 1000);

		stats = {
			bitrate: level?.bitrate ?? null,
			downloadSpeed: hls?.bandwidthEstimate ?? null,
			refreshRate: frameDelta > 0 ? frameDelta / seconds : null,
			audioCodec: level?.audioCodec ?? parseCodec(level?.attrs?.CODECS, 'audio'),
			videoCodec: level?.videoCodec ?? parseCodec(level?.attrs?.CODECS, 'video'),
			resolution: video?.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : '',
			droppedFrames: quality.droppedVideoFrames
		};

		lastFrames = quality.totalVideoFrames;
		lastTime = now;
	}

	function getPlaybackQuality(video: HTMLVideoElement | undefined) {
		const fallback = { totalVideoFrames: 0, droppedVideoFrames: null as number | null };
		if (!video || typeof video.getVideoPlaybackQuality !== 'function') return fallback;
		const quality = video.getVideoPlaybackQuality();
		return {
			totalVideoFrames: quality.totalVideoFrames ?? 0,
			droppedVideoFrames: quality.droppedVideoFrames ?? null
		};
	}

	function parseCodec(codecs: string | undefined, kind: 'audio' | 'video') {
		if (!codecs) return '';
		const list = codecs.split(',').map((codec) => codec.trim());
		return (
			list.find((codec) =>
				kind === 'audio' ? codec.startsWith('mp4a') : !codec.startsWith('mp4a')
			) ?? ''
		);
	}

	return {
		start,
		destroy,
		toggleVisible,
		get visibleOverride() {
			return visibleOverride;
		},
		get stats() {
			return stats;
		}
	};
}
