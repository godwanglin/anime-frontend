import type { SubtitleTrack, VideoPlayerOptions } from './types';
import { srtToVtt } from './utils';

interface SubtitleContext {
	getOptions: () => VideoPlayerOptions;
	getVideoEl: () => HTMLVideoElement | undefined;
	getHlsInstance: () => any;
	getCurrentSrc: () => string;
}

export function createSubtitleManager(ctx: SubtitleContext) {
	let activeSubtitleIndex = $state(-1);
	let allSubtitles = $state<SubtitleTrack[]>([]);
	let activeCueText = $state<string[]>([]);
	let hlsSubtitleMode = $state(false);

	let subtitleBlobUrls: string[] = [];
	let cueChangeCleanup: (() => void) | null = null;

	function manualSubtitleTracks(): SubtitleTrack[] {
		const options = ctx.getOptions();
		const serverTracks = options.subtitlesBySrc?.[ctx.getCurrentSrc()] ?? [];
		return [
			...serverTracks,
			...(options.subtitles ?? []),
			...(options.subtitleUrl
				? [
						{
							label: options.subtitleUrl.label ?? 'Subtitle',
							lang: options.subtitleUrl.lang ?? 'und',
							src: options.subtitleUrl.url
						}
					]
				: [])
		].filter(
			(track, index, tracks) =>
				tracks.findIndex((item) => item.lang === track.lang && item.src === track.src) === index
		);
	}

	async function fetchAndNormalize(url: string): Promise<string> {
		if (url.startsWith('blob:') || url.startsWith('data:text/vtt')) {
			return url;
		}
		const res = await fetch(url);
		if (!res.ok) throw new Error('Subtitle fetch failed: ' + res.status);
		const text = await res.text();
		const vttText = text.trimStart().startsWith('WEBVTT') ? text : srtToVtt(text);
		const blob = new Blob([vttText], { type: 'text/vtt' });
		const blobUrl = URL.createObjectURL(blob);
		subtitleBlobUrls.push(blobUrl);
		return blobUrl;
	}

	function revokeSubtitleBlobs() {
		subtitleBlobUrls.forEach((url) => URL.revokeObjectURL(url));
		subtitleBlobUrls = [];
	}

	function cleanupCueListener() {
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}
		activeCueText = [];
	}

	async function buildSubtitleList() {
		revokeSubtitleBlobs();
		cleanupCueListener();

		const normalized = await Promise.all(
			manualSubtitleTracks().map(async (track) => {
				if (!track.src) return track;
				try {
					return { ...track, src: await fetchAndNormalize(track.src) };
				} catch (e) {
					console.warn('[VideoPlayer] Gagal load subtitle:', track.src, e);
					return track;
				}
			})
		);

		allSubtitles = normalized;
	}

	function resetHlsSubtitleMode() {
		hlsSubtitleMode = false;
	}

	function setHlsSubtitleTracks(tracks: { name: string; lang?: string; id: number }[], hls: any) {
		if (!tracks || tracks.length === 0) return;
		hlsSubtitleMode = true;
		const hlsTracks: SubtitleTrack[] = tracks.map((track) => ({
			label: track.name || (track.lang ?? 'Subtitle'),
			lang: track.lang ?? 'und',
			src: ''
		}));
		allSubtitles = [...hlsTracks, ...manualSubtitleTracks()];
		hls.subtitleTrack = -1;
	}

	function setupCueListener(track: TextTrack) {
		cleanupCueListener();
		track.mode = 'hidden';

		const handler = () => {
			if (!track.activeCues || track.activeCues.length === 0) {
				activeCueText = [];
				return;
			}
			activeCueText = Array.from(track.activeCues)
				.map((cue) => (cue as VTTCue).text?.replace(/<[^>]+>/g, '').trim() ?? '')
				.filter(Boolean);
		};

		track.addEventListener('cuechange', handler);
		cueChangeCleanup = () => track.removeEventListener('cuechange', handler);
		handler();
	}

	function syncManualTrackSelection(manualIndex: number, attempts = 0) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;

		const manualTrackEls = Array.from(videoEl.querySelectorAll('track'));
		const manualTextTracks = Array.from(videoEl.textTracks).filter(
			(track) => track.kind === 'subtitles' && !track.label?.startsWith('hls')
		);

		manualTextTracks.forEach((track, i) => {
			if (i === manualIndex) setupCueListener(track);
			else track.mode = 'hidden';
		});

		const activeTrackEl = manualTrackEls[manualIndex] as HTMLTrackElement | undefined;
		const activeTextTrack = manualTextTracks[manualIndex];
		const isReady =
			!!activeTrackEl &&
			(activeTrackEl.readyState >= 2 ||
				(activeTextTrack?.cues && typeof activeTextTrack.cues.length === 'number'));

		if (isReady || attempts >= 20) return;

		setTimeout(() => syncManualTrackSelection(manualIndex, attempts + 1), 80);
	}

	function applySubtitle(index: number) {
		activeSubtitleIndex = index;
		cleanupCueListener();

		const videoEl = ctx.getVideoEl();
		const hlsInstance = ctx.getHlsInstance();

		if (index === -1) {
			if (hlsInstance) hlsInstance.subtitleTrack = -1;
			if (videoEl) {
				const tracks = videoEl.textTracks;
				for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'hidden';
			}
			return;
		}

		if (hlsSubtitleMode && hlsInstance) {
			const hlsTrackCount = hlsInstance.subtitleTracks?.length ?? 0;
			if (index < hlsTrackCount) {
				hlsInstance.subtitleDisplay = true;
				hlsInstance.subtitleTrack = index;
				const trySetupHlsCue = (attempts = 0) => {
					const activeVideo = ctx.getVideoEl();
					if (!activeVideo) return;
					const activeTrack = Array.from(activeVideo.textTracks).find(
						(track) => track.kind === 'subtitles' || track.kind === 'captions'
					);
					if (activeTrack) {
						setupCueListener(activeTrack);
					} else if (attempts < 10) {
						setTimeout(() => trySetupHlsCue(attempts + 1), 150);
					}
				};
				setTimeout(trySetupHlsCue, 100);
			} else {
				hlsInstance.subtitleTrack = -1;
				const manualOffset = index - hlsTrackCount;
				if (videoEl) syncManualTrackSelection(manualOffset);
			}
			return;
		}

		if (!videoEl) return;
		syncManualTrackSelection(index);
	}

	function destroy() {
		cleanupCueListener();
		revokeSubtitleBlobs();
	}

	return {
		buildSubtitleList,
		resetHlsSubtitleMode,
		setHlsSubtitleTracks,
		cleanupCueListener,
		revokeSubtitleBlobs,
		applySubtitle,
		destroy,
		get activeSubtitleIndex() {
			return activeSubtitleIndex;
		},
		get allSubtitles() {
			return allSubtitles;
		},
		get activeCueText() {
			return activeCueText;
		}
	};
}
