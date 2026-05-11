<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import config from '$lib/config';
	import { formatProxySources } from '$lib/format-proxy-urls';
	import { saved } from '$lib/stores/saved.svelte';
	import { videoReactions } from '$lib/stores/video-reactions.svelte';
	import './ShortPlayer.css';

	type Episode = {
		id: number;
		slug: string;
		number: number;
		title?: string | null;
		thumbnail?: string | null;
		videoThumbnail?: string | null;
		servers?: StreamServer[];
	};

	type Anime = {
		id: number;
		slug: string;
		title: string;
		description?: string | null;
		synopsis?: string | null;
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

	type EpisodePayload = {
		episode: Episode;
		sources: Source[];
	};

	let {
		anime,
		episode,
		sources,
		episodes = [],
		currentSlug
	}: {
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
	let previewTime = $state('');
	let expanded = $state(false);
	let sheetOpen = $state(false);
	let sheetExpanded = $state(false);
	let sourceIndex = $state(0);
	let mounted = $state(false);
	let lastLoadedSrc = '';
	let sourceSignature = '';
	let objectUrl = '';
	let preparingSource = false;
	let navigating = false;
	let feedEl = $state<HTMLElement>();
	let activeSlug = $state(currentSlug || episode.slug);
	let activeEpisode = $state(episode);
	let activeSources = $state(sources);
	const episodeCache = new Map<string, EpisodePayload>();

	const activeSource = $derived(activeSources[sourceIndex] ?? activeSources[0]);
	const src = $derived(activeSource?.playerUrl ?? '');
	const title = $derived(anime.title);
	const episodeLabel = $derived(
		activeEpisode?.number ? `Episode ${activeEpisode.number}` : 'Episode'
	);
	const description = $derived(anime.description ?? anime.synopsis ?? '');
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
	const reaction = $derived(videoReactions.getReaction(activeEpisode?.id));
	const isSaved = $derived(saved.checkSaved(anime?.id));
	const sortedEpisodes = $derived(
		[...episodes]
			.filter((item) => item.slug)
			.sort((a, b) => Number(a.number) - Number(b.number))
	);
	const feedEpisodes = $derived(
		sortedEpisodes.length ? sortedEpisodes : [activeEpisode]
	);

	function isHlsSource(value: string) {
		return (
			value.startsWith('data:application/vnd.apple.mpegurl') || /\.m3u8(?:$|[?#])/i.test(value)
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
		const body = value.slice(commaIndex + 1);
		const playlist = decodeURIComponent(body);
		objectUrl = URL.createObjectURL(
			new Blob([playlist], { type: 'application/vnd.apple.mpegurl' })
		);
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
					backBufferLength: 30
				});
				hls.attachMedia(videoEl);
				hls.on(Hls.Events.MEDIA_ATTACHED, () => {
					preparingSource = false;
					hls.loadSource(playbackUrl);
				});
				hls.on(Hls.Events.MANIFEST_PARSED, () => play());
				hls.on(Hls.Events.ERROR, (_: unknown, data: { fatal?: boolean }) => {
					if (data.fatal) tryNextSource();
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
		progress = (videoEl.currentTime / videoEl.duration) * 100;
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

	function onSeekPreview(event: Event) {
		if (!videoEl?.duration) return;
		const next = Number((event.currentTarget as HTMLInputElement).value);
		previewTime = formatTime((next / 100) * videoEl.duration);
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
		const nextPayload = await loadEpisodePayload(item);
		if (!nextPayload) {
			navigating = false;
			return;
		}

		activeSlug = item.slug;
		activeEpisode = nextPayload.episode;
		activeSources = nextPayload.sources;
		progress = 0;
		previewTime = '';
		sheetOpen = false;
		if (activeEpisode?.id) videoReactions.fetchReaction(activeEpisode.id);
		replaceEpisodeUrl(item);
		if (scrollIntoView) scrollToEpisode(item.slug);
		window.setTimeout(() => {
			navigating = false;
		}, 180);
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

	function closeSheet() {
		sheetOpen = false;
	}

	function onSheetKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeSheet();
	}

	onMount(() => {
		mounted = true;
		episodeCache.set(activeSlug, { episode: activeEpisode, sources: activeSources });
		if (activeEpisode?.id) videoReactions.fetchReaction(activeEpisode.id);
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
		if (!mounted || !videoEl || !src || src === lastLoadedSrc) return;
		setupVideo(src);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			document.body.classList.remove('short-sheet-lock');
			window.removeEventListener('keydown', onSheetKeydown);
		}
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
					<div class="short-stage">
						<video
							bind:this={videoEl}
							class="short-video"
							{poster}
							playsinline
							autoplay
							loop
							onclick={togglePlay}
							ontimeupdate={onTimeUpdate}
							onplaying={() => {
								isPlaying = true;
								isLoading = false;
							}}
							onpause={() => (isPlaying = false)}
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
								<AppIcon name="play_arrow" />
							</button>
						{/if}

						<div class="short-top">
							<a href="/anime/{anime.slug}" class="short-back" aria-label="Kembali">
								<AppIcon name="arrow_back" />
							</a>
							<span>{episodeLabel}</span>
						</div>

						<div class="short-copy">
							{#if previewTime}
								<div class="short-time-preview">{previewTime}</div>
							{/if}
							<h1>{title}</h1>
							{#if description}
								<p class:expanded>
									{description}
									<button onclick={() => (expanded = !expanded)}>
										{expanded ? 'Tutup' : 'Lihat'}
									</button>
								</p>
							{/if}
						</div>

						<div class="short-actions">
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
								<AppIcon name={isSaved ? 'bookmark' : 'bookmarks'} class="short-action-icon" />
							</button>
							<button
								class="episode-action"
								onclick={() => (sheetOpen = true)}
								aria-label="Daftar episode"
							>
								<AppIcon name="menu" class="short-action-icon" />
								<span>Episode</span>
							</button>
						</div>

						<input
							class="short-progress"
							type="range"
							min="0"
							max="100"
							value={progress}
							oninput={onSeek}
							aria-label="Progress video"
						/>
					</div>
				{:else}
					<a class="short-placeholder" href={episodeHref(item)}>
						<img src={item.thumbnail ?? poster} alt={item.title ?? `Episode ${item.number}`} />
						<span>Episode {item.number}</span>
					</a>
				{/if}
			</section>
		{/each}
	</div>

</div>

{#if sheetOpen}
	<button class="sheet-backdrop" onclick={closeSheet} aria-label="Tutup episode"></button>
	<aside class="episode-sheet" aria-label="Daftar episode">
		<div class="sheet-handle"></div>
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
							{sheetExpanded ? 'Tutup' : 'Lihat'}
						</button>
					</p>
				{/if}
			</div>
		</header>
		{#if sortedEpisodes.length}
			<div class="episode-grid">
				{#each sortedEpisodes as item}
					<button class:current={item.slug === activeSlug} onclick={() => openEpisode(item)}>
						<span>EP</span>
						{item.number}
					</button>
				{/each}
			</div>
		{:else}
			<div class="episode-empty">Belum ada episode lain</div>
		{/if}
	</aside>
{/if}
