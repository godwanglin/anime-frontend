<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/admin/api';

	type EpisodeJobItem = {
		id: string;
		animeTitle: string;
		animeSlug: string;
		episode: string;
		episodeNumber: number;
		scheduledAt: string;
		releaseTime: string;
		sourceUrl: string;
		scheduleStatus: 'upcoming' | 'released';
		jobStatus:
			| 'waiting'
			| 'pending'
			| 'retrying'
			| 'running'
			| 'completed'
			| 'exhausted'
			| 'failed';
		attempts: number;
		maxAttempts: number;
		nextRunAt: string | null;
		completedAt: string | null;
		hasEpisode: boolean;
	};

	type ManagedJob = {
		id: string;
		name: string;
		category: string;
		description: string;
		intervalLabel: string;
		desiredState: 'active' | 'stopped';
		runtime: {
			running?: boolean;
			executing?: boolean;
			lastRunAt?: string | Date | null;
			lastError?: string | null;
			totalRuns?: number;
			totalCycles?: number;
			totalItemsCompleted?: number;
			totalSent?: number;
		};
		meta?: {
			lastManualRunAt?: string;
			lastManualStatus?: string;
			lastAction?: string;
		};
		items?: EpisodeJobItem[];
	};

	let jobs = $state<ManagedJob[]>([]);
	let jobCategories = $state<string[]>([]);
	let activeJobCategory = $state('all');
	let jobsLoading = $state(false);
	let jobActionId = $state('');
	let jobsMessage = $state('Memuat daftar job...');

	const visibleEpisodeItems = $derived(
		jobs.reduce((total, job) => total + (job.items?.length ?? 0), 0)
	);
	const activeJobs = $derived(
		jobs.filter((job) => job.desiredState === 'active' || job.runtime.running).length
	);
	const runningJobs = $derived(jobs.filter((job) => job.runtime.executing).length);

	function jobCategoryLabel(category: string) {
		const labels: Record<string, string> = {
			episode: 'Episode Job',
			reminder: 'Reminder Job',
			maintenance: 'Maintenance',
			support: 'Support Job'
		};
		return labels[category] ?? category.replaceAll('_', ' ');
	}

	function jobStatus(job: ManagedJob) {
		if (job.runtime.executing) return 'running';
		if (job.desiredState !== 'active') return job.desiredState;
		return job.runtime.running ? 'active' : 'idle';
	}

	function jobRunCount(job: ManagedJob) {
		return job.runtime.totalRuns ?? job.runtime.totalCycles ?? 0;
	}

	function itemStatusClass(status: EpisodeJobItem['jobStatus']) {
		if (status === 'running') return 'bg-amber-500/15 text-amber-200';
		if (status === 'completed') return 'bg-emerald-500/15 text-emerald-300';
		if (status === 'retrying') return 'bg-sky-500/15 text-sky-300';
		if (status === 'failed' || status === 'exhausted') return 'bg-rose-500/15 text-rose-300';
		if (status === 'pending') return 'bg-violet-500/15 text-violet-200';
		return 'bg-zinc-700/70 text-zinc-300';
	}

	function lastJobRun(job: ManagedJob) {
		return job.runtime.lastRunAt ?? job.meta?.lastManualRunAt ?? null;
	}

	function canPlayJob(job: ManagedJob) {
		return job.desiredState === 'stopped' && !job.runtime.running && !job.runtime.executing;
	}

	function canStopJob(job: ManagedJob) {
		return job.desiredState === 'active' || Boolean(job.runtime.running || job.runtime.executing);
	}

	function formatDateTime(value?: string | Date | null) {
		if (!value) return '-';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	async function loadJobs() {
		jobsLoading = true;
		try {
			const path =
				activeJobCategory === 'all'
					? '/jobs'
					: `/jobs?category=${encodeURIComponent(activeJobCategory)}`;
			const response = await adminApi<{ categories: string[]; jobs: ManagedJob[] }>(path);
			jobs = response.data.jobs;
			jobCategories = response.data.categories;
			jobsMessage = jobs.length ? `${jobs.length} job terpantau.` : 'Belum ada job terdaftar.';
		} catch (error) {
			jobsMessage = error instanceof Error ? error.message : 'Gagal memuat job.';
		} finally {
			jobsLoading = false;
		}
	}

	async function controlJob(job: ManagedJob, action: 'run-now' | 'play' | 'stop') {
		if (jobActionId) return;
		jobActionId = `${job.id}:${action}`;
		try {
			await adminApi(`/jobs/${job.id}/actions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});
			jobsMessage =
				action === 'run-now'
					? `${job.name} dijalankan manual.`
					: `${job.name} ${action === 'play' ? 'diaktifkan' : 'distop'}.`;
			await loadJobs();
		} catch (error) {
			jobsMessage = error instanceof Error ? error.message : 'Gagal kontrol job.';
		} finally {
			jobActionId = '';
		}
	}

	async function controlEpisodeJob(job: ManagedJob, item: EpisodeJobItem) {
		if (jobActionId) return;
		jobActionId = `${job.id}:${item.id}:run-now`;
		try {
			await adminApi(`/jobs/${job.id}/items/${encodeURIComponent(item.id)}/actions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'run-now' })
			});
			jobsMessage = `${item.animeTitle} ${item.episode} dijalankan manual.`;
			await loadJobs();
		} catch (error) {
			jobsMessage = error instanceof Error ? error.message : 'Gagal menjalankan item job.';
		} finally {
			jobActionId = '';
		}
	}

	onMount(loadJobs);
</script>

<div class="space-y-5">
	<section class="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">
					Job Control
				</p>
				<h2 class="mt-2 text-2xl font-black text-zinc-50">Background Jobs</h2>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
					Pantau scheduler utama dan target episode real dari jadwal rilis. Run manual per target
					tidak perlu menunggu interval scheduler berikutnya.
				</p>
			</div>
			<div class="grid grid-cols-3 gap-3 text-center">
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-xl font-black text-zinc-100">{jobs.length}</p>
					<p class="mt-1 text-[11px] font-bold uppercase text-zinc-500">Job</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-xl font-black text-emerald-300">{activeJobs}</p>
					<p class="mt-1 text-[11px] font-bold uppercase text-zinc-500">Aktif</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-xl font-black text-violet-300">{visibleEpisodeItems}</p>
					<p class="mt-1 text-[11px] font-bold uppercase text-zinc-500">Target</p>
				</div>
			</div>
		</div>
	</section>

	<section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
				<div class="flex flex-wrap items-center gap-2">
					<button
						onclick={() => {
							activeJobCategory = 'all';
							loadJobs();
						}}
						class="rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide transition {activeJobCategory === 'all'
							? 'border-violet-500 bg-violet-500/15 text-violet-200'
							: 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'}"
					>
						Semua
					</button>
					{#each jobCategories as category}
						<button
							onclick={() => {
								activeJobCategory = category;
								loadJobs();
							}}
							class="rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide transition {activeJobCategory === category
								? 'border-violet-500 bg-violet-500/15 text-violet-200'
								: 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-800'}"
						>
							{jobCategoryLabel(category)}
						</button>
					{/each}
				</div>
				<div class="flex items-center gap-3">
					<p class="text-xs font-semibold text-zinc-500">
						{runningJobs ? `${runningJobs} sedang jalan` : jobsMessage}
					</p>
					<button
						onclick={loadJobs}
						disabled={jobsLoading}
						class="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
					>
						Refresh
					</button>
				</div>
			</div>

			<div class="overflow-x-auto rounded-2xl border border-zinc-800">
				<table class="min-w-full text-left text-xs text-zinc-200">
					<thead class="bg-zinc-950 text-zinc-500">
						<tr>
							<th class="px-3 py-3">Job</th>
							<th class="px-3 py-3">Kategori</th>
							<th class="px-3 py-3">Status</th>
							<th class="px-3 py-3">Jadwal</th>
							<th class="px-3 py-3">Run</th>
							<th class="px-3 py-3">Terakhir</th>
							<th class="px-3 py-3 text-right">Kontrol</th>
						</tr>
					</thead>
					<tbody>
						{#each jobs as job}
							<tr class="border-t border-zinc-800">
								<td class="px-3 py-3">
									<div class="font-black text-zinc-100">{job.name}</div>
									<div class="mt-1 max-w-[24rem] text-[11px] leading-5 text-zinc-500">
										{job.description}
									</div>
									{#if job.items?.length}
										<div class="mt-2 text-[11px] font-bold text-violet-300">
											{job.items.length} target episode real
										</div>
									{/if}
									{#if job.runtime.lastError}
										<div class="mt-1 text-[11px] text-rose-300">{job.runtime.lastError}</div>
									{/if}
								</td>
								<td class="px-3 py-3">
									<span class="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 font-bold text-zinc-300">
										{jobCategoryLabel(job.category)}
									</span>
								</td>
								<td class="px-3 py-3">
									<span
										class="rounded-full px-2 py-1 font-black uppercase tracking-wide {jobStatus(job) === 'running'
											? 'bg-amber-500/15 text-amber-200'
											: jobStatus(job) === 'active'
												? 'bg-emerald-500/15 text-emerald-300'
												: 'bg-zinc-700/70 text-zinc-300'}"
									>
										{jobStatus(job)}
									</span>
								</td>
								<td class="px-3 py-3 text-zinc-400">{job.intervalLabel}</td>
								<td class="px-3 py-3 text-zinc-300">{jobRunCount(job)}</td>
								<td class="px-3 py-3 text-zinc-400">{formatDateTime(lastJobRun(job))}</td>
								<td class="px-3 py-3">
									<div class="flex justify-end gap-2">
										<button
											onclick={() => controlJob(job, 'run-now')}
											disabled={Boolean(jobActionId)}
											class="rounded-lg bg-violet-600 px-3 py-2 font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
										>
											Run
										</button>
										<button
											onclick={() => controlJob(job, 'play')}
											disabled={Boolean(jobActionId) || !canPlayJob(job)}
											class="rounded-lg border border-emerald-700/70 px-3 py-2 font-bold text-emerald-300 transition hover:bg-emerald-950/30 disabled:opacity-50"
										>
											Play
										</button>
										<button
											onclick={() => controlJob(job, 'stop')}
											disabled={Boolean(jobActionId) || !canStopJob(job)}
											class="rounded-lg border border-rose-900/70 px-3 py-2 font-bold text-rose-300 transition hover:bg-rose-950/30 disabled:opacity-50"
										>
											Stop
										</button>
									</div>
								</td>
							</tr>
							{#each job.items ?? [] as item}
								<tr class="border-t border-zinc-900 bg-zinc-950/45">
									<td class="px-3 py-3 pl-8">
										<div class="font-black text-zinc-100">{item.animeTitle}</div>
										<div class="mt-1 text-[11px] text-zinc-500">
											{item.animeSlug} · {item.sourceUrl}
										</div>
									</td>
									<td class="px-3 py-3">
										<span class="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-bold text-violet-200">
											{item.episode}
										</span>
									</td>
									<td class="px-3 py-3">
										<span class="rounded-full px-2 py-1 font-black uppercase tracking-wide {itemStatusClass(item.jobStatus)}">
											{item.jobStatus}
										</span>
										{#if item.hasEpisode}
											<div class="mt-1 text-[11px] text-emerald-300">episode sudah ada</div>
										{/if}
									</td>
									<td class="px-3 py-3 text-zinc-400">
										<div>{formatDateTime(item.scheduledAt)}</div>
										<div class="mt-1 text-[11px] text-zinc-600">Estimasi {item.releaseTime}</div>
									</td>
									<td class="px-3 py-3 text-zinc-300">{item.attempts}/{item.maxAttempts}</td>
									<td class="px-3 py-3 text-zinc-400">
										{#if item.completedAt}
											{formatDateTime(item.completedAt)}
										{:else if item.nextRunAt}
											Retry {formatDateTime(item.nextRunAt)}
										{:else}
											-
										{/if}
									</td>
									<td class="px-3 py-3">
										<div class="flex justify-end">
											<button
												onclick={() => controlEpisodeJob(job, item)}
												disabled={Boolean(jobActionId) || item.jobStatus === 'running' || item.jobStatus === 'completed'}
												class="rounded-lg border border-violet-700/70 px-3 py-2 font-bold text-violet-200 transition hover:bg-violet-950/40 disabled:opacity-50"
											>
												Run
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="7" class="px-3 py-6 text-center text-zinc-500">
									{jobsMessage}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
</div>
