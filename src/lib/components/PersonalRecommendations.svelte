<script lang="ts">
	import { onMount } from 'svelte';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import AnimeCard from '$lib/components/AnimeCard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	type Recommendation = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		status?: 'Ongoing' | 'Completed';
		type?: string | null;
		totalEpisodes?: number | null;
		episodeCount?: number | null;
		rating?: number | null;
		genres?: string[];
		reasons?: { label: string; type: string }[];
	};

	let items = $state<Recommendation[]>([]);
	let loading = $state(false);
	let loaded = $state(false);

	async function loadRecommendations() {
		if (!auth.isLoggedIn || loading || loaded) return;
		loading = true;
		try {
			if (!auth.accessToken) await auth.refreshToken();
			const response = await auth.authFetch('/api/recommendations/personal?limit=6');
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.message ?? 'Gagal memuat rekomendasi');
			items = payload?.data ?? [];
			loaded = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadRecommendations().catch(() => {
			loaded = true;
		});
	});
</script>

{#if auth.isLoggedIn && (items.length > 0 || loading)}
	<section class="mb-9">
		<div class="mb-3 flex items-center justify-between gap-3">
			<div>
				<h2 class="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
					<AppIcon name="auto_awesome" class="text-[19px] text-violet-500" />
					Rekomendasi Buat Kamu
				</h2>
				<p class="mt-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-500">
					Berdasarkan tontonan, simpanan, like, dan rating kamu.
				</p>
			</div>
			<button
				type="button"
				onclick={() => {
					loaded = false;
					loadRecommendations().catch(() => null);
				}}
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
				aria-label="Refresh rekomendasi"
			>
				<AppIcon name="refresh" class="text-[17px]" />
			</button>
		</div>

		{#if loading && items.length === 0}
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
				{#each Array.from({ length: 6 }) as _}
					<div class="aspect-[2/3] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"></div>
				{/each}
			</div>
		{:else}
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
				{#each items as item, index}
					<div class="min-w-0">
						<AnimeCard
							id={item.id}
							slug={item.slug}
							title={item.title}
							thumbnail={item.thumbnail}
							genres={item.genres ?? []}
							status={item.status}
							type={item.type}
							totalEpisodes={item.totalEpisodes}
							episodeCount={item.episodeCount}
							rating={item.rating}
							aboveFold={index < 6}
						/>
						{#if item.reasons?.length}
							<p class="mt-1 line-clamp-1 text-[10px] font-bold text-violet-500">
								Karena {item.reasons.map((reason) => reason.label).slice(0, 2).join(', ')}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}
