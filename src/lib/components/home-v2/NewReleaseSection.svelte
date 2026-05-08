<script lang="ts">
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import TrendingIcon from './icons/TrendingIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
		type?: string | null;
		totalEpisodes?: number | null;
		episodeCount?: number | null;
	};

	let { items = [] }: { items?: Anime[] } = $props();
</script>

{#if items.length > 0}
	<section class="mb-9" aria-label="Baru diupdate">
		<header class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2.5">
				<span class="nr-icon-badge">
					<TrendingIcon size={14} />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black" style="color: var(--text-primary);">
						Baru Diupdate
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Update terbaru di koleksi
					</p>
				</div>
			</div>
			<a
				href="/browse?sortBy=updatedAt"
				class="nr-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Lihat semua
				<ChevronRightIcon size={14} />
			</a>
		</header>

		<VirtualizedAnimeGrid
			{items}
			columns={{ base: 3, md: 4, lg: 6 }}
			mobileLimit={9}
			ariaLabel="Anime baru diupdate"
		/>
	</section>
{/if}

<style>
	.nr-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		color: white;
		box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
	}

	.nr-link {
		color: var(--accent);
	}

	.nr-link:hover {
		color: var(--accent-hover);
	}
</style>
