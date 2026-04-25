<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart } from 'chart.js/auto';
	import { adminApi } from '$lib/admin/api';
	import AdminStatsCard from '$lib/components/admin/AdminStatsCard.svelte';

	type Stats = {
		totalWatchHistory: number;
		watchHistoryByDay: { date: string; count: number }[];
		topAnime: { title: string; viewCount: number }[];
	};
	type Reactions = {
		topLiked: { episodeTitle: string; animeTitle: string; likeCount: number }[];
		topDisliked: { episodeTitle: string; animeTitle: string; dislikeCount: number }[];
		totalLikes: number;
		totalDislikes: number;
	};
	type NotifStats = {
		totalSent: number;
		totalRead: number;
		readRate: number;
		sentByDay: { date: string; sent: number; read: number }[];
		totalReviews: number;
		avgRating: number | null;
	};

	let stats = $state<Stats | null>(null);
	let reactions = $state<Reactions | null>(null);
	let notifStats = $state<NotifStats | null>(null);
	let lineCanvas = $state<HTMLCanvasElement>();
	let barCanvas = $state<HTMLCanvasElement>();
	let notifCanvas = $state<HTMLCanvasElement>();
	let lineChart: Chart | null = null;
	let barChart: Chart | null = null;
	let notifChart: Chart | null = null;

	function format(value?: number | null) {
		return Number(value ?? 0).toLocaleString('id-ID');
	}

	async function load() {
		[stats, reactions, notifStats] = await Promise.all([
			adminApi<Stats>('/stats').then((r) => r.data),
			adminApi<Reactions>('/reactions/stats').then((r) => r.data),
			adminApi<NotifStats>('/notification-stats').then((r) => r.data)
		]);
		queueMicrotask(renderCharts);
	}

	function renderCharts() {
		if (!stats || !lineCanvas || !barCanvas) return;
		lineChart?.destroy();
		barChart?.destroy();
		lineChart = new Chart(lineCanvas, {
			type: 'line',
			data: {
				labels: stats.watchHistoryByDay.map((item) => item.date.slice(5)),
				datasets: [{ label: 'Tontonan', data: stats.watchHistoryByDay.map((item) => item.count), borderColor: '#8b5cf6', backgroundColor: '#7c3aed33', tension: 0.35, fill: true }]
			},
			options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#a1a1aa' } }, y: { ticks: { color: '#a1a1aa' } } } }
		});
		barChart = new Chart(barCanvas, {
			type: 'bar',
			data: {
				labels: stats.topAnime.map((item) => item.title.slice(0, 18)),
				datasets: [{ label: 'Top Anime', data: stats.topAnime.map((item) => item.viewCount), backgroundColor: '#7c3aed', borderRadius: 8 }]
			},
			options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#a1a1aa' } }, y: { ticks: { color: '#a1a1aa' } } } }
		});

		if (notifStats && notifCanvas) {
			notifChart?.destroy();
			notifChart = new Chart(notifCanvas, {
				type: 'bar',
				data: {
					labels: notifStats.sentByDay.map((d) => d.date.slice(5)),
					datasets: [
						{ label: 'Terkirim', data: notifStats.sentByDay.map((d) => d.sent), backgroundColor: '#7c3aed', borderRadius: 6 },
						{ label: 'Dibaca', data: notifStats.sentByDay.map((d) => d.read), backgroundColor: '#22c55e', borderRadius: 6 }
					]
				},
				options: { plugins: { legend: { labels: { color: '#a1a1aa' } } }, scales: { x: { ticks: { color: '#a1a1aa' } }, y: { ticks: { color: '#a1a1aa' } } } }
			});
		}
	}

	onMount(() => {
		load();
		return () => { lineChart?.destroy(); barChart?.destroy(); notifChart?.destroy(); };
	});
</script>

{#if stats && reactions && notifStats}
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div><h2 class="text-2xl font-black">Analytics</h2><p class="text-sm text-zinc-500">Statistik tontonan, notifikasi, dan ulasan.</p></div>
			<button onclick={load} class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">Refresh</button>
		</div>

		<!-- Tontonan & Reaksi -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<AdminStatsCard label="Total Tayang" value={format(stats.totalWatchHistory)} icon="visibility" />
			<AdminStatsCard label="Total Like" value={format(reactions.totalLikes)} icon="thumb_up" />
			<AdminStatsCard label="Total Dislike" value={format(reactions.totalDislikes)} icon="thumb_down" />
			<AdminStatsCard label="Rata/Hari" value={format(Math.round(stats.totalWatchHistory / 7))} icon="timeline" />
		</div>

		<!-- Notifikasi & Ulasan -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<AdminStatsCard label="Notif Terkirim" value={format(notifStats.totalSent)} icon="campaign" />
			<AdminStatsCard label="Notif Dibaca" value={format(notifStats.totalRead)} icon="mark_email_read" />
			<AdminStatsCard label="Read Rate" value="{notifStats.readRate}%" icon="percent" />
			<AdminStatsCard label="Total Ulasan" value={format(notifStats.totalReviews)} icon="star" />
		</div>

		<!-- Charts baris 1 -->
		<div class="grid gap-4 xl:grid-cols-2">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h3 class="mb-4 font-black">Tontonan per Hari</h3><canvas bind:this={lineCanvas}></canvas></section>
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5"><h3 class="mb-4 font-black">Top 10 Anime</h3><canvas bind:this={barCanvas}></canvas></section>
		</div>

		<!-- Chart notifikasi -->
		<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="font-black">Notifikasi 7 Hari Terakhir</h3>
				{#if notifStats.avgRating}
					<span class="flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-400">
						<span class="material-symbols-rounded text-base">star</span>
						Avg Rating: {notifStats.avgRating}/10
					</span>
				{/if}
			</div>
			<canvas bind:this={notifCanvas}></canvas>
		</section>

		<!-- Episode reactions -->
		<div class="grid gap-4 xl:grid-cols-2">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="mb-4 font-black">Episode Paling Disukai</h3>
				{#each reactions.topLiked as item}
					<div class="flex justify-between border-b border-zinc-800 py-2 text-sm"><span class="truncate pr-4">{item.animeTitle} — {item.episodeTitle}</span><b class="shrink-0">{format(item.likeCount)}</b></div>
				{/each}
			</section>
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="mb-4 font-black">Episode Paling Tidak Disukai</h3>
				{#each reactions.topDisliked as item}
					<div class="flex justify-between border-b border-zinc-800 py-2 text-sm"><span class="truncate pr-4">{item.animeTitle} — {item.episodeTitle}</span><b class="shrink-0">{format(item.dislikeCount)}</b></div>
				{/each}
			</section>
		</div>
	</div>
{:else}
	<div class="space-y-4">
		<div class="h-24 animate-pulse rounded-xl bg-zinc-900"></div>
		<div class="h-24 animate-pulse rounded-xl bg-zinc-900"></div>
		<div class="h-64 animate-pulse rounded-xl bg-zinc-900"></div>
	</div>
{/if}
