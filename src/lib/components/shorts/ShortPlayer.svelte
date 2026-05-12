<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import config from '$lib/config';
	import { formatProxySources } from '$lib/format-proxy-urls';
	import { saved } from '$lib/stores/saved.svelte';
	import { videoReactions } from '$lib/stores/video-reactions.svelte';
	import { history } from '$lib/stores/history.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { markShortSlug } from '$lib/stores/short-slugs';
	import './ShortPlayer.css';
	import './ShortPlayer.sheet.css';

	type Episode = {
		id: number;
		slug: string;
		number: number;
		title?: string | null;
		description?: string | null; synopsis?: string | null; plot?: string | null;
		thumbnail?: string | null;
		videoThumbnail?: string | null;
		servers?: StreamServer[];
	};

	type Anime = {
		id: number;
		slug: string;
		title: string;
		description?: string | null; synopsis?: string | null; plot?: string | null;
		thumbnail?: string | null;
		cover?: string | null;
		bigCover?: string | null;
		status?: string | null;
		episodes?: Episode[];
	};

	type Source = {
		label: string;
		playerUrl: string;
		serverUrl: string;
	};

	type StreamServer = {
		id: number;
		label: string;
		value: string;
		isPrimary?: boolean;
	};

	type EpisodePayload = { episode: Episode; sources: Source[] };

	let { anime, episode, sources, episodes = [], currentSlug }: {
		anime: Anime;
		episode: Episode;
		sources: Source[];
		episodes?: Episode[];
		currentSlug: string;
	} = $props();

	let videoEl = $state<HTMLVideoElement>();
	let hls: any = null;
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let error = $state('');
	let progress = $state(0);
	let currentTime = $state(0);
	let duration = $state(0);
	let previewTime = $state('');
	let isFullscreen = $state(false);
	let controlsVisible = $state(true);
	let hideTimer: number | null = null;
	let pointerStart: { x: number; y: number; time: number } | null = null;
	let expanded = $state(false);
	let sheetOpen = $state(false);
	let sheetExpanded = $state(false);
	let sheetDragY = $state(0);
	let sheetDragging = $state(false);
	let sheetDragStartY: number | null = null;
	let sheetAnimDone = $state(false);
	let sourceIndex = $state(0);
	let mounted = $state(false);
	let lastLoadedSrc = '';
	let sourceSignature = '';
	let objectUrl = '';
	let preparingSource = false;
	let navigating = false;
	let feedEl = $state<HTMLElement>();
	let activeSlug = $state((() => currentSlug || episode.slug)());
	let activeEpisode = $state((() => episode)());
	let activeSources = $state((() => sources)());
	let selectedRangeIndex = $state<number | null>(null);
	const episodeCache = new Map<string, EpisodePayload>();

	const activeSource = $derived(activeSources[sourceIndex] ?? activeSources[0]);
	const src = $derived(activeSource?.playerUrl ?? '');
	const title = $derived(anime.title);
	const episodeLabel = $derived(activeEpisode?.number ? `Episode ${activeEpisode.number}` : 'Episode');
	const description = $derived(
		activeEpisode.description ??
			activeEpisode.synopsis ??
			activeEpisode.plot ??
			anime.description ??
			anime.synopsis ??
			anime.plot ??
			''
	);
	const poster = $derived(
		activeEpisode.thumbnail ??
			activeEpisode.videoThumbnail ??
			anime.bigCover ??
			anime.cover ??
			anime.thumbnail ??
			''
	);
	const sheetPoster = $derived(
		anime.thumbnail || poster || activeEpisode.thumbnail || anime.cover || anime.bigCover || ''
	);
	const seriesHref = $derived(`/anime/${anime.slug}`);
	const reaction = $derived(videoReactions.getReaction(activeEpisode?.id));
	const isSaved = $derived(saved.checkSaved(anime?.id));
	const sortedEpisodes = $derived([...episodes].filter((item) => item.slug).sort((a, b) => Number(a.number) - Number(b.number)));
	const feedEpisodes = $derived(sortedEpisodes.length ? sortedEpisodes : [activeEpisode]);
	const episodeRanges = $derived.by(() => {
		const ranges: Episode[][] = [];
		for (let index = 0; index < sortedEpisodes.length; index += 30) {
			ranges.push(sortedEpisodes.slice(index, index + 30));
		}
		return ranges;
	});
	const activeRangeIndex = $derived(
		Math.max(0, episodeRanges.findIndex((range) => range.some((item) => item.slug === activeSlug)))
	);
	const visibleRangeIndex = $derived(selectedRangeIndex ?? activeRangeIndex);
	const genre = $derived.by(() => {
		const list = (anime as any).genres as Array<{ name?: string } | string> | null | undefined;
		if (!list?.length) return null;
		const found = list.find((g) => {
			const name = typeof g === 'string' ? g : (g?.name ?? '');
			return name.toLowerCase() !== 'semua';
		});
		if (!found) return null;
		return typeof found === 'string' ? found : (found?.name ?? null);
	});
	const rating = $derived.by(() => {
		const raw = (anime as any).rating;
		if (raw === null || raw === undefined || raw === '') return null;
		return String(raw);
	});

	function isHlsSource(value: string) {
		const lower = value.toLowerCase();
		if (/\.mp4(?:$|[?#])/.test(lower)) return false;
		return (
			lower.startsWith('data:application/vnd.apple.mpegurl') ||
			/\.m3u8(?:$|[?#])/i.test(value) ||
			lower.includes('/playlist')
		);
	}

	function tryNextSource() {
		if (sourceIndex + 1 >= activeSources.length) {
			isLoading = false;
			error = 'Video gagal dimuat';
			return;
		}
		sourceIndex += 1;
		lastLoadedSrc = '';
	}

	function materializeSourceUrl(value: string) {
		if (!value.startsWith('data:application/vnd.apple.mpegurl')) return value;
		const commaIndex = value.indexOf(',');
		if (commaIndex < 0) return value;
		const playlist = decodeURIComponent(value.slice(commaIndex + 1));
		objectUrl = URL.createObjectURL(new Blob([playlist], { type: 'application/vnd.apple.mpegurl' }));
		return objectUrl;
	}

	async function setupVideo(value: string) {
		if (!videoEl || !value) return;
		destroyHls();
		preparingSource = true;
		videoEl.removeAttribute('src');
		videoEl.load();
		isLoading = true;
		error = '';
		lastLoadedSrc = value;
		const playbackUrl = materializeSourceUrl(value);
		console.info('[ShortPlayer] load video', {
			index: sourceIndex,
			total: activeSources.length,
			label: activeSource?.label,
			url: playbackUrl,
			serverUrl: activeSource?.serverUrl
		});

		if (isHlsSource(value) && !videoEl.canPlayType('application/vnd.apple.mpegurl')) {
			const mod = await import('hls.js');
			const Hls = mod.default;
			if (Hls.isSupported()) {
				hls = new Hls({
					enableWorker: true,
					lowLatencyMode: false,
					// buffer aggressively — short dramas are short enough to pre-load most of
					maxBufferLength: 90,
					maxMaxBufferLength: 180,
					maxBufferSize: 120 * 1000 * 1000, // 120 MB
					backBufferLength: 60,
					// start from highest quality available
					startLevel: -1,
					abrEwmaDefaultEstimate: 2_000_000,
				});
				hls.attachMedia(videoEl);
				hls.on(Hls.Events.MEDIA_ATTACHED, () => {
					preparingSource = false;
					hls.loadSource(playbackUrl);
				});
				hls.on(Hls.Events.MANIFEST_PARSED, () => play());
				hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean; type?: string }) => {
					if (!data.fatal) return;
					if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
						hls.recoverMediaError();
					} else {
						tryNextSource();
					}
				});
				return;
			}
		}

		videoEl.src = playbackUrl;
		preparingSource = false;
		await play();
	}

	function destroyHls() {
		hls?.destroy?.();
		hls = null;
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = '';
		}
	}

	async function play() {
		try {
			await videoEl?.play();
		} catch {
			// Browser may block autoplay; the tap handler will resume playback.
		}
	}

	function togglePlay() {
		if (!videoEl) return;
		if (videoEl.paused) play();
		else videoEl.pause();
	}

	function onTimeUpdate() {
		if (!videoEl?.duration) return;
		currentTime = videoEl.currentTime;
		duration = videoEl.duration;
		progress = (videoEl.currentTime / videoEl.duration) * 100;
	}

	function onLoadedMetadata() {
		if (!videoEl) return;
		duration = videoEl.duration || 0;
	}

	function onSeek(event: Event) {
		if (!videoEl?.duration) return;
		const next = Number((event.currentTarget as HTMLInputElement).value);
		videoEl.currentTime = (next / 100) * videoEl.duration;
		progress = next;
		previewTime = formatTime(videoEl.currentTime);
		window.setTimeout(() => {
			previewTime = '';
		}, 850);
	}

	function formatTime(seconds: number) {
		if (!Number.isFinite(seconds)) return '0:00';
		const total = Math.max(0, Math.floor(seconds));
		const minute = Math.floor(total / 60);
		const second = total % 60;
		return `${minute}:${second.toString().padStart(2, '0')}`;
	}

	async function toggleSave() {
		if (isSaved) {
			await saved.unsaveAnime(anime.id);
			return;
		}
		await saved.saveAnime({
			animeId: anime.id,
			animeSlug: anime.slug,
			animeTitle: anime.title,
			animeThumbnail: anime.thumbnail ?? poster,
			animeStatus: anime.status ?? ''
		});
	}

	function episodeHref(item: Episode) {
		return `/short/${anime.slug}/${item.slug}`;
	}

	function rangeLabel(range: Episode[]) {
		const first = range[0]?.number ?? 1;
		const last = range[range.length - 1]?.number ?? first;
		return `${first}–${last}`;
	}

	function isMobileViewport() {
		if (typeof window === 'undefined') return false;
		if (window.matchMedia('(pointer: coarse)').matches) return true;
		return window.innerWidth <= 900;
	}

	async function toggleFullscreen() {
		const target = feedEl ?? document.documentElement;
		const orientation = (screen as any).orientation;

		if (document.fullscreenElement) {
			try {
				orientation?.unlock?.();
			} catch {
				// orientation lock may not be available
			}
			void document.exitFullscreen().catch(() => null);
			return;
		}

		try {
			await target.requestFullscreen?.();
		} catch {
			return;
		}

		if (isMobileViewport()) {
			try {
				await orientation?.lock?.('landscape');
			} catch {
				// Safari/iOS or unsupported — silently ignore
			}
		}
	}

	function onFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	function scheduleHideControls() {
		if (typeof window === 'undefined') return;
		if (hideTimer != null) window.clearTimeout(hideTimer);
		if (!isPlaying) return;
		hideTimer = window.setTimeout(() => {
			controlsVisible = false;
			hideTimer = null;
		}, 2000);
	}

	function showControls() {
		controlsVisible = true;
		scheduleHideControls();
	}

	function onStagePointerDown(event: PointerEvent) {
		pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
	}

	function onStagePointerUp(event: PointerEvent) {
		const start = pointerStart;
		pointerStart = null;
		if (!start) return;

		const dx = Math.abs(event.clientX - start.x);
		const dy = Math.abs(event.clientY - start.y);
		const dt = performance.now() - start.time;
		if (dx > 8 || dy > 8 || dt > 500) return;

		const target = event.target as HTMLElement | null;
		if (target?.closest('button, a, input, .short-progress-bar')) {
			showControls();
			return;
		}

		if (!controlsVisible) {
			showControls();
			return;
		}
		togglePlay();
		showControls();
	}

	function replaceEpisodeUrl(item: Episode) {
		if (typeof window === 'undefined') return;
		const nextUrl = episodeHref(item);
		if (window.location.pathname === nextUrl) return;
		window.history.replaceState(window.history.state, '', nextUrl);
	}

	function pickEpisodePayload(payload: unknown) {
		if (!payload || typeof payload !== 'object') return null;
		const body = payload as Record<string, unknown>;
		return (body.data ?? body) as Record<string, unknown>;
	}

	async function loadEpisodePayload(item: Episode): Promise<EpisodePayload | null> {
		const cached = episodeCache.get(item.slug);
		if (cached) return cached;

		try {
			const response = await fetch(
				`${config.API_BASE_URL}/api/anime/${anime.slug}/${item.slug}`,
				{ credentials: 'include' }
			);
			const payload = await response.json().catch(() => null);
			if (!response.ok) return null;

			const detail = pickEpisodePayload(payload);
			const nextEpisode = ((detail?.episode as Episode | undefined) ?? item) as Episode;
			const servers = (((detail?.servers as StreamServer[] | undefined) ??
				nextEpisode.servers ??
				[]) as StreamServer[]).filter((server) => server.value);
			const nextSources = formatProxySources(servers) as Source[];
			if (!nextSources.length) return null;

			const nextPayload = { episode: nextEpisode, sources: nextSources };
			episodeCache.set(item.slug, nextPayload);
			return nextPayload;
		} catch {
			return null;
		}
	}

	function scrollToEpisode(slug: string) {
		window.setTimeout(() => {
			feedEl
				?.querySelector<HTMLElement>(`[data-episode-slug="${CSS.escape(slug)}"]`)
				?.scrollIntoView({ block: 'start' });
		}, 0);
	}

	async function activateEpisode(item: Episode, scrollIntoView = false) {
		if (item.slug === activeSlug) {
			sheetOpen = false;
			return;
		}

		navigating = true;
		void saveHistory();
		stopHistoryTimer();
		const nextPayload = await loadEpisodePayload(item);
		if (!nextPayload) {
			navigating = false;
			return;
		}

		activeSlug = item.slug;
		activeEpisode = nextPayload.episode;
		activeSources = nextPayload.sources;
		progress = 0;
		currentTime = 0;
		duration = 0;
		previewTime = '';
		sheetOpen = false;
		navigating = false;
		if (activeEpisode?.id) videoReactions.fetchReaction(activeEpisode.id);
		replaceEpisodeUrl(item);
		if (scrollIntoView) scrollToEpisode(item.slug);
	}

	function preloadImage(url: string) {
		if (!url || typeof window === 'undefined') return;
		const img = new Image();
		img.src = url;
	}

	function prefetchUrl(url: string) {
		if (!url || typeof document === 'undefined') return;
		if (url.startsWith('data:')) return;
		const link = document.createElement('link');
		link.rel = 'prefetch';
		link.href = url;
		document.head.appendChild(link);
		window.setTimeout(() => link.remove(), 10_000);
	}

	async function preloadNextEpisodes(count = 2) {
		const currentIndex = sortedEpisodes.findIndex((item) => item.slug === activeSlug);
		if (currentIndex < 0) return;
		const upcoming = sortedEpisodes.slice(currentIndex + 1, currentIndex + 1 + count);
		for (const item of upcoming) {
			const thumbUrl = item.thumbnail ?? item.videoThumbnail ?? '';
			if (thumbUrl) preloadImage(thumbUrl);

			if (episodeCache.has(item.slug)) continue;
			loadEpisodePayload(item)
				.then((payload) => {
					if (!payload) return;
					const epThumb = payload.episode.thumbnail ?? payload.episode.videoThumbnail ?? '';
					if (epThumb) preloadImage(epThumb);
					const firstSrc = payload.sources[0]?.playerUrl ?? '';
					prefetchUrl(firstSrc);
				})
				.catch(() => null);
		}
	}

	function openEpisode(item: Episode) {
		void activateEpisode(item, true);
	}

	function maybeNavigateFromSnap(node: HTMLElement, item: Episode) {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (navigating || item.slug === activeSlug || !entry.isIntersecting) return;
				if (entry.intersectionRatio < 0.72) return;
				void activateEpisode(item);
			},
			{ threshold: [0.72] }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}

	function historyPayload() {
		return {
			animeId: anime.id,
			animeSlug: anime.slug,
			animeTitle: anime.title,
			animeThumbnail: anime.thumbnail ?? '',
			animeType: 'Short',
			episodeId: activeEpisode.id,
			episodeSlug: activeEpisode.slug,
			episodeNumber: activeEpisode.number,
			episodeTitle: activeEpisode.title ?? `Episode ${activeEpisode.number}`
		};
	}

	async function saveHistory() {
		if (!auth.isLoggedIn || !videoEl || !activeEpisode?.id) return;
		if (!Number.isFinite(videoEl.currentTime) || videoEl.currentTime < 2) return;
		await history.upsertHistory({
			...historyPayload(),
			progressSec: videoEl.currentTime,
			durationSec: Number.isFinite(videoEl.duration) ? videoEl.duration : 0
		}).catch(() => null);
	}

	function startHistoryTimer() {
		stopHistoryTimer();
		if (!auth.isLoggedIn) return;
		historyTimer = window.setInterval(() => { void saveHistory(); }, 10_000);
	}

	function stopHistoryTimer() {
		if (historyTimer != null) { clearInterval(historyTimer); historyTimer = null; }
	}

	async function resumeFromHistory() {
		if (!auth.isLoggedIn || !activeEpisode?.id) return;
		const entry = history.byEpisode(activeEpisode.id);
		if (!entry || entry.progressSec < 2 || entry.progressPct > 95) return;
		const trySeek = () => {
			if (!videoEl) return;
			if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
				videoEl.currentTime = entry.progressSec;
			} else {
				videoEl.addEventListener('loadedmetadata', () => { videoEl!.currentTime = entry.progressSec; }, { once: true });
			}
		};
		trySeek();
	}

	async function goToNextEpisode() {
		const currentIndex = sortedEpisodes.findIndex((item) => item.slug === activeSlug);
		if (currentIndex < 0 || currentIndex >= sortedEpisodes.length - 1) return;
		const next = sortedEpisodes[currentIndex + 1];
		await activateEpisode(next, true);
	}

	function closeSheet() {
		sheetOpen = false;
		sheetDragY = 0;
		sheetDragging = false;
		sheetDragStartY = null;
	}

	function onSheetDragDown(event: PointerEvent) {
		sheetDragStartY = event.clientY;
		sheetDragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onSheetDragMove(event: PointerEvent) {
		if (sheetDragStartY === null) return;
		sheetDragY = Math.max(0, event.clientY - sheetDragStartY);
	}

	function onSheetDragUp(event: PointerEvent) {
		if (sheetDragStartY === null) return;
		const delta = event.clientY - sheetDragStartY;
		sheetDragStartY = null;
		sheetDragging = false;
		if (delta > 80) {
			closeSheet();
		} else {
			sheetDragY = 0;
		}
	}

	function onSheetDragCancel() {
		sheetDragStartY = null;
		sheetDragging = false;
		sheetDragY = 0;
	}

	function onSheetKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeSheet();
	}

	onMount(() => {
		mounted = true;
		markShortSlug(anime.slug);
		episodeCache.set(activeSlug, { episode: activeEpisode, sources: activeSources });
		if (activeEpisode?.id) videoReactions.fetchReaction(activeEpisode.id);
		document.addEventListener('fullscreenchange', onFullscreenChange);
		scheduleHideControls();
	});

	$effect(() => {
		if (typeof window === 'undefined' || typeof document === 'undefined') return;

		if (!sheetOpen) {
			document.body.classList.remove('short-sheet-lock');
			return;
		}
		document.body.classList.add('short-sheet-lock');
		window.addEventListener('keydown', onSheetKeydown);
		return () => {
			document.body.classList.remove('short-sheet-lock');
			window.removeEventListener('keydown', onSheetKeydown);
		};
	});

	$effect(() => {
		const nextSignature = activeSources.map((source) => `${source.label}:${source.playerUrl}`).join('|');
		if (nextSignature !== sourceSignature) {
			sourceSignature = nextSignature;
			sourceIndex = 0;
			lastLoadedSrc = '';
		}
	});

	$effect(() => {
		if (sourceIndex >= activeSources.length) sourceIndex = 0;
	});

	$effect(() => {
		if (!sheetOpen) selectedRangeIndex = null;
	});

	$effect(() => {
		if (sheetOpen) sheetAnimDone = false;
	});

	let historyTimer: number | null = null;
	let isFirstPreload = true;
	$effect(() => {
		void activeSlug;
		if (!mounted) return;
		const count = isFirstPreload ? 5 : 2;
		isFirstPreload = false;
		preloadNextEpisodes(count);
	});

	$effect(() => {
		void activeSlug;
		if (!mounted) return;
		resumeFromHistory();
	});

	$effect(() => {
		if (!mounted || !videoEl || !src || src === lastLoadedSrc) return;
		setupVideo(src);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			document.body.classList.remove('short-sheet-lock');
			window.removeEventListener('keydown', onSheetKeydown);
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			try {
				(screen as any).orientation?.unlock?.();
			} catch {
				// noop
			}
		}
		if (hideTimer != null) { clearTimeout(hideTimer); hideTimer = null; }
		stopHistoryTimer();
		void saveHistory();
		destroyHls();
	});
</script>

<svelte:head>
	<title>{title} - Short</title>
</svelte:head>

<div class="short-shell">
	<div class="short-feed" bind:this={feedEl}>
		{#each feedEpisodes as item (item.slug)}
			<section class="short-slide" data-episode-slug={item.slug} use:maybeNavigateFromSnap={item}>
				{#if item.slug === activeSlug}
					<div
						class="short-stage"
						class:controls-hidden={!controlsVisible}
						role="presentation"
						onpointerdown={onStagePointerDown}
						onpointerup={onStagePointerUp}
						onpointercancel={() => (pointerStart = null)}
					>
						<video
							bind:this={videoEl}
							class="short-video"
							{poster}
							playsinline
							autoplay
							ontimeupdate={onTimeUpdate}
							onloadedmetadata={onLoadedMetadata}
							onplaying={() => {
								isPlaying = true;
								isLoading = false;
								scheduleHideControls();
								startHistoryTimer();
							}}
							onpause={() => {
								isPlaying = false;
								if (hideTimer != null) {
									window.clearTimeout(hideTimer);
									hideTimer = null;
								}
								controlsVisible = true;
								stopHistoryTimer();
								void saveHistory();
							}}
							onended={() => {
								void saveHistory();
								const currentIndex = sortedEpisodes.findIndex((ep) => ep.slug === activeSlug);
								const hasNext = currentIndex >= 0 && currentIndex < sortedEpisodes.length - 1;
								if (hasNext) {
									void goToNextEpisode();
								} else {
									videoEl?.play();
								}
							}}
							onwaiting={() => (isLoading = true)}
							oncanplay={() => (isLoading = false)}
							onerror={() => {
								if (!preparingSource) tryNextSource();
							}}
						></video>

						{#if isLoading}
							<div class="short-spinner"></div>
						{/if}
						{#if error}
							<div class="short-error">{error}</div>
						{/if}
						{#if !isPlaying && !isLoading}
							<button class="short-play" onclick={togglePlay} aria-label="Putar">
								<svg
									class="short-play-icon"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
								>
									<path d="M7 4.5v15a1 1 0 0 0 1.55.83l11-7.5a1 1 0 0 0 0-1.66l-11-7.5A1 1 0 0 0 7 4.5z" />
								</svg>
							</button>
						{/if}

						<div class="short-top">
							<a href={seriesHref} class="short-back" aria-label="Kembali">
								<AppIcon name="arrow_back" />
							</a>
							<span>{episodeLabel}</span>
						</div>

						{#if previewTime}
							<div class="short-time-preview">{previewTime}</div>
						{/if}

						<div class="short-copy">
							<h1>{title}</h1>
							{#if description}
								<p class:expanded>
									{description}
									<button onclick={() => (expanded = !expanded)}>
										{expanded ? 'Less' : 'More'}
									</button>
								</p>
							{/if}
						</div>

						<div class="short-actions">
							<a href={seriesHref} class="short-avatar" aria-label="Buka detail series">
								{#if sheetPoster}
									<img src={sheetPoster} alt={anime.title} />
								{:else}
									<AppIcon name="movie" />
								{/if}
							</a>
							<button
								class="like-action"
								class:active={reaction.liked}
								onclick={() => videoReactions.react(activeEpisode.id, 'LIKE').catch(() => null)}
								aria-label="Like"
							>
								<AppIcon name="favorite" class="short-action-icon" />
								<span>{reaction.likeCount}</span>
							</button>
							<button
								class="save-action"
								class:active={isSaved}
								onclick={toggleSave}
								aria-label="Simpan"
							>
								<svg
									class="short-action-icon"
									viewBox="0 0 24 24"
									fill={isSaved ? 'currentColor' : 'none'}
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
								</svg>
							</button>
							<button
								class="episode-action"
								onclick={() => (sheetOpen = true)}
								aria-label="Daftar episode"
							>
								<AppIcon name="menu" class="short-action-icon" />
								<span>Episodes</span>
							</button>
						</div>

						<div class="short-progress-bar">
							<span class="short-time">{formatTime(currentTime)}</span>
							<input
								class="short-progress"
								style:--progress={`${progress}%`}
								type="range"
								min="0"
								max="100"
								value={progress}
								oninput={onSeek}
								aria-label="Progress video"
							/>
							<span class="short-time short-time-total">{formatTime(duration)}</span>
							<button
								class="short-fullscreen"
								onclick={toggleFullscreen}
								aria-label={isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
							>
								{#if isFullscreen}
									<svg
										class="short-fullscreen-icon"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M9 4v4a1 1 0 0 1-1 1H4" />
										<path d="M15 4v4a1 1 0 0 0 1 1h4" />
										<path d="M9 20v-4a1 1 0 0 0-1-1H4" />
										<path d="M15 20v-4a1 1 0 0 1 1-1h4" />
									</svg>
								{:else}
									<svg
										class="short-fullscreen-icon"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M4 9V5a1 1 0 0 1 1-1h4" />
										<path d="M20 9V5a1 1 0 0 0-1-1h-4" />
										<path d="M4 15v4a1 1 0 0 0 1 1h4" />
										<path d="M20 15v4a1 1 0 0 1-1 1h-4" />
								</svg>
								{/if}
							</button>
						</div>
					</div>
				{:else}
					<a class="short-placeholder" href={episodeHref(item)}>
						<img src={item.thumbnail ?? poster} alt={item.title ?? `Episode ${item.number}`} />
					</a>
				{/if}
			</section>
		{/each}
	</div>

</div>

{#if sheetOpen}
	<button class="sheet-backdrop" onclick={closeSheet} aria-label="Tutup episode"></button>
	<aside
		class="episode-sheet"
		class:sheet-anim-done={sheetAnimDone}
		aria-label="Daftar episode"
		style:transform={sheetDragY > 0 ? `translateY(${sheetDragY}px)` : undefined}
		style:transition={sheetDragging ? 'none' : undefined}
		style:opacity={sheetDragY > 0 ? Math.max(0.3, 1 - sheetDragY / 260) : undefined}
		onanimationend={() => (sheetAnimDone = true)}
	>
		<div
			class="sheet-drag-zone"
			onpointerdown={onSheetDragDown}
			onpointermove={onSheetDragMove}
			onpointerup={onSheetDragUp}
			onpointercancel={onSheetDragCancel}
			aria-hidden="true"
		>
			<div class="sheet-handle"></div>
		</div>

		<div class="sheet-body">
			<header>
				{#if sheetPoster}
					<img src={sheetPoster} alt={anime.title} />
				{:else}
					<div class="sheet-poster-placeholder" aria-hidden="true">
						<AppIcon name="image" />
					</div>
				{/if}
				<div>
					<h2>{anime.title}</h2>
					{#if description}
						<p class:expanded={sheetExpanded}>
							{description}
							<button onclick={() => (sheetExpanded = !sheetExpanded)}>
								{sheetExpanded ? 'Less' : 'Read More'}
							</button>
						</p>
					{/if}
				</div>
			</header>
			<div class="episode-meta" aria-label="Info series" class:no-rating={!rating}>
				{#if rating}
					<div><span>Rating</span><strong class="rating-value">{rating}</strong></div>
				{/if}
				<div><span>Genre</span><strong>{genre ?? '—'}</strong></div>
				<div><span>Episodes</span><strong>{sortedEpisodes.length || 1}</strong></div>
			</div>
			{#if sortedEpisodes.length}
				{#if episodeRanges.length > 1}
					<div class="episode-ranges">
						{#each episodeRanges as range, index}
							<button
								class:active={index === visibleRangeIndex}
								onclick={() => (selectedRangeIndex = index)}
							>{rangeLabel(range)}</button>
						{/each}
					</div>
				{/if}
				<div class="episode-grid">
					{#each (episodeRanges[visibleRangeIndex] ?? sortedEpisodes) as item}
						<button class:current={item.slug === activeSlug} onclick={() => openEpisode(item)}>
							{item.number}
						</button>
					{/each}
				</div>
			{:else}
				<div class="episode-empty">Belum ada episode lain</div>
			{/if}
		</div>
	</aside>
{/if}
