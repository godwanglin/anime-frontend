<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import type { PageData } from './$types';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
	};

	const { data }: { data: PageData } = $props();
	const animes = $derived((data.animes ?? []) as Anime[]);
</script>

<SEO title="Anime Populer" description="Daftar anime populer dan trending untuk ditonton." />

<div class="max-w-6xl mx-auto">
	<section class="mb-5 flex items-end justify-between gap-3">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<div class="h-8 w-8 rounded-xl bg-orange-500/15 flex items-center justify-center">
					<AppIcon name="local_fire_department" class="text-orange-500 text-[20px]" />
				</div>
				<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ranking</p>
			</div>
			<h1 class="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white">Anime Populer</h1>
		</div>
		<a
			href="/browse?sortBy=followed"
			class="hidden sm:flex items-center gap-1 text-[12px] font-bold text-violet-500 hover:text-violet-400"
		>
			Browse lengkap
			<AppIcon name="chevron_right" class="text-[14px]" />
		</a>
	</section>

	<VirtualizedAnimeGrid
		items={animes}
		columns={{ base: 3, sm: 4, md: 5, lg: 6 }}
		showRank
		ariaLabel="Anime populer"
	/>
</div>

<NavigationBottom />
