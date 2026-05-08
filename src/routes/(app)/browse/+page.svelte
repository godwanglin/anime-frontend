<script lang="ts">
	import { goto } from '$app/navigation';
	import AlphabetRail, { DEFAULT_ALPHABET } from '$lib/components/AlphabetRail.svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import CustomSelect, { type CustomSelectOption } from '$lib/components/ui/CustomSelect.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import config from '$lib/config';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import './browse.css';

	type IndexItem = {
		slug: string;
		title: string;
		type: string | null;
		status: 'Ongoing' | 'Completed' | null;
		year: number | null;
		totalEpisodes: number | null;
	};

	type ViewMode = 'grid' | 'index';
	const VIEW_KEY = 'browse:view';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
		rating?: number | null;
		episodeCount?: number;
		type?: string | null;
		studio?: string | null;
	};

	type OptionItem = {
		name?: string;
		slug?: string;
		label?: string;
		animeCount?: number;
	};

	type Meta = {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};

	const { data }: { data: PageData } = $props();
	const animes = $derived((data.animes ?? []) as Anime[]);
	const meta = $derived(data.meta as Meta | null);
	const genres = $derived((data.genres ?? []) as OptionItem[]);
	const tags = $derived((data.tags ?? []) as OptionItem[]);
	const studios = $derived((data.studios ?? []) as OptionItem[]);
	const filters = $derived(data.filters);

	const sortOptions: CustomSelectOption[] = [
		{ value: 'updatedAt', label: 'Terbaru', icon: 'auto_awesome' },
		{ value: 'trending', label: 'Trending', icon: 'local_fire_department' },
		{ value: 'rating', label: 'Rating', icon: 'star' },
		{ value: 'followed', label: 'Populer', icon: 'favorite' },
		{ value: 'title', label: 'A-Z', icon: 'sort_by_alpha' }
	];

	const statusOptions: CustomSelectOption[] = [
		{ value: '', label: 'Semua status', icon: 'apps' },
		{ value: 'ongoing', label: 'Tayang', icon: 'play_circle' },
		{ value: 'completed', label: 'Tamat', icon: 'check_circle' }
	];

	const genreOptions = $derived<CustomSelectOption[]>([
		{ value: '', label: 'Semua genre', icon: 'category' },
		...genres.map((genre) => ({
			value: genre.name ?? '',
			label: genre.name ?? 'Genre',
			description: genre.animeCount ? `${genre.animeCount} anime` : undefined,
			icon: 'label'
		}))
	]);

	const tagOptions = $derived<CustomSelectOption[]>([
		{ value: '', label: 'Semua tag', icon: 'sell' },
		...tags.map((tag) => ({
			value: tag.slug ?? '',
			label: tag.label ?? tag.slug ?? 'Tag',
			icon: 'sell'
		}))
	]);

	const studioOptions = $derived<CustomSelectOption[]>([
		{ value: '', label: 'Semua studio', icon: 'apartment' },
		...studios.map((studio) => ({
			value: studio.name ?? '',
			label: studio.name ?? 'Studio',
			icon: 'apartment'
		}))
	]);

	const activeFilterCount = $derived(
		[filters.q, filters.genre, filters.status, filters.tag, filters.studio].filter(Boolean).length
	);
	const advancedFilterCount = $derived(
		[filters.genre, filters.status, filters.tag, filters.studio].filter(Boolean).length
	);
	let filterOpen = $state(false);
	let filterTouched = $state(false);
	let stickyTop = $state(56);
	let shellBottom = $state(120);
	const filterPanelOpen = $derived(filterTouched ? filterOpen : advancedFilterCount > 0);

	let viewMode = $state<ViewMode>('grid');
	let indexItems = $state<IndexItem[]>([]);
	let indexLoading = $state(false);
	let indexError = $state<string | null>(null);
	let indexQuery = $state('');
	let activeLetter = $state('');

	onMount(() => {
		const header = document.querySelector('header');
		const cleanups: Array<() => void> = [];

		if (header) {
			const syncStickyTop = () => {
				stickyTop = Math.ceil(header.getBoundingClientRect().height);
			};
			const observer = new ResizeObserver(syncStickyTop);
			observer.observe(header);
			syncStickyTop();
			cleanups.push(() => observer.disconnect());
		}

		const shellEl = document.querySelector('.browse-search-shell');
		if (shellEl) {
			const syncShellBottom = () => {
				shellBottom = Math.ceil(shellEl.getBoundingClientRect().bottom);
			};
			const shellObserver = new ResizeObserver(syncShellBottom);
			shellObserver.observe(shellEl);
			syncShellBottom();
			cleanups.push(() => shellObserver.disconnect());
		}

		try {
			const saved = localStorage.getItem(VIEW_KEY);
			if (saved === 'index' || saved === 'grid') {
				viewMode = saved;
				if (saved === 'index') void loadIndex();
			}
		} catch {
			/* ignore */
		}

		return () => cleanups.forEach((fn) => fn());
	});

	async function loadIndex() {
		if (indexItems.length > 0 || indexLoading) return;
		indexLoading = true;
		indexError = null;
		try {
			const res = await fetch(`${config.API_BASE_URL}/api/anime/index`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			indexItems = (json?.data ?? []) as IndexItem[];
		} catch (err) {
			indexError = (err as Error).message ?? 'Gagal memuat indeks';
		} finally {
			indexLoading = false;
		}
	}

	function setView(mode: ViewMode) {
		viewMode = mode;
		try {
			localStorage.setItem(VIEW_KEY, mode);
		} catch {
			/* ignore */
		}
		if (mode === 'index') void loadIndex();
	}

	const filteredIndex = $derived.by(() => {
		const q = indexQuery.trim().toLowerCase();
		if (!q) return indexItems;
		return indexItems.filter((i) => i.title.toLowerCase().includes(q));
	});

	const indexGroups = $derived.by(() => {
		const map: Record<string, IndexItem[]> = {};
		for (const item of filteredIndex) {
			const first = (item.title?.charAt(0) ?? '').toUpperCase();
			const key = /[A-Z]/.test(first) ? first : '#';
			if (!map[key]) map[key] = [];
			map[key].push(item);
		}
		return DEFAULT_ALPHABET.filter((k) => map[k]?.length).map((letter) => ({
			letter,
			items: map[letter] ?? []
		}));
	});

	const indexEnabledLetters = $derived(new Set(indexGroups.map((g) => g.letter)));

	$effect(() => {
		if (!activeLetter && indexGroups.length > 0) activeLetter = indexGroups[0].letter;
	});

	function jumpTo(letter: string) {
		const el = document.getElementById(`browse-section-${letter}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeLetter = letter;
		}
	}

	$effect(() => {
		if (viewMode !== 'index' || indexGroups.length === 0) return;
		if (typeof IntersectionObserver === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				const intersecting = entries.filter((e) => e.isIntersecting);
				if (intersecting.length === 0) return;
				const top = intersecting.sort(
					(a, b) => a.boundingClientRect.top - b.boundingClientRect.top
				)[0];
				const letter = top.target.getAttribute('data-letter');
				if (letter) activeLetter = letter;
			},
			{ rootMargin: '-20% 0px -60% 0px', threshold: 0 }
		);

		queueMicrotask(() => {
			document
				.querySelectorAll('[data-browse-section]')
				.forEach((el) => observer.observe(el));
		});

		return () => observer.disconnect();
	});

	function browseUrl(next: Record<string, string | number | null | undefined>) {
		const params = new URLSearchParams();
		const merged = { ...filters, ...next };

		for (const [key, value] of Object.entries(merged)) {
			if (value === null || value === undefined || value === '' || key === 'limit') continue;
			params.set(key, String(value));
		}

		return `/browse?${params.toString()}`;
	}

	function goToBrowse(url: string) {
		return goto(url, { replaceState: true, keepFocus: true });
	}

	function goToFilter(next: Record<string, string | number | null | undefined>) {
		return goToBrowse(browseUrl({ ...next, page: 1 }));
	}

	function handleSearchSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const query = String(new FormData(form).get('q') ?? '').trim();
		goToFilter({ q: query || null });
	}

	function toggleFilterPanel() {
		filterTouched = true;
		filterOpen = !filterPanelOpen;
	}

	function filterLabel(type: 'status' | 'genre' | 'tag' | 'studio', value: string) {
		if (!value) return '';
		if (type === 'status') return statusOptions.find((option) => option.value === value)?.label ?? value;
		if (type === 'genre') return value;
		if (type === 'tag') return tags.find((tag) => tag.slug === value)?.label ?? value;
		return value;
	}
</script>

<SEO title="Jelajahi Anime" description="Cari dan jelajahi katalog anime subtitle Indonesia." />

<div
	class="browse-page max-w-6xl mx-auto"
	style:--browse-sticky-top={`${stickyTop}px`}
	style:--browse-shell-bottom={`${shellBottom}px`}
>
	<section class="browse-search-shell mb-4 md:mb-5">
		<div class="browse-header-row">
			<div class="browse-title-block">
				<div class="browse-title-icon-row">
					<div class="h-8 w-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
						<AppIcon name="explore" class="text-violet-500 text-[20px]" />
					</div>
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Katalog</p>
				</div>
				<h1 class="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">
					Jelajahi Anime
				</h1>
			</div>

			<div class="view-toggle" role="group" aria-label="Pilih tampilan">
				<button
					type="button"
					class="view-btn"
					class:view-btn-active={viewMode === 'grid'}
					onclick={() => setView('grid')}
					aria-pressed={viewMode === 'grid'}
					aria-label="Tampilan grid"
				>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
						<rect x="3" y="3" width="8" height="8" rx="1.5" />
						<rect x="13" y="3" width="8" height="8" rx="1.5" />
						<rect x="3" y="13" width="8" height="8" rx="1.5" />
						<rect x="13" y="13" width="8" height="8" rx="1.5" />
					</svg>
					<span class="view-btn-label">Grid</span>
				</button>
				<button
					type="button"
					class="view-btn"
					class:view-btn-active={viewMode === 'index'}
					onclick={() => setView('index')}
					aria-pressed={viewMode === 'index'}
					aria-label="Tampilan indeks A-Z"
				>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
						<rect x="3" y="5" width="14" height="2" rx="1" />
						<rect x="3" y="11" width="14" height="2" rx="1" />
						<rect x="3" y="17" width="14" height="2" rx="1" />
						<circle cx="20" cy="6" r="1.4" />
						<circle cx="20" cy="12" r="1.4" />
						<circle cx="20" cy="18" r="1.4" />
					</svg>
					<span class="view-btn-label">A-Z</span>
				</button>
			</div>
		</div>

		{#if viewMode === 'grid'}
			<form action="/browse" method="GET" class="browse-search-form" onsubmit={handleSearchSubmit}>
				<div class="relative flex-1">
					<AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-400" />
					<input
						name="q"
						value={filters.q}
						placeholder="Cari anime..."
						class="w-full h-11 pl-10 pr-3 rounded-2xl bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm ring-1 ring-zinc-200 border-0 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 text-sm focus:outline-none focus:ring-violet-500"
					/>
				</div>
				<button type="submit" class="browse-search-submit">Cari</button>
				<button
					type="button"
					class="browse-filter-toggle"
					class:is-active={filterPanelOpen}
					aria-expanded={filterPanelOpen}
					aria-controls="browse-advanced-filter"
					onclick={toggleFilterPanel}
				>
					<AppIcon name="tune" class="text-[18px]" />
					<span class="hidden min-[380px]:inline">Filter</span>
					{#if advancedFilterCount}
						<b>{advancedFilterCount}</b>
					{/if}
				</button>
			</form>
		{:else}
			<div class="browse-search-form">
				<div class="relative flex-1">
					<AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-400" />
					<input
						type="search"
						bind:value={indexQuery}
						placeholder="Saring judul..."
						aria-label="Saring judul"
						class="w-full h-11 pl-10 pr-3 rounded-2xl bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm ring-1 ring-zinc-200 border-0 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 text-sm focus:outline-none focus:ring-violet-500"
					/>
				</div>
				<span class="browse-index-count-pill">
					{filteredIndex.length}
					{#if !indexLoading && indexItems.length > 0}<small>/ {indexItems.length}</small>{/if}
				</span>
			</div>
		{/if}
	</section>

	{#if viewMode === 'grid'}
	<section
		id="browse-advanced-filter"
		class="browse-filter mb-5"
		class:is-open={filterPanelOpen}
		aria-hidden={!filterPanelOpen}
	>
		<div class="filter-head">
			<div>
				<p class="filter-kicker">Filter katalog</p>
				<p class="filter-count">
					{activeFilterCount ? `${activeFilterCount} filter aktif` : 'Semua koleksi'}
				</p>
			</div>
			<button type="button" class="filter-reset" aria-label="Reset filter" onclick={() => goToBrowse('/browse')}>
				<AppIcon name="restart_alt" class="text-[16px]" />
				Reset
			</button>
		</div>

		<div class="filter-grid">
			<div class="filter-field sort-field">
				<span>Urutkan</span>
				<CustomSelect
					value={filters.sortBy}
					options={sortOptions}
					fullWidth
					align="left"
					minWidth={190}
					onChange={(value) => goToFilter({ sortBy: value })}
				/>
			</div>
			<div class="filter-field">
				<span>Status</span>
				<CustomSelect
					value={filters.status}
					options={statusOptions}
					fullWidth
					align="left"
					minWidth={170}
					onChange={(value) => goToFilter({ status: value || null })}
				/>
			</div>
			<div class="filter-field">
				<span>Genre</span>
				<CustomSelect
					value={filters.genre}
					options={genreOptions}
					fullWidth
					align="left"
					minWidth={220}
					onChange={(value) => goToFilter({ genre: value || null })}
				/>
			</div>
			<div class="filter-field">
				<span>Tag</span>
				<CustomSelect
					value={filters.tag}
					options={tagOptions}
					fullWidth
					align="left"
					minWidth={220}
					onChange={(value) => goToFilter({ tag: value || null })}
				/>
			</div>
			<div class="filter-field studio-field">
				<span>Studio</span>
				<CustomSelect
					value={filters.studio}
					options={studioOptions}
					fullWidth
					align="left"
					minWidth={240}
					onChange={(value) => goToFilter({ studio: value || null })}
				/>
			</div>
		</div>

		{#if activeFilterCount}
			<div class="active-filter-row" aria-label="Filter aktif">
				{#if filters.q}
					<button
						type="button"
						onclick={() => goToFilter({ q: null })}
						class="active-filter-chip"
					>
						<AppIcon name="search" class="text-[13px]" />
						{filters.q}
						<AppIcon name="close" class="text-[13px]" />
					</button>
				{/if}
				{#if filters.genre}
					<button
						type="button"
						onclick={() => goToFilter({ genre: null })}
						class="active-filter-chip"
					>
						<AppIcon name="category" class="text-[13px]" />
						{filterLabel('genre', filters.genre)}
						<AppIcon name="close" class="text-[13px]" />
					</button>
				{/if}
				{#if filters.status}
					<button
						type="button"
						onclick={() => goToFilter({ status: null })}
						class="active-filter-chip"
					>
						<AppIcon name="play_circle" class="text-[13px]" />
						{filterLabel('status', filters.status)}
						<AppIcon name="close" class="text-[13px]" />
					</button>
				{/if}
				{#if filters.tag}
					<button
						type="button"
						onclick={() => goToFilter({ tag: null })}
						class="active-filter-chip"
					>
						<AppIcon name="sell" class="text-[13px]" />
						{filterLabel('tag', filters.tag)}
						<AppIcon name="close" class="text-[13px]" />
					</button>
				{/if}
				{#if filters.studio}
					<button
						type="button"
						onclick={() => goToFilter({ studio: null })}
						class="active-filter-chip"
					>
						<AppIcon name="apartment" class="text-[13px]" />
						{filterLabel('studio', filters.studio)}
						<AppIcon name="close" class="text-[13px]" />
					</button>
				{/if}
			</div>
		{/if}
	</section>

	<div class="flex items-center justify-between mb-4">
		<p class="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
			{meta?.total ?? animes.length} anime ditemukan
		</p>
		<a href="/random" class="text-[12px] text-violet-500 hover:text-violet-400 font-bold">
			Coba random
		</a>
	</div>

	{#if animes.length > 0}
		<VirtualizedAnimeGrid
			items={animes}
			columns={{ base: 3, sm: 4, md: 5, lg: 6 }}
			ariaLabel="Hasil jelajah anime"
		/>

		{#if meta && meta.totalPages > 1}
			<div class="mt-8 flex items-center justify-center gap-2">
				<a
					href={browseUrl({ page: Math.max(1, meta.page - 1) })}
					class="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-violet-400 hover:text-violet-500"
				>
					<AppIcon name="chevron_left" class="text-[18px]" />
				</a>
				<span
					class="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold"
				>
					{meta.page} / {meta.totalPages}
				</span>
				<a
					href={browseUrl({ page: Math.min(meta.totalPages, meta.page + 1) })}
					class="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-violet-400 hover:text-violet-500"
				>
					<AppIcon name="chevron_right" class="text-[18px]" />
				</a>
			</div>
		{/if}
	{:else}
		<div class="py-16 text-center">
			<AppIcon name="search_off" class="text-[52px] text-zinc-300 dark:text-zinc-700" />
			<p class="mt-2 font-bold text-zinc-700 dark:text-zinc-300">Tidak ada anime ditemukan</p>
			<a href="/browse" class="mt-3 inline-flex text-sm font-bold text-violet-500">Reset filter</a>
		</div>
	{/if}
	{:else}
		<!-- Index (A-Z directory) mode -->
		<section class="browse-index">
			{#if indexLoading && indexItems.length === 0}
				<div class="browse-index-state">Memuat indeks A-Z…</div>
			{:else if indexError}
				<div class="browse-index-state browse-index-state-error">
					Gagal memuat indeks: {indexError}
					<button type="button" onclick={() => loadIndex()} class="browse-index-retry">Coba lagi</button>
				</div>
			{:else if filteredIndex.length === 0}
				<div class="browse-index-state">
					{indexQuery ? 'Tidak ada judul yang cocok.' : 'Belum ada data.'}
				</div>
			{:else}
				<div class="browse-index-list">
					{#each indexGroups as group (group.letter)}
						<section
							id="browse-section-{group.letter}"
							data-browse-section
							data-letter={group.letter}
							class="browse-index-group"
						>
							<header class="browse-index-group-header">
								<span class="browse-index-letter">{group.letter}</span>
								<span class="browse-index-rule" aria-hidden="true"></span>
								<span class="browse-index-letter-count">{group.items.length}</span>
							</header>
							<ul class="browse-index-rows">
								{#each group.items as item (item.slug)}
									<li>
										<a class="browse-index-row" href="/anime/{item.slug}">
											<span class="browse-index-name">{item.title}</span>
											<span class="browse-index-meta">
												{#if item.type}<span class="browse-index-pill">{item.type}</span>{/if}
												{#if item.year}<span class="browse-index-year">{item.year}</span>{/if}
												{#if item.totalEpisodes}<span class="browse-index-eps">{item.totalEpisodes} ep</span>{/if}
											</span>
											<span class="browse-index-arrow" aria-hidden="true">→</span>
										</a>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

{#if viewMode === 'index' && indexGroups.length > 0}
	<AlphabetRail
		letters={DEFAULT_ALPHABET}
		enabled={indexEnabledLetters}
		active={activeLetter}
		onJump={jumpTo}
	/>
{/if}

<NavigationBottom />
