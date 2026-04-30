<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { displayUserName } from '$lib/user-display';

	type Reporter  = { id: number; username: string; fullName?: string | null; avatar: string | null };
	type CommentUser = { id: number; username: string; fullName?: string | null };
	type ReportComment = { id: number; content: string | null; deletedAt: string | null; user: CommentUser };
	type Report = {
		id: number;
		reason: string;
		description: string | null;
		status: 'pending' | 'resolved' | 'dismissed';
		createdAt: string;
		reporter: Reporter;
		resolvedBy: CommentUser | null;
		comment: ReportComment;
	};
	type Counts = { pending: number; resolved: number; dismissed: number };

	let reports   = $state<Report[]>([]);
	let counts    = $state<Counts>({ pending: 0, resolved: 0, dismissed: 0 });
	let total     = $state(0);
	let page      = $state(1);
	let filter    = $state<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
	let loading   = $state(true);
	let resolving = $state<number | null>(null);

	const REASON_LABELS: Record<string, string> = {
		spam: 'Spam',
		harassment: 'Pelecehan',
		hate_speech: 'Ujaran Kebencian',
		misinformation: 'Misinformasi',
		inappropriate: 'Tidak Pantas',
		other: 'Lainnya'
	};

	async function load() {
		loading = true;
		try {
			const qs = new URLSearchParams({ page: String(page), limit: '20' });
			if (filter !== 'all') qs.set('status', filter);
			const res = await adminApi<{ reports: Report[]; total: number; counts: Counts }>(
				`/comment-reports?${qs}`
			);
			reports = res.data.reports;
			total   = res.data.total;
			counts  = res.data.counts;
		} catch {
			adminToast.error('Gagal memuat laporan');
		} finally {
			loading = false;
		}
	}

	async function resolve(id: number, status: 'resolved' | 'dismissed', deleteComment = false) {
		resolving = id;
		try {
			await adminApi(`/comment-reports/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status, deleteComment })
			});
			adminToast.success(status === 'resolved' ? 'Laporan diselesaikan' : 'Laporan diabaikan');
			await load();
		} catch {
			adminToast.error('Gagal mengupdate laporan');
		} finally {
			resolving = null;
		}
	}

	$effect(() => {
		page; filter;
		load();
	});

	function statusBadge(s: string) {
		if (s === 'pending')   return 'bg-yellow-500/15 text-yellow-400';
		if (s === 'resolved')  return 'bg-green-500/15 text-green-400';
		return 'bg-zinc-700 text-zinc-400';
	}

	function reasonBadge(r: string) {
		if (r === 'harassment' || r === 'hate_speech') return 'bg-red-500/15 text-red-400';
		if (r === 'spam') return 'bg-orange-500/15 text-orange-400';
		return 'bg-zinc-700/60 text-zinc-400';
	}

	const totalPages = $derived(Math.max(1, Math.ceil(total / 20)));
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-2xl font-black">Laporan Komentar</h2>
			<p class="text-sm text-zinc-500">Moderasi laporan dari pengguna.</p>
		</div>
		<button onclick={load} class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">
			Refresh
		</button>
	</div>

	<!-- Status tabs -->
	<div class="flex gap-2 flex-wrap">
		{#each ['all', 'pending', 'resolved', 'dismissed'] as tab}
			<button
				onclick={() => { filter = tab as typeof filter; page = 1; }}
				class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition
					{filter === tab ? 'bg-violet-600 text-white' : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'}"
			>
				{tab === 'all' ? 'Semua' : tab === 'pending' ? 'Menunggu' : tab === 'resolved' ? 'Selesai' : 'Diabaikan'}
				{#if tab !== 'all'}
					<span class="rounded-full bg-black/30 px-2 py-0.5 text-xs">
						{counts[tab as keyof Counts] ?? 0}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Table -->
	{#if loading}
		<div class="space-y-3">
			{#each Array(5) as _}
				<div class="h-24 animate-pulse rounded-xl bg-zinc-900"></div>
			{/each}
		</div>
	{:else if reports.length === 0}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
			<AppIcon name="check_circle" class="mb-2 block text-4xl" />
			Tidak ada laporan {filter !== 'all' ? `dengan status "${filter}"` : ''}.
		</div>
	{:else}
		<div class="space-y-3">
			{#each reports as report (report.id)}
				<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
					<!-- Top row -->
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="flex items-center gap-3 min-w-0">
							<img
								src={report.reporter.avatar ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayUserName(report.reporter))}`}
								alt={displayUserName(report.reporter)}
								class="h-8 w-8 rounded-full bg-zinc-800 shrink-0"
							/>
							<div class="min-w-0">
								<p class="text-sm font-bold">{displayUserName(report.reporter)}</p>
								<p class="text-xs text-zinc-500">{new Date(report.createdAt).toLocaleString('id-ID')}</p>
							</div>
						</div>
						<div class="flex items-center gap-2 flex-wrap">
							<span class="rounded-full px-2.5 py-0.5 text-xs font-bold {reasonBadge(report.reason)}">
								{REASON_LABELS[report.reason] ?? report.reason}
							</span>
							<span class="rounded-full px-2.5 py-0.5 text-xs font-bold {statusBadge(report.status)}">
								{report.status === 'pending' ? 'Menunggu' : report.status === 'resolved' ? 'Selesai' : 'Diabaikan'}
							</span>
						</div>
					</div>

					<!-- Reported comment -->
					<div class="rounded-lg bg-zinc-800/60 p-3 text-sm">
						<p class="mb-1 text-xs text-zinc-500">Komentar dari {displayUserName(report.comment.user)}:</p>
						{#if report.comment.deletedAt}
							<p class="italic text-zinc-500">[Komentar sudah dihapus]</p>
						{:else}
							<p class="text-zinc-200 line-clamp-3">{report.comment.content ?? '—'}</p>
						{/if}
					</div>

					{#if report.description}
						<p class="text-sm text-zinc-400"><span class="font-bold">Keterangan:</span> {report.description}</p>
					{/if}

					{#if report.resolvedBy}
						<p class="text-xs text-zinc-500">Diselesaikan oleh {displayUserName(report.resolvedBy)}</p>
					{/if}

					<!-- Actions -->
					{#if report.status === 'pending' && !report.comment.deletedAt}
						<div class="flex flex-wrap gap-2 pt-1">
							<button
								disabled={resolving === report.id}
								onclick={() => resolve(report.id, 'resolved', true)}
								class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
							>
								{resolving === report.id ? '...' : 'Hapus Komentar & Selesaikan'}
							</button>
							<button
								disabled={resolving === report.id}
								onclick={() => resolve(report.id, 'resolved', false)}
								class="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
							>
								Selesaikan (tanpa hapus)
							</button>
							<button
								disabled={resolving === report.id}
								onclick={() => resolve(report.id, 'dismissed')}
								class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
							>
								Abaikan
							</button>
						</div>
					{:else if report.status === 'pending' && report.comment.deletedAt}
						<div class="flex gap-2">
							<button
								disabled={resolving === report.id}
								onclick={() => resolve(report.id, 'resolved', false)}
								class="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
							>
								Selesaikan
							</button>
							<button
								disabled={resolving === report.id}
								onclick={() => resolve(report.id, 'dismissed')}
								class="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
							>
								Abaikan
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination -->
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
