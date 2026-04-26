<script lang="ts">
	import { goto } from '$app/navigation';
	import config from '$lib/config';

	type SearchResult = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		genre: string[];
		status: 'Ongoing' | 'Completed';
	};

	type Props = {
		query: string;
		onClose: () => void;
	};

	const { query, onClose }: Props = $props();

	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSearch(q: string) {
		if (!q.trim()) {
			results = [];
			return;
		}
		loading = true;
		try {
			const res = await fetch(
				`${config.API_BASE_URL}/api/anime/search?q=${encodeURIComponent(q)}&limit=6`
			);
			const data = await res.json();
			results = data.data ?? [];
		} catch {
			results = [];
		} finally {
			loading = false;
		}
	}

	// Re-fetch setiap kali query berubah dari parent
	$effect(() => {
		clearTimeout(debounceTimer);
		if (!query.trim()) {
			results = [];
			return;
		}
		debounceTimer = setTimeout(() => fetchSearch(query), 350);
	});
</script>

<div
	class="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
>
	{#if loading}
		<!-- Skeleton -->
		<div class="py-2 px-3 flex flex-col gap-2">
			{#each [1, 2, 3] as _}
				<div class="flex items-center gap-3 py-1">
					<div
						class="w-9 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse shrink-0"
					></div>
					<div class="flex-1 flex flex-col gap-1.5">
						<div class="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse w-3/4"></div>
						<div class="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse w-1/3"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if results.length > 0}
		<!-- Results -->
		<div class="py-1.5">
			{#each results as item}
				<a
					href="/anime/{item.slug}"
					onclick={onClose}
					class="flex items-center gap-3 px-3 py-2 hover:bg-violet-50 dark:hover:bg-zinc-800 transition group"
				>
					<img
						src={item.thumbnail}
						alt={item.title}
						class="w-9 h-12 object-cover rounded-lg shrink-0"
						loading="lazy"
						data-sync-asset-context="anime"
						data-sync-asset-id={String(item.id)}
						data-sync-asset-field="thumbnail"
					/>
					<div class="flex-1 min-w-0">
						<p
							class="text-sm font-semibold text-zinc-800 dark:text-zinc-100 line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition"
						>
							{item.title}
						</p>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="text-[10px] text-zinc-500">{item.genre[0]}</span>
							<span class="text-zinc-300 dark:text-zinc-600 text-[10px]">·</span>
							<span
								class="text-[10px] {item.status === 'Ongoing'
									? 'text-emerald-500'
									: 'text-zinc-400'}"
							>
								{item.status === 'Ongoing' ? 'Tayang' : 'Tamat'}
							</span>
						</div>
					</div>
					<span
						class="material-symbols-rounded text-[16px] text-zinc-300 dark:text-zinc-600 group-hover:text-violet-400 transition"
					>
						chevron_right
					</span>
				</a>
			{/each}
		</div>

		<!-- Lihat semua -->
		<div class="border-t border-zinc-100 dark:border-zinc-800 p-2">
			<a
				href="/search?q={encodeURIComponent(query)}"
				onclick={onClose}
				class="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-zinc-800 transition"
			>
				<span class="material-symbols-rounded text-[16px]">search</span>
				Lihat semua hasil untuk "{query}"
			</a>
		</div>
	{:else}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center py-8 gap-2 text-zinc-400">
			<span class="material-symbols-rounded text-[40px]">search_off</span>
			<p class="text-sm">
				Tidak ada hasil untuk "<span class="font-semibold text-zinc-500 dark:text-zinc-300"
					>{query}</span
				>"
			</p>
		</div>
	{/if}
</div>
