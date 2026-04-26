<script lang="ts">
	import type { PageData } from './$types';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';
	import { saved } from '$lib/stores/saved.svelte';

	type Episode = {
		id: number;
		slug: string;
		number: number;
		episode_number?: number;
		title: string;
		sub: string;
		date: string;
		animeSlug?: string;
		animeTitle?: string;
	};

	type Season = {
		season: number;
		title: string;
		slug: string;
		isCurrent: boolean;
		anime?: AnimeMetadata;
		episodes: Episode[];
	};

	type AnimeMetadata = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		bigCover: string;
		rating: number | null;
		alternativeTitles: string | null;
		synopsis: string | null;
		followed: number | null;
		status: string | null;
		network: string | null;
		studio: string | null;
		released: string | null;
		duration: string | null;
		season: string | null;
		country: string | null;
		type: string | null;
		totalEpisodes: number | null;
		fansub: string | null;
		genres: string[];
		tags: { slug: string; label: string }[];
	};

	type Anime = AnimeMetadata & {
		episodes: Episode[];
		seasons?: Season[];
	};

	const { data }: { data: PageData } = $props();
	const anime: Anime = data.anime;

	let showAllEpisodes = $state(false);
	let episodeOrder = $state<'desc' | 'asc'>('desc');
	let synopsisExpanded = $state(false);
	let activeSeason = $state<number | null>(null);

	const seasons = $derived((anime.seasons ?? []).filter((season) => season.episodes?.length));
	const activeSeasonData = $derived(
		seasons.find((season) => season.season === activeSeason) ??
			seasons.find((season) => season.isCurrent) ??
			seasons[0]
	);
	const activeAnime = $derived({
		...anime,
		...(activeSeasonData?.anime ?? {}),
		episodes: activeSeasonData?.episodes?.length ? activeSeasonData.episodes : anime.episodes,
		seasons: anime.seasons
	});
	const cover = $derived(activeAnime.bigCover || activeAnime.thumbnail);
	const activeEpisodes = $derived(activeAnime.episodes);
	const activeAnimeSlug = $derived(activeSeasonData?.slug ?? activeAnime.slug);
	const hasSingleEpisode = $derived(activeEpisodes.length <= 1);
	const latestEp = $derived(
		[...activeEpisodes].sort((a, b) => episodeNumber(b) - episodeNumber(a))[0]
	);
	const firstEp = $derived(
		[...activeEpisodes].sort((a, b) => episodeNumber(a) - episodeNumber(b))[0]
	);

	let sortedEpisodes = $derived(
		[...activeEpisodes].sort((a, b) =>
			episodeOrder === 'desc'
				? episodeNumber(b) - episodeNumber(a)
				: episodeNumber(a) - episodeNumber(b)
		)
	);
	let visibleEpisodes = $derived(showAllEpisodes ? sortedEpisodes : sortedEpisodes.slice(0, 30));
	let isSaved = $derived(saved.checkSaved(activeAnime.id));

	$effect(() => {
		if (seasons.length === 0) {
			activeSeason = null;
			return;
		}

		if (!activeSeason || !seasons.some((season) => season.season === activeSeason)) {
			activeSeason = seasons.find((season) => season.isCurrent)?.season ?? seasons[0].season;
		}
	});

	function episodeProgress(id: number) {
		return history.byEpisode(id)?.progressPct ?? 0;
	}

	function episodeNumber(ep?: Episode) {
		return ep?.number ?? ep?.episode_number ?? 0;
	}

	function episodeHref(ep?: Episode) {
		if (!ep?.slug) return '#';
		return `/anime/${ep.animeSlug ?? activeAnimeSlug}/${ep.slug}`;
	}

	function selectSeason(season: number) {
		activeSeason = season;
		showAllEpisodes = false;
	}

	async function toggleSaved() {
		if (!auth.isLoggedIn) {
			location.href = `/login?redirect=/anime/${activeAnime.slug}`;
			return;
		}
		if (isSaved) {
			await saved.unsaveAnime(activeAnime.id);
			return;
		}
		await saved.saveAnime({
			animeId: activeAnime.id,
			animeSlug: activeAnime.slug,
			animeTitle: activeAnime.title,
			animeThumbnail: activeAnime.thumbnail,
			animeStatus: activeAnime.status ?? ''
		});
	}
</script>

<SEO
	title={activeAnime.title}
	description={activeAnime.synopsis?.slice(0, 160)}
	image={activeAnime.thumbnail}
	type="article"
/>

<div class="-mx-4 -mt-4 max-w-[calc(100%+2rem)] overflow-x-clip">
	<!-- ── MOBILE HERO ───────────────────────────── -->
	<div class="md:hidden">
		<!--
        Wrapper tidak overflow-hidden supaya gradient bisa
        menembus batas cover ke info panel.
    -->
		<div class="relative">
			<!-- Cover -->
			<div class="relative overflow-hidden" style="height: 56vw; max-height: 260px;">
				<img
					src={cover}
					alt=""
					aria-hidden="true"
					class="absolute inset-0 w-full h-full object-cover object-top"
					style="filter: brightness(0.6) saturate(140%);"
					data-sync-asset-context="anime"
					data-sync-asset-id={String(activeAnime.id)}
					data-sync-asset-field={activeAnime.bigCover ? 'bigCover' : 'thumbnail'}
				/>

				<!-- Gradient atas: sisi kiri gelap untuk badges -->
				<div
					class="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"
				></div>

				<!--
                Gradient bawah: fade jauh lebih dalam — dari warna page-bg
                bukan dari black. Ini yang bikin transisi ke info panel smooth.
                Kita pakai dua layer:
                1. Black fade untuk kesan sinematik di tengah
                2. Page-bg fade di ujung bawah untuk "menyambung" ke panel
            -->
				<div
					class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
				></div>

				<!-- Badges — top left -->
				<div class="absolute top-4 left-4 flex items-center gap-1.5">
					<span
						class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border
                    {activeAnime.status === 'Ongoing'
							? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
							: 'bg-white/10 border-white/15 text-white/60'}"
					>
						{#if activeAnime.status === 'Ongoing'}
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
						{/if}
						{activeAnime.status === 'Ongoing' ? 'Tayang' : 'Tamat'}
					</span>
					<span
						class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md bg-violet-500/20 border border-violet-400/30 text-violet-200"
					>
						{activeAnime.type}
					</span>
				</div>

				<!-- Rating — bottom right -->
				{#if activeAnime.rating}
					<div
						class="absolute bottom-4 right-4 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
					>
						<span class="material-symbols-rounded text-yellow-400" style="font-size:13px;"
							>star</span
						>
						<span class="text-white font-black text-[12px]">{activeAnime.rating.toFixed(2)}</span>
					</div>
				{/if}
			</div>

			<!--
            FADE BRIDGE — div tipis yang menjembatani cover dan info panel.
            Tingginya 48px, gradient dari var(--page-bg) transparent di atas
            ke solid di bawah. Posisinya overlap cover (margin-top negatif).
            Ini yang menciptakan efek "mengalir".
        -->
			<div
				class="relative -mt-12 z-10"
				style="height: 48px; background: linear-gradient(to bottom, transparent, var(--page-bg));"
			></div>

			<!-- INFO PANEL — tidak ada border-top, langsung sambung dari fade bridge -->
			<div class="relative z-10 px-4 pb-6" style="background: var(--page-bg);">
				<!-- Row: poster + title -->
				<div class="flex items-start gap-3 mb-4 -mt-2">
					<!-- Poster — sedikit naik dengan -mt supaya masih "bersambung" dengan cover -->
					<div
						class="shrink-0 w-[72px] aspect-[2/3] rounded-[var(--radius-xl)] overflow-hidden"
						style="
                        box-shadow: var(--shadow-lg);
                        outline: 1px solid var(--border);
                        outline-offset: 0;
                    "
					>
						<img
							src={activeAnime.thumbnail}
							alt={activeAnime.title}
							class="w-full h-full object-cover"
							data-sync-asset-context="anime"
							data-sync-asset-id={String(activeAnime.id)}
							data-sync-asset-field="thumbnail"
						/>
					</div>

					<!-- Title + alt + stats -->
					<div class="flex-1 min-w-0 pt-0.5">
						<h1
							class="text-[18px] font-black leading-[1.2] tracking-tight mb-0.5"
							style="color: var(--text-primary);"
						>
							{activeAnime.title}
						</h1>
						{#if activeAnime.alternativeTitles}
							<p class="text-[10px] line-clamp-1 mb-2" style="color: var(--text-faint);">
								{activeAnime.alternativeTitles}
							</p>
						{/if}
						<div class="flex items-center flex-wrap gap-x-2.5 gap-y-1">
							<div class="flex items-center gap-1">
								<span class="material-symbols-rounded text-rose-500" style="font-size:12px;"
									>favorite</span
								>
								<span class="text-[10px] font-semibold" style="color: var(--text-muted);">
									{(activeAnime.followed ?? 0).toLocaleString('id-ID')}
								</span>
							</div>
							<div class="h-2.5 w-px" style="background: var(--border-strong);"></div>
							<div class="flex items-center gap-1" style="color: var(--text-muted);">
								<span class="material-symbols-rounded" style="font-size:12px;">video_library</span>
								<span class="text-[10px] font-semibold">{activeAnime.episodes.length} Ep</span>
							</div>
							{#if activeAnime.season}
								<div class="h-2.5 w-px" style="background: var(--border-strong);"></div>
								<span class="text-[10px]" style="color: var(--text-faint);"
									>{activeAnime.season}</span
								>
							{/if}
						</div>
					</div>
				</div>

				<!-- Genre pills -->
				<div class="flex flex-wrap gap-1.5 mb-4">
					{#each activeAnime.genres as genre}
						<a
							href="/search?genre={genre}"
							class="px-2.5 py-[5px] rounded-full text-[10px] font-bold transition-all active:scale-95"
							style="background: var(--surface-offset); border: 1px solid var(--border-strong); color: var(--text-muted);"
						>
							{genre}
						</a>
					{/each}
				</div>

				<!-- CTA row -->
				<div class="flex items-center gap-2">
					<a
						href={episodeHref(latestEp)}
						class="flex-1 h-9 flex items-center justify-center gap-2 rounded-[var(--radius-xl)] text-[13px] font-black tracking-wide text-white transition-all active:scale-[0.97]"
						style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
					>
						<span class="material-symbols-rounded" style="font-size:20px;">play_circle</span>
						{hasSingleEpisode ? 'Tonton Sekarang' : `Tonton Ep ${episodeNumber(latestEp)}`}
					</a>
					{#if !hasSingleEpisode}
						<a
							href={episodeHref(firstEp)}
							class="h-9 flex items-center gap-1 px-3.5 rounded-[var(--radius-xl)] text-[12px] font-semibold transition-all active:scale-[0.97]"
							style="background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-primary); box-shadow: var(--shadow-sm);"
						>
							<span class="material-symbols-rounded" style="font-size:20px;"
								>keyboard_double_arrow_left</span
							>
							Ep {episodeNumber(firstEp)}
						</a>
					{/if}
					<button
						onclick={toggleSaved}
						aria-label={isSaved ? 'Tersimpan' : 'Simpan'}
						class="h-9 w-12 shrink-0 flex items-center justify-center rounded-[var(--radius-xl)] transition-all active:scale-[0.97]"
						style="
                        background: {isSaved ? 'var(--accent)' : 'var(--surface)'};
                        border: 1px solid {isSaved ? 'transparent' : 'var(--border-strong)'};
                        color: {isSaved ? '#fff' : 'var(--text-muted)'};
                        box-shadow: {isSaved
							? '0 4px 14px var(--accent-glow)'
							: 'var(--shadow-sm)'};
                    "
					>
						<span class="material-symbols-rounded" style="font-size:20px;">
							{isSaved ? 'bookmark' : 'bookmark_add'}
						</span>
					</button>
					<button
						class="h-9 w-12 shrink-0 flex items-center justify-center rounded-[var(--radius-xl)] transition-all active:scale-[0.97]"
						style="background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-muted); box-shadow: var(--shadow-sm);"
					>
						<span class="material-symbols-rounded" style="font-size:20px;">share</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- ── DESKTOP HERO ──────────────────────────── -->
	<div class="hidden md:block relative overflow-hidden" style="height: clamp(400px, 52vw, 520px);">
		<img
			src={cover}
			alt=""
			aria-hidden="true"
			class="absolute inset-0 w-full h-full object-cover scale-110"
			style="filter: brightness(0.28) saturate(150%);"
			data-sync-asset-context="anime"
			data-sync-asset-id={String(activeAnime.id)}
			data-sync-asset-field={activeAnime.bigCover ? 'bigCover' : 'thumbnail'}
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent"></div>
		<div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent"></div>

		<div class="absolute inset-0 flex items-end px-8 pb-10 max-w-5xl">
			<div class="flex items-end gap-8 w-full">
				<div
					class="shrink-0 w-40 aspect-[2/3] rounded-[var(--radius-xl)] overflow-hidden ring-1 ring-white/10"
					style="box-shadow: 0 20px 60px oklch(0 0 0 / 0.5);"
				>
					<img
						src={activeAnime.thumbnail}
						alt={activeAnime.title}
						class="w-full h-full object-cover"
						data-sync-asset-context="anime"
						data-sync-asset-id={String(activeAnime.id)}
						data-sync-asset-field="thumbnail"
					/>
				</div>
				<div class="flex-1 pb-0.5">
					<div class="flex flex-wrap items-center gap-1.5 mb-3">
						<span
							class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border
                            {activeAnime.status === 'Ongoing'
								? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
								: 'bg-white/10 border-white/15 text-white/55'}"
						>
							{#if activeAnime.status === 'Ongoing'}
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
							{/if}
							{activeAnime.status === 'Ongoing' ? 'Tayang' : 'Tamat'}
						</span>
						<span
							class="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-violet-500/20 border border-violet-400/30 text-violet-200"
						>
							{activeAnime.type}
						</span>
						<span
							class="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/8 border border-white/10 text-white/45"
						>
							{activeAnime.country}
						</span>
					</div>
					<h1
						class="text-3xl lg:text-[42px] font-black text-white leading-[1.1] tracking-tight mb-1.5"
					>
						{activeAnime.title}
					</h1>
					{#if activeAnime.alternativeTitles}
						<p class="text-[12px] text-white/35 mb-4 line-clamp-1 tracking-wide">
							{activeAnime.alternativeTitles}
						</p>
					{/if}
					<div class="flex items-center gap-4 mb-5">
						{#if activeAnime.rating}
							<div class="flex items-center gap-1.5">
								<span class="material-symbols-rounded text-yellow-400" style="font-size:16px;"
									>star</span
								>
								<span class="text-white font-black text-[13px]"
									>{activeAnime.rating.toFixed(2)}</span
								>
							</div>
							<div class="h-3 w-px bg-white/15"></div>
						{/if}
						<div class="flex items-center gap-1.5 text-white/50">
							<span class="material-symbols-rounded text-rose-400/70" style="font-size:14px;"
								>favorite</span
							>
							<span class="text-[11px] font-semibold"
								>{(activeAnime.followed ?? 0).toLocaleString('id-ID')}</span
							>
						</div>
						<div class="h-3 w-px bg-white/15"></div>
						<div class="flex items-center gap-1.5 text-white/50">
							<span class="material-symbols-rounded" style="font-size:14px;">video_library</span>
							<span class="text-[11px] font-semibold">{activeAnime.episodes.length} Episode</span>
						</div>
					</div>
					<div class="flex flex-wrap gap-1.5 mb-6">
						{#each activeAnime.genres as genre}
							<a
								href="/search?genre={genre}"
								class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/8 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
							>
								{genre}
							</a>
						{/each}
					</div>
					<div class="flex items-center gap-2.5">
						<a
							href={episodeHref(latestEp)}
							class="flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-[13px] font-black tracking-wide transition-all active:scale-[0.97]"
							style="background: var(--accent); box-shadow: 0 4px 20px var(--accent-glow);"
						>
							<span class="material-symbols-rounded" style="font-size:18px;">play_arrow</span>
							{hasSingleEpisode ? 'Tonton Sekarang' : `Tonton Ep ${episodeNumber(latestEp)}`}
						</a>
						{#if !hasSingleEpisode}
							<a
								href={episodeHref(firstEp)}
								class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/18 text-white text-[13px] font-semibold border border-white/12 backdrop-blur-sm transition-all active:scale-[0.97]"
							>
								<span class="material-symbols-rounded" style="font-size:18px;">skip_previous</span>
								Ep {episodeNumber(firstEp)}
							</a>
						{/if}
						<button
							onclick={toggleSaved}
							aria-label={isSaved ? 'Tersimpan' : 'Simpan'}
							class="h-10 w-10 flex items-center justify-center rounded-full border transition-all active:scale-[0.97]"
							style="
                                background: {isSaved ? 'var(--accent)' : 'oklch(1 0 0 / 0.1)'};
                                border-color: {isSaved ? 'transparent' : 'oklch(1 0 0 / 0.12)'};
                                color: white;
                                box-shadow: {isSaved ? '0 4px 14px var(--accent-glow)' : 'none'};
                            "
						>
							<span class="material-symbols-rounded" style="font-size:18px;"
								>{isSaved ? 'bookmark' : 'bookmark_add'}</span
							>
						</button>
						<button
							class="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 border border-white/12 text-white hover:bg-white/18 transition-all active:scale-[0.97]"
						>
							<span class="material-symbols-rounded" style="font-size:18px;">share</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- ══════════════════════════════════════════════════
     BODY
══════════════════════════════════════════════════ -->
<div class="pt-5">
	<!-- ── SYNOPSIS + INFO ──────────────────────── -->
	<div class="flex flex-col md:flex-row gap-6 md:gap-8 mb-7">
		<div class="flex-1 min-w-0">
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em] mb-2.5"
				style="color: var(--text-faint);"
			>
				Sinopsis
			</p>
			<div class="relative">
				<p
					class="text-[13px] leading-[1.85] {synopsisExpanded ? '' : 'line-clamp-3'}"
					style="color: var(--text-muted);"
				>
					{activeAnime.synopsis}
				</p>
				{#if !synopsisExpanded}
					<div
						class="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
						style="background: linear-gradient(to top, var(--page-bg), transparent);"
					></div>
				{/if}
			</div>
			<button
				onclick={() => (synopsisExpanded = !synopsisExpanded)}
				class="mt-2 flex items-center gap-0.5 text-[11px] font-bold transition-colors"
				style="color: var(--accent);"
			>
				<span class="material-symbols-rounded" style="font-size:13px;">
					{synopsisExpanded ? 'expand_less' : 'expand_more'}
				</span>
				{synopsisExpanded ? 'Sembunyikan' : 'Baca selengkapnya'}
			</button>
		</div>

		<div
			class="hidden md:block w-px shrink-0 self-stretch"
			style="background: var(--border);"
		></div>
		<div class="md:hidden h-px w-full" style="background: var(--border);"></div>

		<div class="md:w-52 shrink-0">
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
				style="color: var(--text-faint);"
			>
				Info
			</p>
			<div class="grid grid-cols-2 md:grid-cols-1 gap-y-4 gap-x-4">
				{#each [{ label: 'Studio', value: activeAnime.studio }, { label: 'Network', value: activeAnime.network }, { label: 'Rilis', value: activeAnime.released }, { label: 'Durasi', value: activeAnime.duration }, { label: 'Negara', value: activeAnime.country }, { label: 'Total Ep', value: activeAnime.totalEpisodes ? `${activeAnime.totalEpisodes} Ep` : `${activeAnime.episodes.length} Ep` }] as info}
					<div>
						<p
							class="text-[8px] font-black uppercase tracking-[0.15em] mb-0.5"
							style="color: var(--text-faint);"
						>
							{info.label}
						</p>
						<p class="text-[12px] font-bold" style="color: var(--text-primary);">{info.value}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>

	{#if !hasSingleEpisode}
		<div class="h-px mb-6" style="background: var(--border);"></div>

		<!-- ── EPISODE LIST ──────────────────────────── -->
		<section class="mb-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2">
					<p
						class="text-[9px] font-black uppercase tracking-[0.2em]"
						style="color: var(--text-faint);"
					>
						Episode
					</p>
					<span
						class="px-2 py-0.5 rounded-full text-[9px] font-black"
						style="background: var(--accent-surface); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
					>
						{activeEpisodes.length}
					</span>
				</div>
				<button
					onclick={() => (episodeOrder = episodeOrder === 'desc' ? 'asc' : 'desc')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-[10px] font-bold transition-all active:scale-[0.97]"
					style="background: var(--surface); border: 1px solid var(--border-strong); color: var(--text-muted); box-shadow: var(--shadow-sm);"
				>
					<span class="material-symbols-rounded" style="font-size:13px;">
						{episodeOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
					</span>
					{episodeOrder === 'desc' ? 'Terbaru' : 'Terlama'}
				</button>
			</div>

			{#if seasons.length > 1}
				<div class="flex max-w-full gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
					{#each seasons as season (season.season)}
						{@const isActiveSeason = season.season === activeSeasonData?.season}
						<button
							type="button"
							aria-pressed={isActiveSeason}
							onclick={() => selectSeason(season.season)}
							class="shrink-0 h-9 px-3.5 rounded-[var(--radius-xl)] text-[11px] transition-all active:scale-[0.97]"
							style="
                            background: {isActiveSeason ? 'var(--accent)' : 'var(--surface)'};
                            border: 1px solid {isActiveSeason
								? 'transparent'
								: 'var(--border-strong)'};
                            color: {isActiveSeason ? '#fff' : 'var(--text-muted)'};
                            font-weight: {isActiveSeason ? 900 : 700};
                            box-shadow: {isActiveSeason
								? '0 4px 12px var(--accent-glow)'
								: 'var(--shadow-sm)'};
                        "
						>
							Season {season.season}
						</button>
					{/each}
				</div>
			{/if}

			<!--
            EPISODE GRID — fix duplikat nomor.

            Tidak pakai absolute overlay + z-10 duplikat lagi.
            Cukup pakai group + group-hover CSS untuk flip warna.
            `[&>*]:transition-colors` pada anchor supaya semua child ikut.
        -->
			<div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
				{#each visibleEpisodes as ep}
					{@const progress = episodeProgress(ep.id)}
					{@const isWatched = progress > 0}
					<a
						href={episodeHref(ep)}
						class="ep-card group relative flex flex-col items-center justify-center py-3 rounded-[var(--radius-lg)] border transition-all duration-150 active:scale-[0.95] hover:border-transparent"
						style="
                        --ep-num-color: {isWatched ? 'var(--accent-text)' : 'var(--text-primary)'};
                        --ep-sub-color: {isWatched ? 'var(--accent)' : 'var(--accent)'};
                        background: {isWatched ? 'var(--accent-surface)' : 'var(--surface)'};
                        border-color: {isWatched
							? 'oklch(from var(--accent) l c h / 0.25)'
							: 'var(--border)'};
                        box-shadow: var(--shadow-sm);
                    "
					>
						<!-- Sub badge — top left -->
						<!-- {#if ep.sub}
						<span
							class="absolute top-1 left-1 text-[6px] font-black uppercase leading-none group-hover:text-white transition-colors"
							style="color: var(--ep-sub-color);"
						>
							{ep.sub}
						</span>
					{/if} -->

						<!-- Watched check — top right -->
						{#if isWatched}
							<span
								class="material-symbols-rounded absolute top-1 right-1 group-hover:text-white transition-colors"
								style="font-size:10px; color: var(--accent);"
							>
								check_circle
							</span>
						{/if}

						<!-- Episode number — SATU, tidak duplikat -->
						<span
							class="text-[13px] font-black leading-none transition-colors group-hover:text-white"
							style="color: var(--ep-num-color);"
						>
							{episodeNumber(ep)}
						</span>

						<!-- Progress bar — bottom -->
						{#if isWatched}
							<div
								class="absolute left-1.5 right-1.5 bottom-1.5 h-0.5 rounded-full overflow-hidden"
								style="background: var(--border-strong);"
							>
								<div
									class="h-full rounded-full transition-colors group-hover:bg-white/70"
									style="width: {progress}%; background: var(--accent);"
								></div>
							</div>
						{/if}

						<!-- Hover bg overlay — cukup dengan group-hover pada background -->
						<div
							class="absolute inset-0 rounded-[var(--radius-lg)] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
							style="background: var(--accent);"
							aria-hidden="true"
						></div>

						<!-- Re-render number di atas overlay via z-10 — TAPI kita pakai isolasi berbeda:
                         semua konten di dalam wrapper z-10, overlay z-0 -->
					</a>
				{/each}
			</div>

			{#if activeEpisodes.length > 30}
				<button
					onclick={() => (showAllEpisodes = !showAllEpisodes)}
					class="mt-3 w-full py-2.5 rounded-[var(--radius-xl)] text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-[0.99]"
					style="background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); box-shadow: var(--shadow-sm);"
				>
					<span class="material-symbols-rounded" style="font-size:16px;">
						{showAllEpisodes ? 'expand_less' : 'expand_more'}
					</span>
					{showAllEpisodes ? 'Sembunyikan' : `Tampilkan semua ${activeEpisodes.length} episode`}
				</button>
			{/if}
		</section>

		<div class="h-px mb-6" style="background: var(--border);"></div>
	{/if}

	<!-- ── TAGS ──────────────────────────────────── -->
	{#if activeAnime.tags?.length}
		<section class="mb-8">
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
				style="color: var(--text-faint);"
			>
				Tags
			</p>
			<div class="flex flex-wrap gap-1.5">
				{#each activeAnime.tags as tag}
					<a
						href="/search?q={encodeURIComponent(tag.label)}"
						class="px-3 py-1.5 rounded-[var(--radius-lg)] text-[10px] font-semibold transition-all active:scale-[0.97]"
						style="background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); box-shadow: var(--shadow-sm);"
					>
						# {tag.label}
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>

<!-- ══════════════════════════════════════════════════
     EPISODE CARD STYLES
     Diperlukan supaya overlay z-0 dan konten z-10 benar.
     Tidak bisa dilakukan murni dengan Tailwind karena
     butuh stacking context per-card.
══════════════════════════════════════════════════ -->
<style>
	.ep-card > *:not([aria-hidden]) {
		position: relative;
		z-index: 1;
	}
	.ep-card [aria-hidden] {
		z-index: 0;
	}
</style>
