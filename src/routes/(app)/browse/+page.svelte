<script lang="ts">
	import { goto } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import CustomSelect, { type CustomSelectOption } from '$lib/components/ui/CustomSelect.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import './browse.css';

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
	const filterPanelOpen = $derived(filterTouched ? filterOpen : advancedFilterCount > 0);

	onMount(() => {
		const header = document.querySelector('header');
		if (!header) return;

		const syncStickyTop = () => {
			stickyTop = Math.ceil(header.getBoundingClientRect().height);
		};
		const observer = new ResizeObserver(syncStickyTop);
		observer.observe(header);
		syncStickyTop();

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

<div class="browse-page max-w-6xl mx-auto" style:--browse-sticky-top={`${stickyTop}px`}>
	<section class="browse-search-shell mb-4 md:mb-5">
		<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div class="hidden md:block">
				<div class="flex items-center gap-2 mb-2">
					<div class="h-8 w-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
						<AppIcon name="explore" class="text-violet-500 text-[20px]" />
					</div>
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Katalog</p>
				</div>
				<h1 class="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">
					Jelajahi Anime
				</h1>
			</div>

			<form action="/browse" method="GET" class="browse-search-form" onsubmit={handleSearchSubmit}>
				<div class="relative flex-1 md:w-72">
					<AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-400" />
					<input
						name="q"
						value={filters.q}
						placeholder="Cari anime..."
						class="w-full h-11 pl-10 pr-3 rounded-2xl bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm ring-1 ring-zinc-200 border-0 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 text-sm focus:outline-none focus:ring-violet-500"
					/>
				</div>
				<button
					type="submit"
					class="browse-search-submit"
				>
					Cari
				</button>
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
		</div>
	</section>

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
</div>

<NavigationBottom />
