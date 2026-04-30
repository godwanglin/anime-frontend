<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { displayUserName } from '$lib/user-display';

	type UserLite = { id: number; username: string; fullName?: string | null; avatar?: string | null };
	type EpisodeReport = {
		id: number;
		reason: string;
		description: string | null;
		contact: string | null;
		pageUrl: string | null;
		serverLabel: string | null;
		status: 'pending' | 'resolved' | 'dismissed';
		createdAt: string;
		reporter: UserLite | null;
		resolvedBy: UserLite | null;
		episode: {
			id: number;
			slug: string;
			number: number;
			title: string;
			thumbnail: string | null;
			status: string;
			anime: { id: number; slug: string; title: string; thumbnail: string | null };
			servers: { id: number; label: string; isPrimary: boolean }[];
		};
	};
	type Counts = { pending: number; resolved: number; dismissed: number };

	const REASON_LABELS: Record<string, string> = {
		video_unavailable: 'Video tidak tersedia',
		playback_error: 'Playback error',
		wrong_episode: 'Episode salah',
		audio_problem: 'Audio bermasalah',
		subtitle_problem: 'Subtitle bermasalah',
		slow_loading: 'Loading lambat',
		other: 'Lainnya'
	};

	let reports = $state<EpisodeReport[]>([]);
	let counts = $state<Counts>({ pending: 0, resolved: 0, dismissed: 0 });
	let total = $state(0);
	let page = $state(1);
	let filter = $state<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
	let loading = $state(true);
	let resolving = $state<number | null>(null);

	const totalPages = $derived(Math.max(1, Math.ceil(total / 20)));

	async function load() {
		loading = true;
		try {
			const qs = new URLSearchParams({ page: String(page), limit: '20' });
			if (filter !== 'all') qs.set('status', filter);
			const res = await adminApi<{ reports: EpisodeReport[]; total: number; counts: Counts }>(
				`/episode-reports?${qs}`
			);
			reports = res.data.reports;
			total = res.data.total;
			counts = res.data.counts;
		} catch {
			adminToast.error('Gagal memuat laporan episode');
		} finally {
			loading = false;
		}
	}

	async function resolveReport(id: number, status: 'resolved' | 'dismissed') {
		resolving = id;
		try {
			await adminApi(`/episode-reports/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status })
			});
			adminToast.success(status === 'resolved' ? 'Laporan diselesaikan' : 'Laporan diabaikan');
			await load();
		} catch {
			adminToast.error('Gagal mengupdate laporan');
		} finally {
			resolving = null;
		}
	}

	function statusBadge(status: string) {
		if (status === 'pending') return 'bg-yellow-500/15 text-yellow-400';
		if (status === 'resolved') return 'bg-green-500/15 text-green-400';
		return 'bg-zinc-700 text-zinc-400';
	}

	function reasonBadge(reason: string) {
		if (reason === 'video_unavailable' || reason === 'playback_error') return 'bg-red-500/15 text-red-400';
		if (reason === 'wrong_episode') return 'bg-orange-500/15 text-orange-400';
		if (reason === 'subtitle_problem') return 'bg-sky-500/15 text-sky-400';
		return 'bg-zinc-700/60 text-zinc-400';
	}

	$effect(() => {
		page;
		filter;
		load();
	});
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-2xl font-black">Episode Reports</h2>
			<p class="text-sm text-zinc-500">Queue laporan video, audio, subtitle, dan episode salah.</p>
		</div>
		<button onclick={load} class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">
			Refresh
		</button>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each ['all', 'pending', 'resolved', 'dismissed'] as tab}
			<button
				onclick={() => {
					filter = tab as typeof filter;
					page = 1;
				}}
				class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition
					{filter === tab ? 'bg-violet-600 text-white' : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'}"
			>
				{tab === 'all' ? 'Semua' : tab === 'pending' ? 'Menunggu' : tab === 'resolved' ? 'Selesai' : 'Diabaikan'}
				{#if tab !== 'all'}
					<span class="rounded-full bg-black/30 px-2 py-0.5 text-xs">{counts[tab as keyof Counts] ?? 0}</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="space-y-3">
			{#each Array(5) as _}
				<div class="h-32 animate-pulse rounded-xl bg-zinc-900"></div>
			{/each}
		</div>
	{:else if reports.length === 0}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
			<AppIcon name="check_circle" class="mb-2 block text-4xl" />
			Tidak ada laporan episode {filter !== 'all' ? `dengan status "${filter}"` : ''}.
		</div>
	{:else}
		<div class="space-y-3">
			{#each reports as report (report.id)}
				<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div class="flex min-w-0 gap-3">
							<img
								src={report.episode.thumbnail ?? report.episode.anime.thumbnail ?? '/icon.png'}
								alt={report.episode.anime.title}
								class="h-20 w-14 shrink-0 rounded-lg object-cover bg-zinc-800"
							/>
							<div class="min-w-0">
								<a
									href="/anime/{report.episode.anime.slug}/{report.episode.slug}"
									target="_blank"
									class="line-clamp-1 text-sm font-black text-zinc-100 hover:text-violet-300"
								>
									{report.episode.anime.title} Ep {report.episode.number}
								</a>
								<p class="mt-1 line-clamp-2 text-xs text-zinc-500">{report.episode.title}</p>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									<span class="rounded-full px-2.5 py-0.5 text-xs font-bold {reasonBadge(report.reason)}">
										{REASON_LABELS[report.reason] ?? report.reason}
									</span>
									<span class="rounded-full px-2.5 py-0.5 text-xs font-bold {statusBadge(report.status)}">
										{report.status === 'pending' ? 'Menunggu' : report.status === 'resolved' ? 'Selesai' : 'Diabaikan'}
									</span>
									<span class="text-xs text-zinc-500">{new Date(report.createdAt).toLocaleString('id-ID')}</span>
								</div>
							</div>
						</div>

						{#if report.status === 'pending'}
							<div class="flex shrink-0 flex-wrap gap-2">
								<button
									disabled={resolving === report.id}
									onclick={() => resolveReport(report.id, 'resolved')}
									class="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
								>
									{resolving === report.id ? '...' : 'Selesaikan'}
								</button>
								<button
									disabled={resolving === report.id}
									onclick={() => resolveReport(report.id, 'dismissed')}
									class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
								>
									Abaikan
								</button>
							</div>
						{/if}
					</div>

					<div class="mt-4 grid gap-3 text-sm md:grid-cols-2">
						<div class="rounded-lg bg-zinc-800/60 p-3">
							<p class="mb-1 text-xs font-bold text-zinc-500">Pelapor</p>
							<p class="text-zinc-200">
								{report.reporter ? displayUserName(report.reporter) : 'Anonymous'}
								{report.contact ? ` - ${report.contact}` : ''}
							</p>
						</div>
						<div class="rounded-lg bg-zinc-800/60 p-3">
							<p class="mb-1 text-xs font-bold text-zinc-500">Server</p>
							<p class="text-zinc-200">{report.serverLabel ?? report.episode.servers[0]?.label ?? '-'}</p>
						</div>
					</div>

					{#if report.description}
						<p class="mt-3 text-sm text-zinc-400"><span class="font-bold text-zinc-300">Detail:</span> {report.description}</p>
					{/if}
					{#if report.pageUrl}
						<a href={report.pageUrl} target="_blank" class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200">
							<AppIcon name="open_in_new" class="text-[14px]" />
							Buka URL laporan
						</a>
					{/if}
					{#if report.resolvedBy}
						<p class="mt-2 text-xs text-zinc-500">Diselesaikan oleh {displayUserName(report.resolvedBy)}</p>
					{/if}
				</div>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<button
					disabled={page === 1}
					onclick={() => page--}
					class="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
				>
					←
				</button>
				<span class="text-sm text-zinc-400">{page} / {totalPages}</span>
				<button
					disabled={page === totalPages}
					onclick={() => page++}
					class="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
				>
					→
				</button>
			</div>
		{/if}
	{/if}
</div>
