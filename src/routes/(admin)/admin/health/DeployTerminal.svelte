<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { onDestroy } from 'svelte';

	type DeployTarget = 'backend' | 'frontend' | 'go-proxy';
	type DeployJob = {
		id: string;
		target: DeployTarget;
		status: 'running' | 'success' | 'failed';
		exitCode?: number | null;
		startedAt: string;
		finishedAt?: string | null;
		log?: string;
	};

	let { target, jobId }: { target: DeployTarget; jobId?: string } = $props();
	let job = $state<DeployJob | null>(null);
	let loading = $state(false);
	let error = $state('');
	let timer: ReturnType<typeof setInterval> | null = null;
	let loadedKey = '';

	function targetLabel(value: DeployTarget) {
		if (value === 'go-proxy') return 'Go Proxy';
		return value === 'backend' ? 'Backend' : 'Frontend';
	}

	function stopPolling() {
		if (!timer) return;
		clearInterval(timer);
		timer = null;
	}

	async function loadJob(id = jobId) {
		if (!id) return;
		loading = true;
		error = '';
		try {
			const response = await adminApi<DeployJob>(`/health/deploy/${id}`);
			job = response.data;
			if (job.status !== 'running') stopPolling();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat deploy log';
			stopPolling();
		} finally {
			loading = false;
		}
	}

	async function loadLatest() {
		loading = true;
		error = '';
		try {
			const response = await adminApi<DeployJob | null>(`/health/deploy/latest?target=${target}`);
			job = response.data;
			if (job?.status === 'running') startPolling(job.id);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat deploy log terakhir';
		} finally {
			loading = false;
		}
	}

	function startPolling(id = jobId) {
		if (!id) return;
		stopPolling();
		timer = setInterval(() => loadJob(id), 1500);
	}

	$effect(() => {
		const key = `${target}:${jobId ?? 'latest'}`;
		if (loadedKey === key) return;
		loadedKey = key;
		stopPolling();
		if (jobId) {
			loadJob(jobId);
			startPolling(jobId);
		} else {
			loadLatest();
		}
	});

	onDestroy(stopPolling);
</script>

<section class="rounded-lg border border-zinc-800 bg-zinc-950/80">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
		<div>
			<h2 class="text-sm font-black text-zinc-100">{targetLabel(target)} Deploy Logs</h2>
			<p class="mt-1 text-xs font-bold text-zinc-500">
				{job ? `Job ${job.id.slice(0, 8)} · ${job.status}` : 'Belum ada log deploy'}
			</p>
		</div>
		<div class="flex items-center gap-2">
			{#if job?.status === 'running'}
				<span class="rounded-full border border-amber-500/30 px-3 py-1 text-xs font-black text-amber-300">
					running
				</span>
			{:else if job?.status === 'success'}
				<span class="rounded-full border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-300">
					success
				</span>
			{:else if job?.status === 'failed'}
				<span class="rounded-full border border-red-500/30 px-3 py-1 text-xs font-black text-red-300">
					failed
				</span>
			{/if}
			<button
				type="button"
				onclick={() => (job ? loadJob(job.id) : loadLatest())}
				disabled={loading}
				class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-black text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
			>
				<AppIcon name="refresh" class="text-[15px]" />
				Logs
			</button>
		</div>
	</div>

	{#if error}
		<div class="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-200">
			{error}
		</div>
	{/if}

	<pre class="max-h-[360px] min-h-[180px] overflow-auto p-4 font-mono text-[12px] leading-5 text-emerald-100"><code>{job?.log ?? '$ waiting for deploy output...'}</code></pre>
</section>
