<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import config from '$lib/config';
	import SEO from '$lib/components/SEO.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		genre: string[];
		status: 'Ongoing' | 'Completed';
		rating?: string;
		episodes?: number;
	};

	type Meta = {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};

	// Query params
	let q = $state($page.url.searchParams.get('q') ?? '');
	let selectedGenres = $state<string[]>(
		$page.url.searchParams.get('genre')?.split(',').filter(Boolean) ?? []
	);
	let selectedStatus = $state($page.url.searchParams.get('status') ?? '');
	let sortBy = $state($page.url.searchParams.get('sortBy') ?? 'trending');
	let currentPage = $state(Number($page.url.searchParams.get('page') ?? 1));

	// UI state
	let results = $state<Anime[]>([]);
	let meta = $state<Meta | null>(null);
	let loading = $state(false);
	let filterOpen = $state(false);
	let searchInput = $state(q);
	let debounceTimer: ReturnType<typeof setTimeout>;

	const GENRES = [
		'Action',
		'Adventure',
		'Fantasy',
		'Comedy',
		'Romance',
		'Drama',
		'Horror',
		'Sci-Fi',
		'Historical',
		'Sports',
		'Supernatural',
		'Mystery',
		'Slice of Life'
	];

	const SORT_OPTIONS = [
		{ value: 'trending', label: 'Trending' },
		{ value: 'latest', label: 'Terbaru' },
		{ value: 'rating', label: 'Rating' },
		{ value: 'title', label: 'A–Z' }
	];

	function buildUrl(params: Record<string, string | number | string[]>) {
		const url = new URL($page.url);
		Object.entries(params).forEach(([key, val]) => {
			if (Array.isArray(val)) {
				val.length ? url.searchParams.set(key, val.join(',')) : url.searchParams.delete(key);
			} else if (val === '' || val === null) {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, String(val));
			}
		});
		return url.toString();
	}

	async function fetchResults() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (q) params.set('q', q);
			if (selectedGenres.length) params.set('genre', selectedGenres.join(','));
			if (selectedStatus) params.set('status', selectedStatus);
			params.set('sortBy', sortBy);
			params.set('page', String(currentPage));
			params.set('limit', '18');

			const res = await fetch(`${config.API_BASE_URL}/api/anime/search?${params}`);
			const data = await res.json();
			results = data.data ?? [];
			meta = data.meta ?? null;
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}

	function syncUrlAndFetch() {
		goto(
			buildUrl({
				q,
				genre: selectedGenres,
				status: selectedStatus,
				sortBy,
				page: currentPage
			}),
			{ replaceState: true, noScroll: true }
		);
		fetchResults();
	}

	function onSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			q = searchInput;
			currentPage = 1;
			syncUrlAndFetch();
		}, 400);
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			clearTimeout(debounceTimer);
			q = searchInput;
			currentPage = 1;
			syncUrlAndFetch();
		}
	}

	function toggleGenre(genre: string) {
		selectedGenres = selectedGenres.includes(genre)
			? selectedGenres.filter((g) => g !== genre)
			: [...selectedGenres, genre];
		currentPage = 1;
		syncUrlAndFetch();
	}

	function setStatus(val: string) {
		selectedStatus = selectedStatus === val ? '' : val;
		currentPage = 1;
		syncUrlAndFetch();
	}

	function setSort(val: string) {
		sortBy = val;
		currentPage = 1;
		syncUrlAndFetch();
	}

	function goPage(p: number) {
		currentPage = p;
		syncUrlAndFetch();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function clearAll() {
		q = '';
		searchInput = '';
		selectedGenres = [];
		selectedStatus = '';
		sortBy = 'trending';
		currentPage = 1;
		syncUrlAndFetch();
	}

	$derived: {
		const hasFilter = selectedGenres.length > 0 || selectedStatus !== '' || q !== '';
	}

	let hasFilter = $derived(selectedGenres.length > 0 || selectedStatus !== '' || q !== '');

	onMount(() => fetchResults());
</script>

<SEO
	title={q ? `Hasil: ${q}` : 'Cari Anime'}
	description="Cari anime berdasarkan judul, genre, status, dan ranking."
/>

<div class="max-w-5xl mx-auto">
	<!-- SEARCH INPUT -->
	<div class="mb-4 sticky top-14 z-30 max-w-[calc(100%+2rem)] overflow-x-clip bg-zinc-50 dark:bg-zinc-950 py-2 -mx-4 px-4">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<span
					class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-zinc-400"
					>search</span
				>
				<input
					bind:value={searchInput}
					oninput={onSearchInput}
					onkeydown={onSearchKeydown}
					type="search"
					placeholder="Cari judul, genre, karakter..."
					class="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-violet-500 focus:outline-none shadow-sm transition"
					autofocus
				/>
				{#if searchInput}
					<button
						onclick={() => {
							searchInput = '';
							q = '';
							currentPage = 1;
							syncUrlAndFetch();
						}}
						class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
					>
						<span class="material-symbols-rounded text-[18px]">close</span>
					</button>
				{/if}
			</div>

			<!-- Filter toggle button -->
			<button
				onclick={() => (filterOpen = !filterOpen)}
				class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold border transition shrink-0
                    {filterOpen || selectedGenres.length > 0 || selectedStatus
					? 'bg-violet-600 border-violet-600 text-white'
					: 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}"
			>
				<span class="material-symbols-rounded text-[18px]">tune</span>
				<span class="hidden sm:inline">Filter</span>
				{#if selectedGenres.length > 0 || selectedStatus}
					<span
						class="h-5 w-5 rounded-full bg-white/30 text-[10px] font-black flex items-center justify-center"
					>
						{selectedGenres.length + (selectedStatus ? 1 : 0)}
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- FILTER PANEL -->
	{#if filterOpen}
		<div
			class="mb-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm"
		>
			<!-- Sort -->
			<div class="mb-4">
				<p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Urutkan</p>
				<div class="flex flex-wrap gap-2">
					{#each SORT_OPTIONS as opt}
						<button
							onclick={() => setSort(opt.value)}
							class="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition
                                {sortBy === opt.value
								? 'bg-violet-600 border-violet-600 text-white'
								: 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Status -->
			<div class="mb-4">
				<p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Status</p>
				<div class="flex gap-2">
					{#each [{ value: 'ongoing', label: '● Tayang' }, { value: 'completed', label: 'Tamat' }] as s}
						<button
							onclick={() => setStatus(s.value)}
							class="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition
                                {selectedStatus === s.value
								? 'bg-violet-600 border-violet-600 text-white'
								: 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500'}"
						>
							{s.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Genre -->
			<div>
				<p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Genre</p>
				<div class="flex flex-wrap gap-2">
					{#each GENRES as genre}
						<button
							onclick={() => toggleGenre(genre)}
							class="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition
                                {selectedGenres.includes(genre)
								? 'bg-violet-600 border-violet-600 text-white'
								: 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500'}"
						>
							{genre}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- ACTIVE FILTERS + RESULT INFO -->
	<div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
		<div class="flex items-center gap-2 flex-wrap">
			{#if q}
				<span
					class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700"
				>
					<span class="material-symbols-rounded text-[13px]">search</span>
					{q}
					<button
						onclick={() => {
							q = '';
							searchInput = '';
							syncUrlAndFetch();
						}}
					>
						<span class="material-symbols-rounded text-[12px] hover:text-violet-500">close</span>
					</button>
				</span>
			{/if}
			{#each selectedGenres as genre}
				<span
					class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
				>
					{genre}
					<button onclick={() => toggleGenre(genre)}>
						<span class="material-symbols-rounded text-[12px] hover:text-red-400">close</span>
					</button>
				</span>
			{/each}
			{#if selectedStatus}
				<span
					class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
				>
					{selectedStatus === 'ongoing' ? 'Tayang' : 'Tamat'}
					<button onclick={() => setStatus('')}>
						<span class="material-symbols-rounded text-[12px] hover:text-red-400">close</span>
					</button>
				</span>
			{/if}
			{#if hasFilter}
				<button
					onclick={clearAll}
					class="text-[11px] text-red-500 hover:text-red-400 font-semibold transition"
				>
					Reset semua
				</button>
			{/if}
		</div>

		{#if meta}
			<span class="text-[12px] text-zinc-500 dark:text-zinc-400 shrink-0">
				{meta.total} hasil
			</span>
		{/if}
	</div>

	<!-- RESULTS GRID -->
	{#if loading}
		<!-- Skeleton -->
		<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
			{#each Array(18) as _}
				<div class="flex flex-col gap-2">
					<div class="aspect-[2/3] rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
					<div class="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse w-3/4"></div>
					<div class="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse w-1/2"></div>
				</div>
			{/each}
		</div>
	{:else if results.length > 0}
		<VirtualizedAnimeGrid
			items={results}
			columns={{ base: 3, sm: 4, md: 5, lg: 6 }}
			ariaLabel="Hasil pencarian anime"
		/>
		{#if false}
		<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
			{#each results as item}
				<a href="/anime/{item.slug}" class="group flex flex-col">
					<div
						class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 mb-2 shadow-sm group-hover:shadow-lg group-hover:shadow-black/20 transition-shadow duration-300"
					>
						<img
							src={item.thumbnail}
							alt={item.title}
							class="w-full h-full object-cover transition duration-500 group-hover:scale-110"
							loading="lazy"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
						></div>

						<!-- Hover play -->
						<div
							class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 backdrop-blur-[1px] transition-all duration-300"
						>
							<div
								class="h-11 w-11 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300"
							>
								<span class="material-symbols-rounded text-white text-[24px]">play_arrow</span>
							</div>
						</div>

						<!-- Status badge -->
						<div class="absolute top-1.5 left-1.5">
							{#if item.status === 'Ongoing'}
								<span
									class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-sm"
								>
									<span class="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
									Tayang
								</span>
							{:else}
								<span
									class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-500/20 border border-zinc-500/30 text-zinc-400 backdrop-blur-sm"
									>Tamat</span
								>
							{/if}
						</div>

						<!-- Rating -->
						{#if item.rating}
							<div
								class="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm"
							>
								<span class="material-symbols-rounded text-yellow-400 text-[11px]">star</span>
								<span class="text-white text-[10px] font-bold">{item.rating}</span>
							</div>
						{/if}

						<!-- Genre pill -->
						<div class="absolute bottom-1.5 left-1.5">
							{#if item.genre?.[0]}
								<span
									class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-600/70 text-white backdrop-blur-sm"
								>
									{item.genre[0]}
								</span>
							{/if}
						</div>
					</div>

					<p
						class="text-[12px] font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors"
					>
						{item.title}
					</p>
					<div class="flex gap-1 mt-0.5 flex-wrap">
						{#each item.genre.slice(0, 2) as g, gi}
							<span class="text-[10px] text-zinc-500 dark:text-zinc-400">{g}</span>
							{#if gi < Math.min(item.genre.length, 2) - 1}
								<span class="text-zinc-300 dark:text-zinc-600 text-[10px]">·</span>
							{/if}
						{/each}
					</div>
				</a>
			{/each}
		</div>
		{/if}

		<!-- PAGINATION -->
		{#if meta && meta.totalPages > 1}
			<div class="flex items-center justify-center gap-2 mt-8 flex-wrap">
				<button
					onclick={() => goPage(currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
				>
					<span class="material-symbols-rounded text-[18px]">chevron_left</span>
				</button>

				{#each Array.from({ length: meta.totalPages }, (_, i) => i + 1) as p}
					{#if p === 1 || p === meta.totalPages || (p >= currentPage - 2 && p <= currentPage + 2)}
						<button
							onclick={() => goPage(p)}
							class="h-9 min-w-[36px] px-3 rounded-xl text-sm font-semibold border transition
                                {p === currentPage
								? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
								: 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500'}"
						>
							{p}
						</button>
					{:else if p === currentPage - 3 || p === currentPage + 3}
						<span class="text-zinc-400 text-sm px-1">...</span>
					{/if}
				{/each}

				<button
					onclick={() => goPage(currentPage + 1)}
					disabled={currentPage >= meta.totalPages}
					class="h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-400 hover:text-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
				>
					<span class="material-symbols-rounded text-[18px]">chevron_right</span>
				</button>
			</div>
		{/if}
	{:else}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center py-16 gap-3 text-center">
			<div
				class="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2"
			>
				<span class="material-symbols-rounded text-[44px] text-zinc-400">search_off</span>
			</div>
			<h3 class="font-bold text-zinc-700 dark:text-zinc-300 text-lg">
				{q ? `Tidak ada hasil untuk "${q}"` : 'Tidak ada anime ditemukan'}
			</h3>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
				Coba ubah kata kunci atau hapus beberapa filter yang aktif
			</p>
			{#if hasFilter}
				<button
					onclick={clearAll}
					class="mt-2 px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition"
				>
					Reset Filter
				</button>
			{/if}
		</div>
	{/if}
</div>
