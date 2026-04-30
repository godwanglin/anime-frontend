<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import type { PageData } from './$types';

	type Genre = {
		id: number;
		name: string;
		animeCount: number;
	};

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
	};

	const { data }: { data: PageData } = $props();
	const genres = $derived((data.genres ?? []) as Genre[]);
	const popular = $derived((data.popular ?? []) as Anime[]);
</script>

<SEO title="Genre Anime" description="Direktori genre anime untuk menemukan tontonan baru." />

<div class="max-w-6xl mx-auto">
	<section class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<div class="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
				<AppIcon name="category" class="text-emerald-500 text-[21px]" />
			</div>
			<div>
				<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Direktori</p>
				<h1 class="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">Genre Anime</h1>
			</div>
		</div>
		<p class="text-sm text-zinc-500 dark:text-zinc-400">
			Pilih genre untuk membuka katalog yang sudah difilter.
		</p>
	</section>

	<section class="mb-8">
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
			{#each genres as genre}
				<a
					href="/browse?genre={encodeURIComponent(genre.name)}"
					class="group p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition shadow-sm hover:shadow-lg hover:shadow-black/5"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p
								class="font-black text-zinc-800 dark:text-zinc-100 group-hover:text-emerald-500 transition line-clamp-1"
							>
								{genre.name}
							</p>
							<p class="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1">
								{genre.animeCount} anime
							</p>
						</div>
						<AppIcon name="chevron_right" class="text-[18px] text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
					</div>
				</a>
			{/each}
		</div>
	</section>

	{#if popular.length > 0}
		<section class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-2.5">
					<div class="h-7 w-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
						<AppIcon name="local_fire_department" class="text-orange-500 text-[18px]" />
					</div>
					<h2 class="text-base font-bold text-zinc-900 dark:text-white">Populer Sekarang</h2>
				</div>
				<a href="/popular" class="text-[12px] text-violet-500 hover:text-violet-400 font-bold">
					Lihat semua
				</a>
			</div>
			<VirtualizedAnimeGrid
				items={popular}
				columns={{ base: 3, md: 6 }}
				showRank
				ariaLabel="Anime populer per genre"
			/>
		</section>
	{/if}
</div>

<NavigationBottom />
