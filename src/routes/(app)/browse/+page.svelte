<script lang="ts">
	import AnimeCard from '$lib/components/AnimeCard.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';

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

	const sortOptions = [
		{ value: 'updatedAt', label: 'Terbaru' },
		{ value: 'trending', label: 'Trending' },
		{ value: 'rating', label: 'Rating' },
		{ value: 'followed', label: 'Populer' },
		{ value: 'title', label: 'A-Z' }
	];

	function browseUrl(next: Record<string, string | number | null | undefined>) {
		const params = new URLSearchParams();
		const merged = { ...filters, ...next };

		for (const [key, value] of Object.entries(merged)) {
			if (value === null || value === undefined || value === '' || key === 'limit') continue;
			params.set(key, String(value));
		}

		return `/browse?${params.toString()}`;
	}
</script>

<SEO title="Jelajahi Anime" description="Cari dan jelajahi katalog anime subtitle Indonesia." />

<div class="max-w-6xl mx-auto">
	<section class="mb-4 md:mb-5">
		<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div class="hidden md:block">
				<div class="flex items-center gap-2 mb-2">
					<div class="h-8 w-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
						<span class="material-symbols-rounded text-violet-500 text-[20px]">explore</span>
					</div>
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Katalog</p>
				</div>
				<h1 class="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">
					Jelajahi Anime
				</h1>
			</div>

			<form action="/browse" method="GET" class="flex gap-2 w-full md:w-auto">
				<div class="relative flex-1 md:w-72">
					<span
						class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-400"
						>search</span
					>
					<input
						name="q"
						value={filters.q}
						placeholder="Cari anime..."
						class="w-full h-11 pl-10 pr-3 rounded-2xl bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm ring-1 ring-zinc-200 border-0 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 text-sm focus:outline-none focus:ring-violet-500"
					/>
				</div>
				<button
					class="h-11 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black shadow-lg shadow-violet-500/20 transition"
				>
					Cari
				</button>
			</form>
		</div>
	</section>

	<section
		class="mb-5 -mx-4 max-w-[calc(100%+2rem)] overflow-x-clip px-4 py-3 bg-white/85 border-y border-zinc-200 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 md:mx-0 md:max-w-full md:rounded-3xl md:border md:px-4"
	>
		<div class="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
			{#each sortOptions as opt}
				<a
					href={browseUrl({ sortBy: opt.value, page: 1 })}
					class="shrink-0 px-3 py-2 rounded-xl text-[12px] font-bold border transition
						{filters.sortBy === opt.value
						? 'bg-violet-600 border-violet-600 text-white'
						: 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-500'}"
				>
					{opt.label}
				</a>
			{/each}
			<a
				href="/browse"
				class="shrink-0 px-3 py-2 rounded-xl text-[12px] font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-red-500 hover:border-red-300 transition"
			>
				Reset
			</a>
		</div>

		<div class="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
			{#each genres.slice(0, 18) as genre}
				<a
					href={browseUrl({ genre: genre.name, page: 1 })}
					class="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition
						{filters.genre === genre.name
						? 'bg-emerald-600 border-emerald-600 text-white'
						: 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-500'}"
				>
					{genre.name}
				</a>
			{/each}
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
			<select
				onchange={(event) =>
					(location.href = browseUrl({
						status: (event.currentTarget as HTMLSelectElement).value,
						page: 1
					}))}
				class="h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 text-sm text-zinc-700 dark:text-zinc-200"
			>
				<option value="">Semua status</option>
				<option value="ongoing" selected={filters.status === 'ongoing'}>Tayang</option>
				<option value="completed" selected={filters.status === 'completed'}>Tamat</option>
			</select>
			<select
				onchange={(event) =>
					(location.href = browseUrl({
						tag: (event.currentTarget as HTMLSelectElement).value,
						page: 1
					}))}
				class="h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 text-sm text-zinc-700 dark:text-zinc-200"
			>
				<option value="">Semua tag</option>
				{#each tags as tag}
					<option value={tag.slug} selected={filters.tag === tag.slug}>{tag.label}</option>
				{/each}
			</select>
			<select
				onchange={(event) =>
					(location.href = browseUrl({
						studio: (event.currentTarget as HTMLSelectElement).value,
						page: 1
					}))}
				class="h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 text-sm text-zinc-700 dark:text-zinc-200"
			>
				<option value="">Semua studio</option>
				{#each studios as studio}
					<option value={studio.name} selected={filters.studio === studio.name}
						>{studio.name}</option
					>
				{/each}
			</select>
		</div>
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
		<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
			{#each animes as item}
				<AnimeCard
					title={item.title}
					thumbnail={item.thumbnail}
					genres={item.genre}
					slug={item.slug}
					status={item.status}
				/>
			{/each}
		</div>

		{#if meta && meta.totalPages > 1}
			<div class="mt-8 flex items-center justify-center gap-2">
				<a
					href={browseUrl({ page: Math.max(1, meta.page - 1) })}
					class="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-violet-400 hover:text-violet-500"
				>
					<span class="material-symbols-rounded text-[18px]">chevron_left</span>
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
					<span class="material-symbols-rounded text-[18px]">chevron_right</span>
				</a>
			</div>
		{/if}
	{:else}
		<div class="py-16 text-center">
			<span class="material-symbols-rounded text-[52px] text-zinc-300 dark:text-zinc-700"
				>search_off</span
			>
			<p class="mt-2 font-bold text-zinc-700 dark:text-zinc-300">Tidak ada anime ditemukan</p>
			<a href="/browse" class="mt-3 inline-flex text-sm font-bold text-violet-500">Reset filter</a>
		</div>
	{/if}
</div>

<NavigationBottom />
