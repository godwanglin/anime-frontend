<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import { adminApi } from '$lib/admin/api';
	import AdminStatsCard from '$lib/components/admin/AdminStatsCard.svelte';
	import { imageUrl } from '$lib/image-url';
	import { displayUserName } from '$lib/user-display';

	type Stats = {
		totalAnime: number;
		totalEpisodes: number;
		totalUsers: number;
		totalComments: number;
		totalWatchHistory: number;
		newUsersToday: number;
		newUsersThisWeek: number;
		activeUsersToday: number;
		topAnime: { title: string; slug: string; thumbnail: string | null; viewCount: number }[];
		recentComments: { content: string | null; username: string; fullName?: string | null; animeTitle: string; createdAt: string }[];
		recentUsers: { username: string; fullName?: string | null; email: string; createdAt: string }[];
		watchHistoryByDay: { date: string; count: number }[];
	};

	let stats = $state<Stats | null>(null);
	let isLoading = $state(true);
	let canvas = $state<HTMLCanvasElement>();
	let chart: Chart | null = null;

	function format(value?: number) {
		return Number(value ?? 0).toLocaleString('id-ID');
	}

	async function loadStats() {
		isLoading = true;
		try {
			stats = (await adminApi<Stats>('/stats')).data;
			queueMicrotask(renderChart);
		} finally {
			isLoading = false;
		}
	}

	function renderChart() {
		if (!canvas || !stats) return;
		chart?.destroy();
		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: stats.watchHistoryByDay.map((item) => item.date.slice(5)),
				datasets: [
					{
						label: 'Tontonan',
						data: stats.watchHistoryByDay.map((item) => item.count),
						backgroundColor: '#7c3aed',
						borderRadius: 8
					}
				]
			},
			options: {
				responsive: true,
				plugins: { legend: { display: false } },
				scales: {
					x: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } },
					y: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } }
				}
			}
		});
	}

	onMount(() => {
		loadStats();
		return () => chart?.destroy();
	});
</script>

{#if isLoading}
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		{#each Array(4) as _}
			<div class="h-32 animate-pulse rounded-xl bg-zinc-900"></div>
		{/each}
	</div>
{:else if stats}
	<div class="space-y-6">
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<AdminStatsCard label="Total Anime" value={format(stats.totalAnime)} sub={`${format(stats.totalWatchHistory)} tontonan`} icon="movie" />
			<AdminStatsCard label="Total Eps" value={format(stats.totalEpisodes)} sub="Episode tersedia" icon="video_library" />
			<AdminStatsCard label="Total User" value={format(stats.totalUsers)} sub={`+${format(stats.newUsersToday)} hari ini`} icon="group" />
			<AdminStatsCard label="Komentar" value={format(stats.totalComments)} sub={`${format(stats.activeUsersToday)} aktif hari ini`} icon="forum" />
		</div>

		<div class="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h2 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-400">Tontonan 7 Hari Terakhir</h2>
				<canvas bind:this={canvas} height="120"></canvas>
			</section>
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h2 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-400">Top 5 Anime</h2>
				<div class="space-y-3">
					{#each stats.topAnime as anime, i}
						<a href="/anime/{anime.slug}" class="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800">
							<span class="w-6 text-center text-sm font-black text-violet-400">{i + 1}</span>
							<img src={anime.thumbnail ? imageUrl(anime.thumbnail) : '/icon.png'} alt={anime.title} class="h-10 w-10 rounded-lg object-cover" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-bold text-zinc-100">{anime.title}</p>
								<p class="text-xs text-zinc-500">{format(anime.viewCount)} histori</p>
							</div>
						</a>
					{/each}
				</div>
			</section>
		</div>

		<div class="grid gap-4 xl:grid-cols-2">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h2 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-400">Komentar Terbaru</h2>
				<div class="space-y-3">
					{#each stats.recentComments as comment}
						<div class="rounded-lg bg-zinc-800/50 p-3">
							<p class="line-clamp-2 text-sm text-zinc-200">{comment.content}</p>
							<p class="mt-1 text-xs text-zinc-500">{displayUserName(comment)} - {comment.animeTitle}</p>
						</div>
					{/each}
				</div>
			</section>
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h2 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-400">User Terbaru</h2>
				<div class="space-y-3">
					{#each stats.recentUsers as user}
						<div class="flex items-center justify-between rounded-lg bg-zinc-800/50 p-3">
							<div>
								<p class="text-sm font-bold text-zinc-100">{displayUserName(user)}</p>
								<p class="text-xs text-zinc-500">{user.email}</p>
							</div>
							<p class="text-xs text-zinc-500">{new Date(user.createdAt).toLocaleDateString('id-ID')}</p>
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
{/if}
