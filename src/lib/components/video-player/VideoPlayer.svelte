<script lang="ts">
	import { onMount } from 'svelte';

	import './vp.css';
	// ─── Types ───────────────────────────────────────────────────────────────────

	interface SubtitleTrack {
		label: string;
		lang: string;
		src: string;
	}

	interface SubtitleUrlProp {
		url: string;
		lang?: string;
		label?: string;
	}

	/** Konfigurasi tampilan subtitle (style & class based) */
	interface SubtitleConfig {
		/** CSS class tambahan untuk elemen teks subtitle */
		className?: string;
		/** Warna teks, default '#fff' */
		color?: string;
		/** Ukuran font, default '1rem' */
		fontSize?: string;
		/** Font family, default 'inherit' */
		fontFamily?: string;
		/** Font weight, default '600' */
		fontWeight?: string | number;
		/** Warna background per-line, default 'rgba(0,0,0,0.72)' */
		background?: string;
		/** Border radius background, default '4px' */
		borderRadius?: string;
		/** Padding teks, default '3px 10px' */
		padding?: string;
		/** Jarak dari bawah player, default '10%' (naik saat controls muncul) */
		bottomOffset?: string;
		/** Text shadow, default '0 1px 4px rgba(0,0,0,0.9)' */
		textShadow?: string;
		/** Letter spacing, default 'normal' */
		letterSpacing?: string;
		/** Line height, default '1.45' */
		lineHeight?: string;
		/** Opacity keseluruhan overlay, default 1 */
		opacity?: number;
		/** Max-width overlay subtitle, default '90%' */
		maxWidth?: string;
	}

	/** Config global VideoPlayer */
	interface PlayerConfig {
		subtitle?: SubtitleConfig;
	}

	interface ThumbnailCue {
		start: number; // seconds
		end: number; // seconds
		url: string; // resolved image URL
		x: number;
		y: number;
		w: number;
		h: number;
	}

	interface QualityLevel {
		height: number;
		bitrate: number;
		level: number;
	}

	// ─── Props ───────────────────────────────────────────────────────────────────

	let {
		src,
		poster = '',
		title = 'Video player',
		autoPlay = false,
		subtitles = [],
		subtitleUrl,
		thumbnailUrl,
		forceHls = false,
		config = {}
	}: {
		src: string | string[];
		poster?: string;
		title?: string;
		autoPlay?: boolean;
		/** Daftar subtitle manual ({ label, lang, src }) — support .vtt & .srt */
		subtitles?: SubtitleTrack[];
		/** Single subtitle URL shorthand */
		subtitleUrl?: SubtitleUrlProp;
		thumbnailUrl?: string;
		/** Paksa gunakan HLS.js meski URL tidak berekstensi .m3u8 */
		forceHls?: boolean;
		/** Konfigurasi player: subtitle styling, dll */
		config?: PlayerConfig;
	} = $props();

	// Shorthand config resolver
	const subCfg = $derived(config?.subtitle ?? {});

	// ─── Multi-src state ─────────────────────────────────────────────────────────

	let srcList = $derived(Array.isArray(src) ? src : [src]);
	let currentSrcIndex = $state(0);
	let currentSrc = $derived(srcList[currentSrcIndex]);

	// ─── Core video state ────────────────────────────────────────────────────────

	let videoEl = $state<HTMLVideoElement | undefined>(undefined);
	let containerEl = $state<HTMLElement | undefined>(undefined);
	let seekbarEl = $state<HTMLInputElement | undefined>(undefined);

	let isPlaying = $state(false);
	let isMuted = $state(false);
	let volume = $state(1);
	let currentTime = $state(0);
	let duration = $state(0);
	let buffered = $state(0);
	let isBuffering = $state(false);
	let isFullscreen = $state(false);
	let showControls = $state(true);
	let controlsTimer: ReturnType<typeof setTimeout> | null = null;

	// ─── Playback rate ───────────────────────────────────────────────────────────

	const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	let playbackRate = $state(1);
	let showRateMenu = $state(false);

	// ─── Quality selector ────────────────────────────────────────────────────────

	let qualityLevels = $state<QualityLevel[]>([]);
	let currentQuality = $state(-1); // -1 = auto
	let showQualityMenu = $state(false);

	// ─── Subtitle state ──────────────────────────────────────────────────────────

	let activeSubtitleIndex = $state(-1); // -1 = off
	let allSubtitles = $state<SubtitleTrack[]>([]);
	let showSubtitleMenu = $state(false);

	/** true jika subtitle berasal dari HLS.js (bukan <track> manual) */
	let hlsSubtitleMode = $state(false);

	/** Teks subtitle aktif yang ditampilkan overlay (custom renderer) */
	let activeCueText = $state<string[]>([]);

	/** Blob URL yang dibuat dari konversi SRT/fetch — untuk di-revoke saat destroy */
	let subtitleBlobUrls: string[] = [];

	/** Handler cuechange per track — di-remove saat ganti track */
	let cueChangeCleanup: (() => void) | null = null;

	// ─── Settings panel (mobile: bottom sheet, desktop: popup) ───────────────────
	let showSettings = $state(false);
	// sub-panel: null | 'speed' | 'quality' | 'subtitle'
	let settingsSubPanel = $state<'speed' | 'quality' | 'subtitle' | null>(null);

	// ─── Error state ─────────────────────────────────────────────────────────────

	let errorMessage = $state('');

	// ─── HLS instance ────────────────────────────────────────────────────────────

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let hlsInstance: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let HlsConstructor: any = null;

	// ─── Thumbnail preview state ──────────────────────────────────────────────────

	let thumbnailCues = $state<ThumbnailCue[]>([]);
	let hovering = $state(false);
	let hoverTime = $state(0);
	let hoverX = $state(0); // px offset within seekbar
	let previewCue = $state<ThumbnailCue | null>(null);
	let previewX = $state(0); // clamped left position for the preview box
	const PREVIEW_WIDTH = 160;
	const PREVIEW_HEIGHT = 90;

	// ─── Double tap state ─────────────────────────────────────────────────────────

	let tapSide = $state<'left' | 'right' | null>(null);
	let tapAccumulator = $state(0); // total seconds accumulated
	let tapTimer: ReturnType<typeof setTimeout> | null = null;
	const TAP_STEP = 10; // seconds per tap
	let tapToastVisible = $state(false);

	// Center click/dblclick detection
	let centerClickTimer: ReturnType<typeof setTimeout> | null = null;
	let centerClickCount = 0;

	// ─── Helpers ─────────────────────────────────────────────────────────────────

	function formatTime(secs: number): string {
		if (!isFinite(secs) || isNaN(secs)) return '0:00';
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = Math.floor(secs % 60);
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function clamp(val: number, min: number, max: number): number {
		return Math.min(Math.max(val, min), max);
	}

	function timeToSeconds(ts: string): number {
		// handles HH:MM:SS.mmm and MM:SS.mmm
		const parts = ts.trim().split(':');
		let secs = 0;
		if (parts.length === 3) {
			secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
		} else if (parts.length === 2) {
			secs = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
		} else {
			secs = parseFloat(parts[0]);
		}
		return secs;
	}

	// ─── localStorage persistence ─────────────────────────────────────────────────

	function loadPersistedState() {
		try {
			const savedVol = localStorage.getItem('vp_volume');
			const savedMuted = localStorage.getItem('vp_muted');
			const savedQuality = localStorage.getItem('vp_quality');
			if (savedVol !== null) volume = parseFloat(savedVol);
			if (savedMuted !== null) isMuted = savedMuted === 'true';
			if (savedQuality !== null) currentQuality = parseInt(savedQuality, 10);
		} catch {
			// localStorage may be unavailable
		}
	}

	function persistState() {
		try {
			localStorage.setItem('vp_volume', String(volume));
			localStorage.setItem('vp_muted', String(isMuted));
			localStorage.setItem('vp_quality', String(currentQuality));
		} catch {
			// ignore
		}
	}

	// ─── VTT Thumbnail parsing ────────────────────────────────────────────────────

	async function loadThumbnails(vttUrl: string) {
		try {
			const res = await fetch(vttUrl);
			if (!res.ok) return;
			const text = await res.text();

			// Base URL for resolving relative image paths
			const base = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);

			const cues: ThumbnailCue[] = [];
			// Split by double newlines, skip WEBVTT header
			const blocks = text
				.split(/\n\s*\n/)
				.filter((b) => b.trim() && !b.trim().startsWith('WEBVTT'));

			for (const block of blocks) {
				const lines = block.trim().split('\n');
				// Find the timing line (contains -->)
				const timingLine = lines.find((l) => l.includes('-->'));
				if (!timingLine) continue;

				const [startStr, endStr] = timingLine.split('-->');
				const start = timeToSeconds(startStr.trim());
				const end = timeToSeconds(endStr.trim().split(' ')[0]);

				// Find image reference line (non-timing, non-sequence lines)
				const imgLine = lines.find(
					(l) => !l.includes('-->') && l.trim() && !/^\d+$/.test(l.trim())
				);
				if (!imgLine) continue;

				// Parse xywh fragment: sprite.jpg#xywh=x,y,w,h
				const hashIdx = imgLine.indexOf('#xywh=');
				if (hashIdx !== -1) {
					const imgPath = imgLine.substring(0, hashIdx).trim();
					const xywh = imgLine.substring(hashIdx + 6).trim();
					const [x, y, w, h] = xywh.split(',').map(Number);
					const url = imgPath.startsWith('http') ? imgPath : base + imgPath;
					cues.push({ start, end, url, x, y, w, h });
				} else {
					// No sprite, just a plain image URL
					const imgPath = imgLine.trim();
					const url = imgPath.startsWith('http') ? imgPath : base + imgPath;
					cues.push({ start, end, url, x: 0, y: 0, w: PREVIEW_WIDTH, h: PREVIEW_HEIGHT });
				}
			}

			thumbnailCues = cues;
		} catch {
			// Silently fail — thumbnailUrl is optional
		}
	}

	function findCueForTime(time: number): ThumbnailCue | null {
		for (const cue of thumbnailCues) {
			if (time >= cue.start && time < cue.end) return cue;
		}
		// If no exact match, find nearest
		if (thumbnailCues.length === 0) return null;
		let nearest = thumbnailCues[0];
		let minDist = Math.abs((nearest.start + nearest.end) / 2 - time);
		for (const cue of thumbnailCues) {
			const mid = (cue.start + cue.end) / 2;
			const dist = Math.abs(mid - time);
			if (dist < minDist) {
				minDist = dist;
				nearest = cue;
			}
		}
		return nearest;
	}

	// ─── HLS Setup ────────────────────────────────────────────────────────────────

	function destroyHls() {
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}
		activeCueText = [];
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
	}

	async function setupHls(videoSrc: string, resumeTime?: number) {
		if (!videoEl) return;

		destroyHls();
		errorMessage = '';
		qualityLevels = []; // reset kualitas dari src sebelumnya
		hlsSubtitleMode = false;
		// Reset allSubtitles ke manual tracks (prop) saja
		await buildSubtitleList();

		const isHls =
			forceHls ||
			videoSrc.includes('.m3u8') ||
			videoSrc.includes('application/vnd.apple.mpegurl') ||
			videoSrc.includes('/playlist/'); // proxy HLS endpoint pattern

		if (isHls) {
			if (!HlsConstructor) {
				try {
					const mod = await import('hls.js');
					HlsConstructor = mod.default;
				} catch {
					// Fallback to native
					videoEl.src = videoSrc;
					if (resumeTime !== undefined) videoEl.currentTime = resumeTime;
					return;
				}
			}

			if (HlsConstructor.isSupported()) {
				const hls = new HlsConstructor({
					enableWorker: true,
					lowLatencyMode: false,
					backBufferLength: 90
				});

				hls.loadSource(videoSrc);
				hls.attachMedia(videoEl);
				hlsInstance = hls;

				// Quality levels — deduplicate by height (M3U8 bisa punya banyak
				// audio group dengan resolusi sama → HLS.js report semua sebagai level)
				hls.on(
					HlsConstructor.Events.MANIFEST_PARSED,
					(_: unknown, data: { levels: { height: number; bitrate: number }[] }) => {
						setTimeout(() => {
							// Deduplicate: untuk tiap height, ambil level dengan bitrate tertinggi
							const seen = new Map<number, QualityLevel>();
							data.levels.forEach((l, i) => {
								const existing = seen.get(l.height);
								if (!existing || l.bitrate > existing.bitrate) {
									seen.set(l.height, { height: l.height, bitrate: l.bitrate, level: i });
								}
							});
							// Sort descending by height
							qualityLevels = Array.from(seen.values()).sort((a, b) => b.height - a.height);
						}, 0);

						// Restore persisted quality
						if (currentQuality !== -1 && currentQuality < data.levels.length) {
							hls.currentLevel = currentQuality;
						}

						// Resume time after fallback
						if (resumeTime !== undefined && resumeTime > 0) {
							const seekFn = () => {
								if (videoEl && isFinite(videoEl.duration) && videoEl.duration > 0) {
									videoEl.currentTime = Math.min(resumeTime, videoEl.duration - 1);
								}
							};
							if (videoEl && isFinite(videoEl.duration) && videoEl.duration > 0) {
								seekFn();
							} else {
								videoEl?.addEventListener('loadedmetadata', seekFn, { once: true });
							}
						}

						if (autoPlay) videoEl?.play().catch(() => {});
					}
				);

				// Subtitle tracks dari HLS.js (#EXT-X-MEDIA TYPE=SUBTITLES)
				hls.on(
					HlsConstructor.Events.SUBTITLE_TRACKS_UPDATED,
					(_: unknown, data: { subtitleTracks: { name: string; lang?: string; id: number }[] }) => {
						if (!data.subtitleTracks || data.subtitleTracks.length === 0) return;
						setTimeout(() => {
							hlsSubtitleMode = true;
							// Map HLS subtitle tracks ke format allSubtitles (src kosong, id disimpan di lang field sementara)
							const hlsTracks: SubtitleTrack[] = data.subtitleTracks.map((t) => ({
								label: t.name || (t.lang ?? 'Subtitle'),
								lang: t.lang ?? 'und',
								src: '' // HLS.js manages delivery, no manual src needed
							}));
							// Prepend ke allSubtitles (prop subtitles manual tetap dipertahankan di akhir)
							const manualTracks: SubtitleTrack[] = [
								...subtitles,
								...(subtitleUrl
									? [
											{
												label: subtitleUrl.label ?? 'Subtitle',
												lang: subtitleUrl.lang ?? 'und',
												src: subtitleUrl.url
											}
										]
									: [])
							];
							allSubtitles = [...hlsTracks, ...manualTracks];
							// Auto-disable HLS subtitle by default (user harus pilih manual)
							hls.subtitleTrack = -1;
						}, 0);
					}
				);

				// Fatal error → try fallback src
				hls.on(
					HlsConstructor.Events.ERROR,
					(_: unknown, data: { fatal: boolean; type: string }) => {
						if (data.fatal) {
							const resumeAt = videoEl?.currentTime ?? 0;
							if (currentSrcIndex < srcList.length - 1) {
								currentSrcIndex++;
								setupHls(srcList[currentSrcIndex], resumeAt);
							} else {
								errorMessage = 'Video tidak bisa dimuat. Coba refresh halaman.';
							}
						}
					}
				);
			} else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
				// Safari native HLS
				videoEl.src = videoSrc;
				if (resumeTime !== undefined) videoEl.currentTime = resumeTime;
				if (autoPlay) videoEl.play().catch(() => {});
			} else {
				errorMessage = 'Browser ini tidak mendukung video HLS.';
			}
		} else {
			// MP4 / WebM / etc.
			videoEl.src = videoSrc;
			if (resumeTime !== undefined) videoEl.currentTime = resumeTime;
			if (autoPlay) videoEl.play().catch(() => {});
		}
	}

	// ─── Quality change ───────────────────────────────────────────────────────────

	function setQuality(level: number) {
		currentQuality = level;
		if (hlsInstance) {
			hlsInstance.currentLevel = level; // -1 = auto
		}
		showQualityMenu = false;
		persistState();
	}

	function currentQualityLabel(): string {
		if (currentQuality === -1) return 'Auto';
		const q = qualityLevels.find((l) => l.level === currentQuality);
		return q ? `${q.height}p` : 'Auto';
	}

	// ─── Subtitle setup ───────────────────────────────────────────────────────────

	/** Konversi SRT ke WebVTT (pure client-side) */
	function srtToVtt(srt: string): string {
		const cleaned = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
		const body = cleaned
			.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
			.replace(/^\d+\s*\n(?=\d{2}:\d{2}:\d{2}\.)/gm, '');
		return 'WEBVTT\n\n' + body;
	}

	/** Fetch subtitle, auto-detect SRT vs VTT, return blob URL */
	async function fetchAndNormalize(url: string): Promise<string> {
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
		subtitleBlobUrls.forEach((u) => URL.revokeObjectURL(u));
		subtitleBlobUrls = [];
	}

	async function buildSubtitleList() {
		revokeSubtitleBlobs();
		activeCueText = [];
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}

		const rawTracks: SubtitleTrack[] = [
			...subtitles,
			...(subtitleUrl
				? [
						{
							label: subtitleUrl.label ?? 'Subtitle',
							lang: subtitleUrl.lang ?? 'und',
							src: subtitleUrl.url
						}
					]
				: [])
		];

		// Fetch + normalize semua track (SRT -> VTT blob URL)
		const normalized: SubtitleTrack[] = await Promise.all(
			rawTracks.map(async (t) => {
				if (!t.src) return t; // HLS track (src kosong) - skip
				try {
					return { ...t, src: await fetchAndNormalize(t.src) };
				} catch (e) {
					console.warn('[VideoPlayer] Gagal load subtitle:', t.src, e);
					return t;
				}
			})
		);

		allSubtitles = normalized;
	}

	/**
	 * Setup cuechange listener untuk custom subtitle renderer.
	 * Track di-set ke mode 'hidden' agar native browser render tidak muncul
	 * (kita render sendiri via overlay div dengan styling dari config).
	 */
	function setupCueListener(track: TextTrack) {
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}
		activeCueText = [];
		track.mode = 'hidden'; // nonaktifkan native render

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
	}

	function applySubtitle(index: number) {
		activeSubtitleIndex = index;
		showSubtitleMenu = false;

		// Reset cue text & cleanup listener lama
		activeCueText = [];
		if (cueChangeCleanup) {
			cueChangeCleanup();
			cueChangeCleanup = null;
		}

		if (index === -1) {
			// --- OFF ---
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
				// HLS.js managed subtitle
				hlsInstance.subtitleDisplay = true;
				hlsInstance.subtitleTrack = index;
				// Tunggu track tersedia di videoEl.textTracks, lalu setup listener
				const trySetupHlsCue = (attempts = 0) => {
					if (!videoEl) return;
					const textTracks = Array.from(videoEl.textTracks);
					// HLS.js meng-inject track ke videoEl — cari yang mode bukan 'disabled'
					const activeTrack = textTracks.find(
						(t) => t.kind === 'subtitles' || t.kind === 'captions'
					);
					if (activeTrack) {
						setupCueListener(activeTrack);
					} else if (attempts < 10) {
						setTimeout(() => trySetupHlsCue(attempts + 1), 150);
					}
				};
				setTimeout(trySetupHlsCue, 100);
			} else {
				// Manual <track> di bawah HLS mode
				hlsInstance.subtitleTrack = -1;
				const manualOffset = index - hlsTrackCount;
				if (videoEl) {
					const videoTracks = Array.from(videoEl.textTracks);
					// Filter hanya track manual (bukan yang di-inject HLS.js)
					const manualTracks = videoTracks.filter(
						(t) => t.kind === 'subtitles' && !t.label?.startsWith('hls')
					);
					manualTracks.forEach((t, i) => {
						if (i === manualOffset) setupCueListener(t);
						else {
							t.mode = 'hidden';
						}
					});
				}
			}
		} else {
			// Non-HLS: gunakan <track> element biasa
			if (!videoEl) return;
			const tracks = Array.from(videoEl.textTracks);
			tracks.forEach((t, i) => {
				if (i === index) setupCueListener(t);
				else {
					t.mode = 'hidden';
				}
			});
		}
	}

	// ─── Playback controls ────────────────────────────────────────────────────────

	function toggleSettings(sub: 'speed' | 'quality' | 'subtitle' | null = null) {
		if (sub === null) {
			// Tombol gear: toggle buka/tutup panel utama
			showSettings = !showSettings;
			if (!showSettings) settingsSubPanel = null;
		} else {
			// Klik baris di main panel → masuk sub-panel
			showSettings = true;
			settingsSubPanel = settingsSubPanel === sub ? null : sub;
		}
	}

	function closeAllMenus() {
		showSettings = false;
		settingsSubPanel = null;
		showRateMenu = false;
		showQualityMenu = false;
		showSubtitleMenu = false;
	}

	function togglePlay() {
		if (!videoEl) return;
		if (videoEl.paused) {
			videoEl.play().catch(() => {});
		} else {
			videoEl.pause();
		}
	}

	function toggleMute() {
		if (!videoEl) return;
		isMuted = !isMuted;
		videoEl.muted = isMuted;
		persistState();
	}

	function setVolume(val: number) {
		if (!videoEl) return;
		volume = clamp(val, 0, 1);
		videoEl.volume = volume;
		if (volume === 0) {
			isMuted = true;
			videoEl.muted = true;
		} else if (isMuted) {
			isMuted = false;
			videoEl.muted = false;
		}
		persistState();
	}

	function seek(time: number) {
		if (!videoEl) return;
		videoEl.currentTime = clamp(time, 0, duration || 0);
	}

	function setPlaybackRate(rate: number) {
		playbackRate = rate;
		if (videoEl) videoEl.playbackRate = rate;
		showRateMenu = false;
	}

	function skipBackward() {
		seek(currentTime - 10);
	}
	function skipForward() {
		seek(currentTime + 10);
	}

	function toggleFullscreen() {
		if (!containerEl) return;
		if (!document.fullscreenElement) {
			containerEl.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	}

	// ─── Double tap logic ─────────────────────────────────────────────────────────

	function handleTap(side: 'left' | 'right') {
		if (tapTimer) clearTimeout(tapTimer);

		if (tapSide !== side) {
			// New side — reset accumulator
			tapAccumulator = TAP_STEP;
			tapSide = side;
		} else {
			tapAccumulator += TAP_STEP;
		}

		tapToastVisible = true;

		tapTimer = setTimeout(() => {
			// Execute seek
			if (tapSide === 'left') {
				seek(currentTime - tapAccumulator);
			} else {
				seek(currentTime + tapAccumulator);
			}
			// Reset
			tapSide = null;
			tapAccumulator = 0;
			tapToastVisible = false;
			tapTimer = null;
		}, 800);
	}

	function onVideoClick(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		const ratio = x / rect.width;

		if (ratio < 0.3) {
			// Kiri: setiap klik = handleTap (akumulasi)
			handleTap('left');
		} else if (ratio > 0.7) {
			// Kanan: setiap klik = handleTap (akumulasi)
			handleTap('right');
		} else {
			// Tengah: single click = play/pause, double click = fullscreen
			centerClickCount++;
			if (centerClickTimer) clearTimeout(centerClickTimer);
			centerClickTimer = setTimeout(() => {
				if (centerClickCount === 1) {
					togglePlay();
				} else {
					toggleFullscreen();
				}
				centerClickCount = 0;
				centerClickTimer = null;
			}, 280);
		}
	}

	// ─── Controls visibility ──────────────────────────────────────────────────────

	function resetControlsTimer() {
		showControls = true;
		if (controlsTimer) clearTimeout(controlsTimer);
		if (isPlaying) {
			controlsTimer = setTimeout(() => {
				showControls = false;
			}, 3000);
		}
	}

	function onMouseMove() {
		resetControlsTimer();
	}

	function onMouseLeave() {
		if (isPlaying) {
			if (controlsTimer) clearTimeout(controlsTimer);
			controlsTimer = setTimeout(() => {
				showControls = false;
			}, 1000);
		}
	}

	// ─── Seekbar hover (thumbnail preview + time tooltip) ─────────────────────────

	function onSeekbarMouseMove(e: MouseEvent) {
		if (!seekbarEl || !duration) return;
		const rect = seekbarEl.getBoundingClientRect();
		const offsetX = clamp(e.clientX - rect.left, 0, rect.width);
		const ratio = offsetX / rect.width;
		const t = ratio * duration;

		hoverX = offsetX;
		hoverTime = t;
		hovering = true;

		if (thumbnailCues.length > 0) {
			previewCue = findCueForTime(t);
			if (containerEl) {
				const containerRect = containerEl.getBoundingClientRect();
				const absoluteX = e.clientX - containerRect.left;
				const halfW = PREVIEW_WIDTH / 2;
				previewX = clamp(absoluteX - halfW, 4, containerRect.width - PREVIEW_WIDTH - 4);
			} else {
				previewX = clamp(offsetX - PREVIEW_WIDTH / 2, 4, rect.width - PREVIEW_WIDTH - 4);
			}
		}
	}

	function onSeekbarMouseLeave() {
		hovering = false;
		previewCue = null;
	}

	// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

	function onKeydown(e: KeyboardEvent) {
		// Only activate if focus is inside the player container or body
		if (!containerEl?.contains(document.activeElement) && document.activeElement !== document.body)
			return;

		switch (e.key) {
			case ' ':
			case 'k':
				e.preventDefault();
				togglePlay();
				break;
			case 'ArrowRight':
				e.preventDefault();
				skipForward();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				skipBackward();
				break;
			case 'ArrowUp':
				e.preventDefault();
				setVolume(volume + 0.1);
				break;
			case 'ArrowDown':
				e.preventDefault();
				setVolume(volume - 0.1);
				break;
			case 'm':
				toggleMute();
				break;
			case 'f':
				toggleFullscreen();
				break;
		}
	}

	// ─── Video element event handlers ─────────────────────────────────────────────

	function onPlay() {
		isPlaying = true;
		resetControlsTimer();
	}
	function onPause() {
		isPlaying = false;
		showControls = true;
		if (controlsTimer) clearTimeout(controlsTimer);
	}

	function updateBuffered() {
		if (!videoEl) return;
		if (videoEl.buffered.length > 0) {
			for (let i = videoEl.buffered.length - 1; i >= 0; i--) {
				if (videoEl.buffered.start(i) <= videoEl.currentTime) {
					buffered = videoEl.buffered.end(i);
					break;
				}
			}
		}
	}

	function onTimeUpdate() {
		if (!videoEl) return;
		currentTime = videoEl.currentTime;
		updateBuffered();
	}

	function onProgress() {
		updateBuffered();
	}

	function onLoadedMetadata() {
		if (!videoEl) return;
		duration = videoEl.duration;
		videoEl.volume = volume;
		videoEl.muted = isMuted;
		videoEl.playbackRate = playbackRate;
	}

	function onWaiting() {
		isBuffering = true;
	}
	function onCanPlay() {
		isBuffering = false;
	}
	function onPlaying() {
		isBuffering = false;
	}

	function onFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	function onVolumeChange() {
		if (!videoEl) return;
		volume = videoEl.volume;
		isMuted = videoEl.muted;
	}

	// ─── Seek input range progress fill ──────────────────────────────────────────

	let seekPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
	let bufferedPercent = $derived(duration > 0 ? (buffered / duration) * 100 : 0);
	let volumePercent = $derived(isMuted ? 0 : volume * 100);

	// ─── Lifecycle ────────────────────────────────────────────────────────────────

	onMount(() => {
		// Jalankan async init tanpa menjadikan callback onMount async
		(async () => {
			loadPersistedState();
			// buildSubtitleList() dipanggil di dalam setupHls() secara otomatis

			if (thumbnailUrl) {
				loadThumbnails(thumbnailUrl);
			}

			// Start HLS (akan memanggil buildSubtitleList di dalamnya)
			await setupHls(currentSrc);
		})();

		// Global keyboard listener
		document.addEventListener('keydown', onKeydown);
		document.addEventListener('fullscreenchange', onFullscreenChange);

		return () => {
			destroyHls();
			revokeSubtitleBlobs();
			document.removeEventListener('keydown', onKeydown);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			if (controlsTimer) clearTimeout(controlsTimer);
		};
	});

	// ─── React to src prop changes from parent ────────────────────────────────────

	let _prevSrcKey = $state('');

	$effect(() => {
		// Buat key unik dari seluruh srcList agar deteksi perubahan src prop dari parent
		const newKey = srcList.join('||');
		if (_prevSrcKey === '') {
			// Mount pertama — setupHls sudah dihandle di onMount, skip
			_prevSrcKey = newKey;
			return;
		}
		if (newKey !== _prevSrcKey) {
			_prevSrcKey = newKey;
			// Src baru dari parent: reset index, stop & destroy HLS lama, load src baru
			currentSrcIndex = 0;
			if (videoEl) {
				videoEl.pause();
			}
			destroyHls();
			setupHls(srcList[0]);
		}
	});

	// Close menus on outside click
	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (
			!target.closest('.vp-settings-panel') &&
			!target.closest('.vp-settings-btn') &&
			!target.closest('.vp-settings-wrap')
		) {
			closeAllMenus();
		}
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		return () => document.removeEventListener('click', onDocClick);
	});
</script>

<!-- ─── Markup ──────────────────────────────────────────────────────────────── -->

<div
	class="vp-container"
	bind:this={containerEl}
	onmousemove={onMouseMove}
	onmouseleave={onMouseLeave}
	role="region"
	aria-label={title}
>
	<!-- Video element -->
	<video
		bind:this={videoEl}
		class="vp-video"
		{poster}
		playsinline
		onplay={onPlay}
		onpause={onPause}
		ontimeupdate={onTimeUpdate}
		onloadedmetadata={onLoadedMetadata}
		onwaiting={onWaiting}
		oncanplay={onCanPlay}
		onplaying={onPlaying}
		onvolumechange={onVolumeChange}
		onprogress={onProgress}
		onclick={onVideoClick}
		aria-label={title}
	>
		{#each allSubtitles as track}
			{#if track.src}
				<track kind="subtitles" label={track.label} srclang={track.lang} src={track.src} />
			{/if}
		{/each}
	</video>

	<!-- Custom subtitle overlay (custom renderer, menggantikan native browser subtitle) -->
	{#if activeCueText.length > 0 && activeSubtitleIndex !== -1}
		<div
			class="vp-subtitle-overlay"
			style:bottom={showControls
				? 'calc(72px + ' + (subCfg.bottomOffset ?? '2%') + ')'
				: (subCfg.bottomOffset ?? '10%')}
			style:max-width={subCfg.maxWidth ?? '90%'}
			style:opacity={subCfg.opacity ?? 1}
			aria-live="polite"
			aria-label="Subtitle"
		>
			{#each activeCueText as line}
				<p
					class="vp-subtitle-line{subCfg.className ? ' ' + subCfg.className : ''}"
					style:color={subCfg.color ?? '#fff'}
					style:font-size={subCfg.fontSize ?? '1rem'}
					style:font-family={subCfg.fontFamily ?? 'inherit'}
					style:font-weight={String(subCfg.fontWeight ?? 600)}
					style:background={subCfg.background ?? 'rgba(0,0,0,0.72)'}
					style:border-radius={subCfg.borderRadius ?? '4px'}
					style:padding={subCfg.padding ?? '3px 10px'}
					style:text-shadow={subCfg.textShadow ?? '0 1px 4px rgba(0,0,0,0.9)'}
					style:letter-spacing={subCfg.letterSpacing ?? 'normal'}
					style:line-height={subCfg.lineHeight ?? '1.45'}
				>
					{line}
				</p>
			{/each}
		</div>
	{/if}

	<!-- Buffering spinner -->
	{#if isBuffering && !errorMessage}
		<div class="vp-spinner" aria-hidden="true">
			<div class="vp-spinner-ring"></div>
		</div>
	{/if}

	<!-- Error overlay -->
	{#if errorMessage}
		<div class="vp-error">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<p>{errorMessage}</p>
		</div>
	{/if}

	<!-- Double tap toast -->
	{#if tapToastVisible && tapSide}
		<div class="vp-tap-toast vp-tap-toast-{tapSide}" aria-hidden="true">
			{#if tapSide === 'left'}
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
					<path
						d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
					/>
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
					<path
						d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"
					/>
				</svg>
			{/if}
			<span>{tapAccumulator} detik</span>
		</div>
	{/if}

	<!-- Controls overlay -->
	<div class="vp-controls-wrapper" class:vp-controls-visible={showControls || !isPlaying}>
		<!-- Gradient overlay -->
		<div class="vp-gradient" aria-hidden="true"></div>

		<!-- Thumbnail preview -->
		{#if hovering && previewCue && thumbnailCues.length > 0}
			<div class="vp-thumb-preview" style="left: {previewX}px; bottom: 68px;" aria-hidden="true">
				<div
					class="vp-thumb-img"
					style="
            width: {PREVIEW_WIDTH}px;
            height: {PREVIEW_HEIGHT}px;
            background-image: url('{previewCue.url}');
            background-position: -{previewCue.x}px -{previewCue.y}px;
            background-size: auto;
          "
				></div>
				<span class="vp-thumb-time">{formatTime(hoverTime)}</span>
			</div>
		{/if}

		<!-- Controls bar -->
		<div class="vp-controls">
			<!-- Seekbar row -->
			<div class="vp-seekbar-row">
				<div class="vp-seekbar-track">
					<!-- Buffered fill -->
					<div class="vp-seekbar-buffered" style="width: {bufferedPercent}%"></div>
					<!-- Progress fill -->
					<div class="vp-seekbar-progress" style="width: {seekPercent}%"></div>
					<!-- Dot thumb -->
					<div class="vp-seekbar-thumb" style="left: {seekPercent}%"></div>
					<!-- Hover time tooltip (always shows when hovering, even without thumbnail) -->
					{#if hovering && !previewCue}
						<div
							class="vp-seek-tooltip"
							style="left: {clamp(
								hoverX,
								20,
								(seekbarEl?.getBoundingClientRect().width ?? 100) - 20
							)}px"
						>
							{formatTime(hoverTime)}
						</div>
					{/if}
					<!-- Range input -->
					<input
						bind:this={seekbarEl}
						type="range"
						class="vp-seekbar-range"
						min="0"
						max={duration || 100}
						step="0.1"
						value={currentTime}
						oninput={(e) => seek(parseFloat((e.target as HTMLInputElement).value))}
						onmousemove={onSeekbarMouseMove}
						onmouseleave={onSeekbarMouseLeave}
						aria-label="Seek"
						aria-valuetext={formatTime(currentTime)}
					/>
				</div>
			</div>

			<!-- Bottom row -->
			<div class="vp-bottom-row">
				<!-- Left controls -->
				<div class="vp-left-controls">
					<!-- Play/Pause -->
					<button class="vp-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
						{#if isPlaying}
							<!-- Pause icon -->
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<rect x="6" y="4" width="4" height="16" rx="1" />
								<rect x="14" y="4" width="4" height="16" rx="1" />
							</svg>
						{:else}
							<!-- Play icon -->
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<polygon points="5,3 19,12 5,21" />
							</svg>
						{/if}
					</button>

					<!-- Skip backward 10s — replay_10 style -->
					<button class="vp-btn" onclick={skipBackward} aria-label="Rewind 10 seconds">
						<span class="material-symbols-rounded"> replay_10 </span>
					</button>

					<!-- Skip forward 10s — forward_10 style -->
					<button class="vp-btn" onclick={skipForward} aria-label="Skip forward 10 seconds">
						<span class="material-symbols-rounded"> forward_10 </span>
					</button>

					<!-- Volume -->
					<div class="vp-volume-group">
						<button
							class="vp-btn"
							onclick={toggleMute}
							aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
						>
							{#if isMuted || volume === 0}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
									<line x1="23" y1="9" x2="17" y2="15" />
									<line x1="17" y1="9" x2="23" y2="15" />
								</svg>
							{:else if volume < 0.5}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
									<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
								</svg>
							{:else}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
									<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
									<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
								</svg>
							{/if}
						</button>

						<div class="vp-volume-slider-wrap">
							<div class="vp-vol-track">
								<div class="vp-vol-fill" style="width: {volumePercent}%"></div>
								<input
									type="range"
									class="vp-vol-range"
									min="0"
									max="1"
									step="0.01"
									value={isMuted ? 0 : volume}
									oninput={(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))}
									aria-label="Volume"
								/>
							</div>
						</div>
					</div>

					<!-- Time display -->
					<span class="vp-time" aria-label="Current time">
						{formatTime(currentTime)} / {formatTime(duration)}
					</span>
				</div>

				<!-- Right controls -->
				<div class="vp-right-controls">
					<!-- Multi-src indicator -->
					{#if srcList.length > 1}
						<span class="vp-src-badge" title="Source {currentSrcIndex + 1} of {srcList.length}">
							S{currentSrcIndex + 1}/{srcList.length}
						</span>
					{/if}

					<!-- Settings button + unified panel -->
					<div class="vp-settings-wrap">
						<button
							class="vp-btn vp-settings-btn"
							class:vp-settings-btn-active={showSettings}
							onclick={(e) => {
								e.stopPropagation();
								toggleSettings();
							}}
							aria-label="Settings"
							aria-expanded={showSettings}
						>
							<!-- gear icon -->
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
								/>
							</svg>
						</button>

						{#if showSettings}
							<div
								class="vp-settings-panel"
								role="dialog"
								aria-label="Settings"
								onclick={(e) => e.stopPropagation()}
							>
								{#if settingsSubPanel === null}
									<!-- Main settings list -->
									<div class="vp-settings-main">
										<!-- Speed row -->
										<button class="vp-settings-row" onclick={() => toggleSettings('speed')}>
											<span class="vp-settings-row-label">
												<svg
													viewBox="0 0 24 24"
													fill="currentColor"
													class="vp-settings-row-icon"
													aria-hidden="true"
													><path
														d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"
													/></svg
												>
												Speed
											</span>
											<span class="vp-settings-row-value">
												{playbackRate === 1 ? 'Normal' : `${playbackRate}×`}
												<svg
													viewBox="0 0 24 24"
													fill="currentColor"
													class="vp-settings-row-chevron"
													aria-hidden="true"
													><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
												>
											</span>
										</button>

										<!-- Quality row -->
										{#if qualityLevels.length > 0}
											<button class="vp-settings-row" onclick={() => toggleSettings('quality')}>
												<span class="vp-settings-row-label">
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-row-icon"
														aria-hidden="true"
														><path
															d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12zm-10-9H8v2H6v2h2v2h3v-2h2v-2h-2z"
														/></svg
													>
													Quality
												</span>
												<span class="vp-settings-row-value">
													{currentQualityLabel()}
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-row-chevron"
														aria-hidden="true"
														><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
													>
												</span>
											</button>
										{/if}

										<!-- Subtitle row -->
										{#if allSubtitles.length > 0}
											<button class="vp-settings-row" onclick={() => toggleSettings('subtitle')}>
												<span class="vp-settings-row-label">
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-row-icon"
														aria-hidden="true"
														><path
															d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"
														/></svg
													>
													Subtitle
												</span>
												<span class="vp-settings-row-value">
													{activeSubtitleIndex === -1
														? 'Off'
														: (allSubtitles[activeSubtitleIndex]?.label ?? 'On')}
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-row-chevron"
														aria-hidden="true"
														><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
													>
												</span>
											</button>
										{/if}
									</div>
								{:else if settingsSubPanel === 'speed'}
									<!-- Speed sub-panel -->
									<div class="vp-settings-subpanel">
										<button class="vp-settings-back" onclick={() => (settingsSubPanel = null)}>
											<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
												><path
													d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
												/></svg
											>
											Speed
										</button>
										<div class="vp-settings-list">
											{#each RATES as rate}
												<button
													class="vp-settings-item"
													class:vp-settings-item-active={playbackRate === rate}
													onclick={() => {
														setPlaybackRate(rate);
														settingsSubPanel = null;
													}}
												>
													{#if playbackRate === rate}<svg
															viewBox="0 0 24 24"
															fill="currentColor"
															class="vp-settings-check"
															aria-hidden="true"
															><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
														>{:else}<span class="vp-settings-check-placeholder"></span>{/if}
													{rate === 1 ? 'Normal' : `${rate}×`}
												</button>
											{/each}
										</div>
									</div>
								{:else if settingsSubPanel === 'quality'}
									<!-- Quality sub-panel -->
									<div class="vp-settings-subpanel">
										<button class="vp-settings-back" onclick={() => (settingsSubPanel = null)}>
											<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
												><path
													d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
												/></svg
											>
											Quality
										</button>
										<div class="vp-settings-list">
											<button
												class="vp-settings-item"
												class:vp-settings-item-active={currentQuality === -1}
												onclick={() => {
													setQuality(-1);
													settingsSubPanel = null;
												}}
											>
												{#if currentQuality === -1}<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-check"
														aria-hidden="true"
														><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
													>{:else}<span class="vp-settings-check-placeholder"></span>{/if}
												Auto
											</button>
											{#each qualityLevels as q}
												<button
													class="vp-settings-item"
													class:vp-settings-item-active={currentQuality === q.level}
													onclick={() => {
														setQuality(q.level);
														settingsSubPanel = null;
													}}
												>
													{#if currentQuality === q.level}<svg
															viewBox="0 0 24 24"
															fill="currentColor"
															class="vp-settings-check"
															aria-hidden="true"
															><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
														>{:else}<span class="vp-settings-check-placeholder"></span>{/if}
													{q.height}p
													{#if q.bitrate}<span class="vp-settings-item-sub"
															>{Math.round(q.bitrate / 1000)}k</span
														>{/if}
												</button>
											{/each}
										</div>
									</div>
								{:else if settingsSubPanel === 'subtitle'}
									<!-- Subtitle sub-panel -->
									<div class="vp-settings-subpanel">
										<button class="vp-settings-back" onclick={() => (settingsSubPanel = null)}>
											<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
												><path
													d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
												/></svg
											>
											Subtitle
										</button>
										<div class="vp-settings-list">
											<button
												class="vp-settings-item"
												class:vp-settings-item-active={activeSubtitleIndex === -1}
												onclick={() => {
													applySubtitle(-1);
													settingsSubPanel = null;
												}}
											>
												{#if activeSubtitleIndex === -1}<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="vp-settings-check"
														aria-hidden="true"
														><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
													>{:else}<span class="vp-settings-check-placeholder"></span>{/if}
												Off
											</button>
											{#each allSubtitles as track, i}
												<button
													class="vp-settings-item"
													class:vp-settings-item-active={activeSubtitleIndex === i}
													onclick={() => {
														applySubtitle(i);
														settingsSubPanel = null;
													}}
												>
													{#if activeSubtitleIndex === i}<svg
															viewBox="0 0 24 24"
															fill="currentColor"
															class="vp-settings-check"
															aria-hidden="true"
															><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg
														>{:else}<span class="vp-settings-check-placeholder"></span>{/if}
													{track.label}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Fullscreen -->
					<button
						class="vp-btn"
						onclick={toggleFullscreen}
						aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
					>
						{#if isFullscreen}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M8 3v3a2 2 0 0 1-2 2H3" />
								<path d="M21 8h-3a2 2 0 0 1-2-2V3" />
								<path d="M3 16h3a2 2 0 0 1 2 2v3" />
								<path d="M16 21v-3a2 2 0 0 1 2-2h3" />
							</svg>
						{:else}
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M8 3H5a2 2 0 0 0-2 2v3" />
								<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
								<path d="M3 16v3a2 2 0 0 0 2 2h3" />
								<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
