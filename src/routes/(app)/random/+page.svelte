<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
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
	};

	const { data }: { data: PageData } = $props();
	const animes = $derived((data.animes ?? []) as Anime[]);
</script>

<SEO title="Random Anime" description="Pilihan anime acak dari katalog AniStream." />

<div class="max-w-6xl mx-auto">
	<section
		class="mb-6 rounded-3xl overflow-hidden bg-zinc-900 text-white border border-white/10 shadow-xl shadow-black/10"
	>
		<div class="p-5 md:p-7 bg-gradient-to-br from-violet-600/45 via-zinc-900 to-emerald-600/30">
			<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
				<div>
					<div
						class="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center mb-3 border border-white/10"
					>
						<AppIcon name="shuffle" class="text-[23px]" />
					</div>
					<p class="text-[11px] font-black uppercase tracking-widest text-white/55 mb-2">
						Discovery
					</p>
					<h1 class="text-2xl md:text-3xl font-black">Random Anime</h1>
					<p class="text-sm text-white/65 mt-2 max-w-xl">
						Kumpulan pilihan acak dari katalog. Refresh untuk dapet kombinasi baru.
					</p>
				</div>
				<a
					href="/random?limit={data.limit}"
					class="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white text-zinc-900 text-sm font-black hover:bg-violet-100 transition active:scale-95"
				>
					<AppIcon name="autorenew" class="text-[18px]" />
					Acak lagi
				</a>
			</div>
		</div>
	</section>

	<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
		{#each animes as item}
			<AnimeCard
				id={item.id}
				title={item.title}
				thumbnail={item.thumbnail}
				genres={item.genre}
				slug={item.slug}
				status={item.status}
			/>
		{/each}
	</div>
</div>

<NavigationBottom />
