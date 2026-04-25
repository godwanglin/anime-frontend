<script lang="ts">
	import HeroSlider from '$lib/components/HeroSlider.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
	};

	type PopularAnime = Anime & {
		bigCover?: string;
		type?: string;
		studio?: string;
		rating?: number | null;
		followed?: number;
		episodeCount?: number;
	};

	type Episode = {
		id: number;
		slug: string;
		title: string;
		episode: string;
		thumbnail: string;
		time: string;
		[key: string]: any;
	};

	type Genre = {
		id: number;
		name: string;
		animeCount: number;
	};

	const { data } = $props();
	const continueWatching = $derived(history.items.slice(0, 10));

	let trending: Anime[] = $state(data.trending.weekly);
	let newRelease: Anime[] = $state(data.newRelease);
	let newEpisodes: Episode[] = $state(data.newEpisodes);
	let popular: PopularAnime[] = $state(data.popular ?? []);
	let genres: Genre[] = $state(data.genres ?? []);
	let heroes = $state(data.banners);

	// Top genres by anime count
	const topGenres = $derived([...genres].sort((a, b) => b.animeCount - a.animeCount).slice(0, 12));

	// Genre → icon mapping
	const genreIcons: Record<string, string> = {
		Action: 'bolt',
		Adventure: 'explore',
		Fantasy: 'auto_awesome',
		Romance: 'favorite',
		Comedy: 'sentiment_very_satisfied',
		Drama: 'theater_comedy',
		Mystery: 'help',
		Horror: 'skull',
		Historical: 'history_edu',
		'Martial Arts': 'sports_martial_arts',
		Mecha: 'precision_manufacturing',
		Supernatural: 'all_inclusive',
		Isekai: 'public',
		Magic: 'auto_fix_high',
		Demons: 'blur_on',
		Psychological: 'psychology',
		Music: 'music_note',
		Cultivation: 'spa',
		Mythology: 'castle',
		Game: 'videogame_asset',
		Military: 'military_tech',
		Gourmet: 'restaurant',
		Harem: 'group',
		Ecchi: 'favorite_border',
		Gore: 'local_fire_department',
		Reincarnation: 'refresh',
		Friendship: 'handshake'
	};

	// Gradient palette cycled per chip index — each with matching neon glow color
	const genrePalettes = [
		{ grad: 'from-violet-500 to-fuchsia-500', glow: '168,85,247' },
		{ grad: 'from-rose-500 to-orange-500', glow: '244,63,94' },
		{ grad: 'from-cyan-500 to-blue-500', glow: '6,182,212' },
		{ grad: 'from-emerald-500 to-teal-500', glow: '16,185,129' },
		{ grad: 'from-amber-500 to-red-500', glow: '245,158,11' },
		{ grad: 'from-indigo-500 to-purple-500', glow: '99,102,241' }
	];

	function genreIcon(name: string) {
		return genreIcons[name] ?? 'category';
	}
</script>

<SEO />

<!-- HERO BANNER -->
<HeroSlider {heroes} />

<!-- LANJUTKAN MENONTON -->
<section class="mb-7">
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
			<span class="material-symbols-rounded text-violet-500 text-[20px]">play_circle</span>
			Lanjutkan Menonton
		</h2>
		<a
			href="/profile/history"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5"
		>
			Lihat semua
			<span class="material-symbols-rounded text-[14px]">chevron_right</span>
		</a>
	</div>

	<div class="flex max-w-[calc(100%+2rem)] gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
		{#each continueWatching as item}
			<a href="/anime/{item.animeSlug}/{item.episodeSlug}" class="shrink-0 w-36 md:w-44 group">
				<div
					class="relative rounded-xl overflow-hidden aspect-video bg-zinc-200 dark:bg-zinc-800 mb-2"
				>
					<OptimizedImage
						src={item.animeThumbnail}
						alt={item.animeTitle}
						className="h-full w-full z-0"
						imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.03]"
						sizes="(max-width: 768px) 144px, 176px"
						loading="lazy"
						fetchpriority="low"
					/>
					<!-- Progress bar -->
					<div class="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
						<div class="h-full bg-violet-500 rounded-full" style="width: {item.progressPct}%"></div>
					</div>
					<!-- Play overlay -->
					<div
						class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition"
					>
						<span class="material-symbols-rounded text-white text-[36px]">play_circle</span>
					</div>
					<!-- Episode badge -->
					<span
						class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/65 text-white"
					>
						Ep {item.episodeNumber}
					</span>
				</div>
				<p class="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">
					{item.animeTitle}
				</p>
				<p class="text-[11px] text-zinc-500 dark:text-zinc-400">
					{Math.round(item.progressPct)}% ditonton
				</p>
			</a>
		{:else}
			<div
				class="w-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-sm text-zinc-500 dark:text-zinc-400"
			>
				{auth.isLoggedIn ? 'Belum ada riwayat tontonan.' : 'Masuk untuk melihat riwayat tontonan.'}
			</div>
		{/each}
	</div>
</section>

<!-- JELAJAHI GENRE — chip strip -->
<section class="mb-10">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<div class="flex items-center justify-center h-7 w-7 rounded-lg bg-violet-500/15">
				<span class="material-symbols-rounded text-violet-500 text-[18px]">category</span>
			</div>
			<h2 class="text-base font-bold text-zinc-900 dark:text-white">Jelajahi Genre</h2>
		</div>
		<a
			href="/genre"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5 group"
		>
			Semua genre
			<span
				class="material-symbols-rounded text-[14px] group-hover:translate-x-0.5 transition-transform"
				>chevron_right</span
			>
		</a>
	</div>

	<div class="flex max-w-[calc(100%+2rem)] gap-2.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
		{#each topGenres as genre, i}
			{@const palette = genrePalettes[i % genrePalettes.length]}
			<a
				href="/browse?genre={encodeURIComponent(genre.name)}"
				class="genre-chip shrink-0 group rounded-2xl p-[1.5px] bg-linear-to-br {palette.grad} transition-all duration-300 hover:scale-[1.04] active:scale-95"
				style="--glow: {palette.glow}; box-shadow: 0 2px 10px rgba({palette.glow}, 0.25), 0 0 0 0 rgba({palette.glow}, 0);"
			>
				<div
					class="flex items-center gap-2.5 px-4 py-3 rounded-[14.5px] bg-white/95 dark:bg-zinc-900/95"
				>
					<div
						class="flex items-center justify-center h-8 w-8 rounded-lg bg-linear-to-br {palette.grad}"
						style="box-shadow: 0 4px 12px rgba({palette.glow}, 0.5), inset 0 1px 0 rgba(255,255,255,0.25);"
					>
						<span class="material-symbols-rounded text-white text-[18px]"
							>{genreIcon(genre.name)}</span
						>
					</div>
					<div class="flex flex-col leading-tight">
						<span class="text-[13px] font-black text-zinc-900 dark:text-white">{genre.name}</span>
						<span class="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
							{genre.animeCount} judul
						</span>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- TRENDING — Netflix Top 10 style -->
<section class="mb-10">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<div class="flex items-center justify-center h-7 w-7 rounded-lg bg-orange-500/15">
				<span class="material-symbols-rounded text-orange-500 text-[18px]"
					>local_fire_department</span
				>
			</div>
			<h2 class="text-base font-bold text-zinc-900 dark:text-white">Top Minggu Ini</h2>
			<span
				class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20"
			>
				<span class="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
				<span class="text-[10px] font-bold text-orange-500">HOT</span>
			</span>
		</div>
		<a
			href="/popular"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5 group"
		>
			Lihat semua
			<span
				class="material-symbols-rounded text-[14px] group-hover:translate-x-0.5 transition-transform"
				>chevron_right</span
			>
		</a>
	</div>

	<!-- Horizontal scroll with giant rank numbers -->
	<div
		class="flex max-w-[calc(100%+2rem)] gap-1 md:gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4"
	>
		{#each trending.slice(0, 10) as item, i}
			{@const rank = i + 1}
			{@const rankColor =
				rank === 1 ? '#a855f7' : rank === 2 ? '#8b5cf6' : rank === 3 ? '#c084fc' : '#a1a1aa'}
			{@const rankGlow =
				rank === 1
					? 'drop-shadow(0 0 2px rgba(216,180,254,0.9)) drop-shadow(0 0 8px rgba(168,85,247,0.85)) drop-shadow(0 0 20px rgba(168,85,247,0.6)) drop-shadow(0 0 40px rgba(168,85,247,0.35))'
					: rank === 2
						? 'drop-shadow(0 0 2px rgba(196,181,253,0.85)) drop-shadow(0 0 7px rgba(139,92,246,0.75)) drop-shadow(0 0 16px rgba(139,92,246,0.5)) drop-shadow(0 0 32px rgba(139,92,246,0.28))'
						: rank === 3
							? 'drop-shadow(0 0 2px rgba(221,214,254,0.8)) drop-shadow(0 0 6px rgba(192,132,252,0.65)) drop-shadow(0 0 14px rgba(192,132,252,0.4)) drop-shadow(0 0 26px rgba(192,132,252,0.22))'
							: 'drop-shadow(0 0 3px rgba(228,228,231,0.25)) drop-shadow(0 0 8px rgba(161,161,170,0.18))'}
			<a href="/anime/{item.slug}" class="shrink-0 group block" aria-label={item.title}>
				<!-- Row: giant rank + poster, aligned at bottom -->
				<div class="flex items-end gap-0">
					<span
						class="top-rank-number pointer-events-none select-none relative z-20 text-[6.5rem] md:text-[9.5rem] -mr-4 md:-mr-7 shrink-0 transition-all duration-300 group-hover:scale-[1.03]"
						style="font-family: 'Bebas Neue', 'Lexend Deca', sans-serif; font-weight: 400; color: transparent; -webkit-text-stroke: 2px {rankColor}; filter: {rankGlow}; line-height: 0.86;"
					>
						{rank}
					</span>

					<!-- Poster -->
					<div
						class="relative z-10 w-28 md:w-36 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-2xl shadow-black/50 ring-1 ring-white/10"
					>
						<OptimizedImage
							src={item.thumbnail}
							alt={item.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
							loading="lazy"
							fetchpriority="low"
							sizes="(max-width: 768px) 112px, 144px"
						/>
						<!-- Left vignette so rank number is readable over bright posters -->
						<div
							class="absolute inset-y-0 left-0 w-1/2 pointer-events-none bg-linear-to-r from-black/75 via-black/35 to-transparent"
						></div>
						<div
							class="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition"
						></div>
						<div
							class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
						>
							<div
								class="h-11 w-11 rounded-full bg-white/25 border-2 border-white/70 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform"
							>
								<span class="material-symbols-rounded text-white text-[24px]">play_arrow</span>
							</div>
						</div>
						{#if item.status === 'Ongoing'}
							<span
								class="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
							>
								<span class="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
								Tayang
							</span>
						{/if}
					</div>
				</div>

				<!-- Title BELOW, aligned under poster via ml-auto -->
				<p
					class="mt-2 w-28 md:w-36 ml-auto text-[12px] md:text-[13px] font-bold text-zinc-800 dark:text-zinc-100 line-clamp-1 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors"
				>
					{item.title}
				</p>
			</a>
		{/each}
	</div>
</section>

<!-- EPISODE TERBARU — Landscape horizontal scroll -->
<section class="mb-10">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<div class="flex items-center justify-center h-7 w-7 rounded-lg bg-green-500/15">
				<span class="material-symbols-rounded text-green-500 text-[18px]">fiber_new</span>
			</div>
			<h2 class="text-base font-bold text-zinc-900 dark:text-white">Episode Terbaru</h2>
		</div>
		<a
			href="/episode-baru"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5 group"
		>
			Lihat semua
			<span
				class="material-symbols-rounded text-[14px] group-hover:translate-x-0.5 transition-transform"
				>chevron_right</span
			>
		</a>
	</div>

	<!-- Landscape cards scroll -->
	<div
		class="flex max-w-[calc(100%+2rem)] gap-3 md:gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4"
	>
		{#each newEpisodes as item}
			<a href={item.href} class="shrink-0 w-56 md:w-72 group">
				<div
					class="relative aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-lg shadow-black/20 ring-1 ring-white/5 mb-2"
				>
					<OptimizedImage
						src={item.thumbnail}
						alt={item.title}
						className="h-full w-full"
						imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
						loading="lazy"
						fetchpriority="low"
						sizes="(max-width: 768px) 224px, 288px"
					/>
					<!-- Gradient bottom -->
					<div
						class="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent"
					></div>

					<!-- Episode badge top-left — premium gradient -->
					<div class="absolute top-2 left-2">
						<span
							class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-white bg-linear-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-600/40 ring-1 ring-white/20"
						>
							<span class="material-symbols-rounded text-[12px] leading-none">play_arrow</span>
							{item.episode}
						</span>
					</div>

					<!-- Time pill top-right -->
					<div class="absolute top-2 right-2">
						<span
							class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white/90 bg-black/55 ring-1 ring-white/10"
						>
							<span class="material-symbols-rounded text-[11px] leading-none">schedule</span>
							{item.time}
						</span>
					</div>

					<!-- Hover play overlay -->
					<div
						class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition"
					>
						<div
							class="h-12 w-12 rounded-full bg-violet-500/90 border-2 border-white/60 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform shadow-xl shadow-violet-500/40"
						>
							<span class="material-symbols-rounded text-white text-[28px]">play_arrow</span>
						</div>
					</div>

					<!-- Title at bottom -->
					<div class="absolute bottom-0 left-0 right-0 p-3">
						<p class="text-[13px] font-bold text-white line-clamp-1 drop-shadow">
							{item.title}
						</p>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- PALING POPULER — editorial landscape with glassmorphism info -->
<section class="mb-10">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<div class="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/15">
				<span class="material-symbols-rounded text-amber-500 text-[18px]">workspace_premium</span>
			</div>
			<h2 class="text-base font-bold text-zinc-900 dark:text-white">Paling Populer</h2>
			<span class="hidden md:inline text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
				Berdasarkan jumlah penggemar
			</span>
		</div>
		<a
			href="/popular"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5 group"
		>
			Lihat semua
			<span
				class="material-symbols-rounded text-[14px] group-hover:translate-x-0.5 transition-transform"
				>chevron_right</span
			>
		</a>
	</div>

	<div class="flex max-w-[calc(100%+2rem)] gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
		{#each popular as item}
			{@const cover = item.bigCover && item.bigCover.length > 0 ? item.bigCover : item.thumbnail}
			<a
				href="/anime/{item.slug}"
				class="shrink-0 w-72 md:w-80 group block"
				aria-label={item.title}
			>
				<div
					class="relative aspect-16/10 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-xl shadow-black/30 ring-1 ring-white/10"
				>
					<OptimizedImage
						src={cover}
						alt={item.title}
						className="h-full w-full"
						imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
						loading="lazy"
						fetchpriority="low"
						sizes="(max-width: 768px) 288px, 320px"
					/>
					<!-- Cinematic gradient -->
					<div
						class="absolute inset-0 bg-linear-to-t from-black/95 via-black/50 to-transparent"
					></div>
					<!-- Rating badge top-right -->
					{#if item.rating}
						<div class="absolute top-3 right-3">
							<span
								class="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black text-amber-900 bg-linear-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/40 ring-1 ring-white/30"
							>
								<span
									class="material-symbols-rounded text-[13px] leading-none"
									style="font-variation-settings: 'FILL' 1;"
								>
									star
								</span>
								{item.rating.toFixed(1)}
							</span>
						</div>
					{/if}
					<!-- Type pill top-left -->
					{#if item.type}
						<div class="absolute top-3 left-3">
							<span
								class="px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-black/55 ring-1 ring-white/15 uppercase tracking-wider"
							>
								{item.type}
							</span>
						</div>
					{/if}
					<!-- Glassmorphism info panel bottom -->
					<div class="absolute inset-x-3 bottom-3">
						<div class="rounded-xl bg-black/35 ring-1 ring-white/20 p-3 shadow-lg">
							<p class="text-[14px] font-black text-white line-clamp-1 drop-shadow">
								{item.title}
							</p>
							<div class="flex items-center gap-2.5 mt-1.5 text-[10px] font-semibold text-white/80">
								{#if item.studio}
									<span class="flex items-center gap-1">
										<span class="material-symbols-rounded text-[12px] leading-none">apartment</span>
										<span class="truncate max-w-32">{item.studio}</span>
									</span>
								{/if}
								{#if item.followed}
									<span class="flex items-center gap-1">
										<span class="material-symbols-rounded text-[12px] leading-none">favorite</span>
										{Intl.NumberFormat('id-ID', { notation: 'compact' }).format(item.followed)}
									</span>
								{/if}
								{#if item.episodeCount}
									<span class="flex items-center gap-1">
										<span class="material-symbols-rounded text-[12px] leading-none">
											play_circle
										</span>
										{item.episodeCount} ep
									</span>
								{/if}
							</div>
						</div>
					</div>
					<!-- Hover play -->
					<div
						class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition"
					>
						<div
							class="h-14 w-14 rounded-full bg-violet-500/90 border-2 border-white/70 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform shadow-2xl shadow-violet-500/50"
						>
							<span class="material-symbols-rounded text-white text-[32px]">play_arrow</span>
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- NEW RELEASE -->
<section class="mb-8">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2.5">
			<div class="flex items-center justify-center h-7 w-7 rounded-lg bg-purple-500/15">
				<span class="material-symbols-rounded text-purple-500 text-[18px]">new_releases</span>
			</div>
			<h2 class="text-base font-bold text-zinc-900 dark:text-white">Baru Diupdate</h2>
		</div>
		<a
			href="/browse?sortBy=updatedAt"
			class="text-[12px] text-violet-500 hover:text-violet-400 font-medium flex items-center gap-0.5 group"
		>
			Lihat semua
			<span
				class="material-symbols-rounded text-[14px] group-hover:translate-x-0.5 transition-transform"
				>chevron_right</span
			>
		</a>
	</div>

	<!-- Grid -->
	<VirtualizedAnimeGrid
		items={newRelease}
		columns={{ base: 3, md: 4, lg: 6 }}
		mobileLimit={9}
		ariaLabel="Anime baru diupdate"
	/>
</section>

<!-- CTA BANNER — Random / Browse -->
<section class="mb-8">
	<div
		class="relative overflow-hidden rounded-3xl p-6 md:p-8 ring-1 ring-white/10 shadow-2xl shadow-violet-600/20"
		style="background: radial-gradient(120% 120% at 0% 0%, oklch(0.55 0.22 295) 0%, oklch(0.4 0.22 310) 35%, oklch(0.2 0.14 290) 75%, oklch(0.15 0.1 280) 100%);"
	>
		<!-- Decorative blur blobs -->
		<div
			class="home-decor-blur absolute -top-20 -right-20 h-56 w-56 rounded-full bg-fuchsia-500/40 blur-3xl pointer-events-none"
		></div>
		<div
			class="home-decor-blur absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl pointer-events-none"
		></div>
		<!-- Sparkle icon -->
		<div class="absolute top-4 right-4 md:top-6 md:right-6 opacity-30 pointer-events-none">
			<span class="material-symbols-rounded text-white text-[80px] md:text-[120px]">
				auto_awesome
			</span>
		</div>

		<div class="relative flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
			<div class="flex-1 min-w-0">
				<span
					class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/25 text-[10px] font-black uppercase tracking-widest text-white mb-3"
				>
					<span class="h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-pulse"></span>
					Rekomendasi Harian
				</span>
				<h3 class="text-xl md:text-2xl font-black text-white mb-2 leading-tight">
					Bingung mau nonton apa?
				</h3>
				<p class="text-[13px] md:text-sm text-white/80 max-w-md leading-relaxed">
					Biarkan kami pilihkan yang seru untukmu, atau jelajahi semua koleksi yang tersedia.
				</p>
			</div>

			<div class="flex items-center gap-3 shrink-0">
				<a
					href="/random"
					class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-violet-700 font-black text-[13px] shadow-xl shadow-black/20 hover:scale-105 active:scale-95 transition-transform"
				>
					<span class="material-symbols-rounded text-[18px]">casino</span>
					Tonton Acak
				</a>
				<a
					href="/browse"
					class="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 text-white font-black text-[13px] ring-1 ring-white/25 hover:bg-white/20 active:scale-95 transition"
				>
					<span class="material-symbols-rounded text-[18px]">explore</span>
					Jelajahi
				</a>
			</div>
		</div>
	</div>
</section>

<NavigationBottom />

<style>
	/* Genre chip: brighten neon glow on hover using CSS var --glow set inline per palette */
	.genre-chip:hover {
		box-shadow:
			0 4px 18px rgba(var(--glow), 0.55),
			0 0 24px rgba(var(--glow), 0.35) !important;
	}

	@media (hover: none), (pointer: coarse) {
		.genre-chip {
			transition-duration: 120ms;
		}

		.genre-chip:hover {
			box-shadow: 0 2px 10px rgba(var(--glow), 0.25) !important;
			transform: none;
		}

		.top-rank-number {
			filter: none !important;
		}

		:global(.home-decor-blur) {
			filter: none;
			opacity: 0.18;
		}
	}
</style>
