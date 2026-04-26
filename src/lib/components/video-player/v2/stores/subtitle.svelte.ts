import type { SubtitleTrack, VideoPlayerOptions } from './types';
import { srtToVtt, timeToSeconds } from './utils';

interface SubtitleContext {
	getOptions: () => VideoPlayerOptions;
	getVideoEl: () => HTMLVideoElement | undefined;
	getHlsInstance: () => any;
	getCurrentSrc: () => string;
	getCurrentTime: () => number;
}

type ManualSubtitleCue = {
	startTime: number;
	endTime: number;
	text: string[];
};

export function createSubtitleManager(ctx: SubtitleContext) {
	let activeSubtitleIndex = $state(-1);
	let allSubtitles = $state<SubtitleTrack[]>([]);
	let activeCueText = $state<string[]>([]);
	let hlsSubtitleMode = $state(false);

	let subtitleBlobUrls: string[] = [];
	let manualCuesBySrc = new Map<string, ManualSubtitleCue[]>();
	let subtitleBuildId = 0;
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

	function stripCueMarkup(text: string) {
		return text.replace(/<[^>]+>/g, '').trim();
	}

	function parseVttCues(vttText: string): ManualSubtitleCue[] {
		const normalized = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
		const blocks = normalized.split(/\n{2,}/);
		const cues: ManualSubtitleCue[] = [];

		for (const block of blocks) {
			const lines = block
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean);
			const timingIndex = lines.findIndex((line) => line.includes('-->'));
			if (timingIndex === -1) continue;

			const [rawStart, rawEnd = ''] = lines[timingIndex].split('-->');
			const startTime = timeToSeconds(rawStart);
			const endTime = timeToSeconds(rawEnd.trim().split(/\s+/)[0] ?? '');
			const text = lines
				.slice(timingIndex + 1)
				.map(stripCueMarkup)
				.filter(Boolean);

			if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
				cues.push({ startTime, endTime, text });
			}
		}

		return cues;
	}

	function parseDataVtt(url: string) {
		const commaIndex = url.indexOf(',');
		if (commaIndex === -1) return '';
		const meta = url.slice(0, commaIndex);
		const payload = url.slice(commaIndex + 1);
		return meta.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
	}

	async function fetchAndNormalize(
		url: string,
		blobUrls: string[],
		cuesBySrc: Map<string, ManualSubtitleCue[]>
	): Promise<string> {
		if (url.startsWith('data:text/vtt')) {
			cuesBySrc.set(url, parseVttCues(parseDataVtt(url)));
			return url;
		}

		if (url.startsWith('blob:')) {
			return url;
		}
		const res = await fetch(url);
		if (!res.ok) throw new Error('Subtitle fetch failed: ' + res.status);
		const text = await res.text();
		const vttText = text.trimStart().startsWith('WEBVTT') ? text : srtToVtt(text);
		const blob = new Blob([vttText], { type: 'text/vtt' });
		const blobUrl = URL.createObjectURL(blob);
		blobUrls.push(blobUrl);
		cuesBySrc.set(blobUrl, parseVttCues(vttText));
		return blobUrl;
	}

	function revokeSubtitleBlobs() {
		subtitleBlobUrls.forEach((url) => URL.revokeObjectURL(url));
		subtitleBlobUrls = [];
		manualCuesBySrc = new Map();
	}

	function cleanupCueListener() {
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}
		activeCueText = [];
	}

	async function buildSubtitleList() {
		const buildId = ++subtitleBuildId;
		const createdBlobUrls: string[] = [];
		const createdCuesBySrc = new Map<string, ManualSubtitleCue[]>();
		cleanupCueListener();

		const normalized = await Promise.all(
			manualSubtitleTracks().map(async (track) => {
				if (!track.src) return track;
				try {
					return {
						...track,
						src: await fetchAndNormalize(track.src, createdBlobUrls, createdCuesBySrc)
					};
				} catch (e) {
					console.warn('[VideoPlayer] Gagal load subtitle:', track.src, e);
					return track;
				}
			})
		);

		if (buildId !== subtitleBuildId) {
			createdBlobUrls.forEach((url) => URL.revokeObjectURL(url));
			return;
		}

		revokeSubtitleBlobs();
		subtitleBlobUrls = createdBlobUrls;
		manualCuesBySrc = createdCuesBySrc;
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
		const normalizedManualTracks = allSubtitles.filter((track) => track.src);
		allSubtitles = [
			...hlsTracks,
			...(normalizedManualTracks.length > 0 ? normalizedManualTracks : manualSubtitleTracks())
		];
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

	function syncParsedCueText(trackIndex: number) {
		const track = allSubtitles[trackIndex];
		if (!track?.src) return false;

		const cues = manualCuesBySrc.get(track.src);
		if (!cues) return false;

		const currentTime = ctx.getCurrentTime();
		activeCueText = cues
			.filter((cue) => currentTime >= cue.startTime && currentTime < cue.endTime)
			.flatMap((cue) => cue.text);
		return true;
	}

	function syncManualTrackSelection(manualIndex: number, trackIndex: number, attempts = 0) {
		const videoEl = ctx.getVideoEl();
		if (!videoEl) return;

		const manualTrackEls = Array.from(videoEl.querySelectorAll('track'));
		const manualTextTracks = Array.from(videoEl.textTracks).filter(
			(track) => track.kind === 'subtitles' && !track.label?.startsWith('hls')
		);

		const usesParsedCues = syncParsedCueText(trackIndex);
		manualTextTracks.forEach((track, i) => {
			if (!usesParsedCues && i === manualIndex) setupCueListener(track);
			else track.mode = 'hidden';
		});

		if (usesParsedCues) return;

		const activeTrackEl = manualTrackEls[manualIndex] as HTMLTrackElement | undefined;
		const activeTextTrack = manualTextTracks[manualIndex];
		const isReady =
			!!activeTrackEl &&
			(activeTrackEl.readyState >= 2 ||
				(activeTextTrack?.cues && typeof activeTextTrack.cues.length === 'number'));

		if (isReady || attempts >= 20) return;

		setTimeout(() => syncManualTrackSelection(manualIndex, trackIndex, attempts + 1), 80);
	}

	function preferredSubtitleIndex() {
		const subtitleConfig = ctx.getOptions().config?.subtitle;
		if (subtitleConfig?.enabled === false || allSubtitles.length === 0) return -1;

		const preferredLang = subtitleConfig?.defaultLanguage?.trim().toLowerCase();
		if (preferredLang) {
			const index = allSubtitles.findIndex((track) => track.lang.toLowerCase() === preferredLang);
			if (index !== -1) return index;
		}

		return 0;
	}

	function syncActiveCues() {
		if (activeSubtitleIndex === -1) return;
		if (hlsSubtitleMode && ctx.getHlsInstance()) {
			const hlsTrackCount = ctx.getHlsInstance().subtitleTracks?.length ?? 0;
			if (activeSubtitleIndex < hlsTrackCount) return;
		}
		syncParsedCueText(activeSubtitleIndex);
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
				if (videoEl) syncManualTrackSelection(manualOffset, index);
			}
			return;
		}

		if (!videoEl) return;
		syncManualTrackSelection(index, index);
	}

	function destroy() {
		subtitleBuildId++;
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
		preferredSubtitleIndex,
		syncActiveCues,
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
