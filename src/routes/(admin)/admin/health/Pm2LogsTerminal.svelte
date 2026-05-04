<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { tick } from 'svelte';

	type Pm2Logs = {
		processName: string;
		logs: string;
	};

	let { processName, onClose }: { processName: string; onClose: () => void } = $props();
	let logs = $state('');
	let loading = $state(false);
	let error = $state('');
	let loadedProcess = '';
	let logEl: HTMLPreElement | null = null;

	async function scrollBottom() {
		await tick();
		if (logEl) logEl.scrollTop = logEl.scrollHeight;
	}

	async function loadLogs() {
		if (!processName) return;
		loading = true;
		error = '';
		try {
			const response = await adminApi<Pm2Logs>(`/health/pm2/logs/${processName}`);
			logs = response.data.logs || '$ pm2 log kosong';
			await scrollBottom();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat PM2 logs';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!processName || loadedProcess === processName) return;
		loadedProcess = processName;
		loadLogs();
	});
</script>

<section class="rounded-lg border border-zinc-800 bg-zinc-950/80">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-4">
		<div>
			<h2 class="text-sm font-black text-zinc-100">PM2 Logs</h2>
			<p class="mt-1 text-xs font-bold text-zinc-500">pm2 logs {processName}</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadLogs}
				disabled={loading}
				class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-black text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
			>
				<AppIcon name="refresh" class="text-[15px]" />
				Refresh
			</button>
			<button
				type="button"
				onclick={onClose}
				class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-xs font-black text-red-300 hover:bg-red-500/10"
			>
				<AppIcon name="close" class="text-[15px]" />
				Close
			</button>
		</div>
	</div>

	{#if error}
		<div class="m-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-200">
			{error}
		</div>
	{/if}

	<pre bind:this={logEl} class="max-h-[420px] min-h-[220px] overflow-auto p-4 font-mono text-[12px] leading-5 text-sky-100"><code>{logs || '$ loading pm2 logs...'}</code></pre>
</section>
