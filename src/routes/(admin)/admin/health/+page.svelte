<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi } from '$lib/admin/api';
	import { onMount } from 'svelte';

	type Status = 'online' | 'offline' | 'degraded' | 'ok' | 'unavailable' | string;

	type HealthSummary = {
		generatedAt: string;
		api: {
			status: Status;
			uptimeSec: number;
			memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
			homeSectionsAvgMs: number | null;
		};
		redis: { status: Status; latencyMs: number | null; message?: string | null };
		goProxy: {
			status: Status;
			latencyMs: number | null;
			statusCode: number | null;
			url: string;
			message?: string | null;
		};
		pm2: {
			status: Status;
			message?: string | null;
			rows: {
				name: string;
				status: string;
				memoryMb: number;
				cpu: number;
				restarts: number;
				uptimeMs: number | null;
			}[];
		};
		topEndpoints: {
			route: string;
			method: string;
			hits: number;
			avgMs: number;
			p95Ms: number;
			errorCount: number;
		}[];
		providerErrors: {
			provider: string;
			totalErrors: number;
			lastStatusCode: number;
			lastError: string | null;
			lastAt: string;
		}[];
	};

	let summary = $state<HealthSummary | null>(null);
	let loading = $state(true);
	let clearing = $state(false);
	let actingKey = $state('');
	let error = $state('');
	let lastRefreshAt = $state<Date | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;

	async function load() {
		error = '';
		try {
			const response = await adminApi<HealthSummary>('/health/summary');
			summary = response.data;
			lastRefreshAt = new Date();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat health dashboard';
		} finally {
			loading = false;
		}
	}

	async function clearLogs() {
		if (clearing) return;
		const confirmed = window.confirm('Bersihkan log health sementara dari memory server?');
		if (!confirmed) return;

		clearing = true;
		try {
			await adminApi<{ cleared: number }>('/health/clear', { method: 'POST' });
			await load();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal membersihkan log';
		} finally {
			clearing = false;
		}
	}

	async function runPm2Action(processName: string, action: 'start' | 'stop' | 'restart') {
		const label = action === 'start' ? 'start' : action === 'stop' ? 'stop' : 'restart';
		const confirmed = window.confirm(`Yakin mau ${label} ${processName}?`);
		if (!confirmed) return;

		const key = `${processName}:${action}`;
		actingKey = key;
		error = '';
		try {
			await adminApi('/health/pm2/action', {
				method: 'POST',
				body: JSON.stringify({ processName, action })
			});
			setTimeout(load, processName === 'anime-api' && action === 'restart' ? 2000 : 600);
		} catch (err) {
			error = err instanceof Error ? err.message : `Gagal ${label} ${processName}`;
		} finally {
			actingKey = '';
		}
	}

	function canStop(row: { name: string; status: string }) {
		return row.name !== 'anime-api' && row.status === 'online';
	}

	function statusClass(status?: Status) {
		if (status === 'online' || status === 'ok') return 'border-emerald-500/30 text-emerald-300';
		if (status === 'degraded') return 'border-amber-500/30 text-amber-300';
		return 'border-red-500/30 text-red-300';
	}

	function statusDot(status?: Status) {
		if (status === 'online' || status === 'ok') return 'bg-emerald-400';
		if (status === 'degraded') return 'bg-amber-400';
		return 'bg-red-400';
	}

	function duration(ms?: number | null) {
		if (!ms && ms !== 0) return '-';
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ${minutes % 60}m`;
		return `${Math.floor(hours / 24)}d ${hours % 24}h`;
	}

	function uptime(seconds: number) {
		return duration(seconds * 1000);
	}

	function time(value?: string | null) {
		if (!value) return '-';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		load();
		timer = setInterval(load, 30_000);
		return () => {
			if (timer) clearInterval(timer);
		};
	});
</script>

<svelte:head>
	<title>Admin Health</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Runtime</p>
			<h1 class="mt-2 text-2xl font-black text-zinc-100">Health Dashboard</h1>
			<p class="mt-1 text-sm text-zinc-500">
				Status ringan untuk API, Redis, Go proxy, PM2, dan endpoint panas.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if lastRefreshAt}
				<span class="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-400">
					Update {lastRefreshAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
				</span>
			{/if}
			<button
				type="button"
				onclick={load}
				class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-500"
			>
				<AppIcon name="refresh" class="text-[18px]" />
				Refresh
			</button>
			<button
				type="button"
				onclick={clearLogs}
				disabled={clearing}
				class="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/10 disabled:opacity-60"
			>
				<AppIcon name="delete_sweep" class="text-[18px]" />
				Clear Logs
			</button>
		</div>
	</header>

	{#if error}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
			{error}
		</div>
	{/if}

	{#if loading && !summary}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 text-sm font-bold text-zinc-400">
			Memuat health dashboard...
		</div>
	{:else if summary}
		<section class="grid gap-4 md:grid-cols-3">
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
				<div class="flex items-center justify-between">
					<p class="text-sm font-black text-zinc-100">API</p>
					<span class="rounded-full border px-2 py-1 text-xs font-black {statusClass(summary.api.status)}">
						<span class="mr-1 inline-block h-2 w-2 rounded-full {statusDot(summary.api.status)}"></span>
						{summary.api.status}
					</span>
				</div>
				<p class="mt-4 text-2xl font-black text-white">{summary.api.memory.rssMb} MB</p>
				<p class="mt-1 text-xs font-bold text-zinc-500">RSS memory, uptime {uptime(summary.api.uptimeSec)}</p>
				<p class="mt-3 text-xs text-zinc-400">
					Home avg: {summary.api.homeSectionsAvgMs ? `${summary.api.homeSectionsAvgMs}ms` : 'belum ada data'}
				</p>
			</div>

			<div class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
				<div class="flex items-center justify-between">
					<p class="text-sm font-black text-zinc-100">Redis</p>
					<span class="rounded-full border px-2 py-1 text-xs font-black {statusClass(summary.redis.status)}">
						<span class="mr-1 inline-block h-2 w-2 rounded-full {statusDot(summary.redis.status)}"></span>
						{summary.redis.status}
					</span>
				</div>
				<p class="mt-4 text-2xl font-black text-white">
					{summary.redis.latencyMs === null ? '-' : `${summary.redis.latencyMs}ms`}
				</p>
				<p class="mt-1 text-xs font-bold text-zinc-500">{summary.redis.message ?? 'PING latency'}</p>
			</div>

			<div class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
				<div class="flex items-center justify-between">
					<p class="text-sm font-black text-zinc-100">Go Proxy</p>
					<span class="rounded-full border px-2 py-1 text-xs font-black {statusClass(summary.goProxy.status)}">
						<span class="mr-1 inline-block h-2 w-2 rounded-full {statusDot(summary.goProxy.status)}"></span>
						{summary.goProxy.status}
					</span>
				</div>
				<p class="mt-4 text-2xl font-black text-white">
					{summary.goProxy.latencyMs === null ? '-' : `${summary.goProxy.latencyMs}ms`}
				</p>
				<p class="mt-1 truncate text-xs font-bold text-zinc-500">{summary.goProxy.url}</p>
			</div>
		</section>

		<section class="rounded-lg border border-zinc-800 bg-zinc-900/70">
			<div class="border-b border-zinc-800 p-4">
				<h2 class="text-sm font-black text-zinc-100">PM2 Process</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[940px] text-left text-sm">
					<thead class="text-xs uppercase tracking-widest text-zinc-500">
						<tr>
							<th class="px-4 py-3">Name</th>
							<th class="px-4 py-3">Status</th>
							<th class="px-4 py-3">Memory</th>
							<th class="px-4 py-3">CPU</th>
							<th class="px-4 py-3">Restart</th>
							<th class="px-4 py-3">Uptime</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-800">
						{#each summary.pm2.rows as row}
							<tr>
								<td class="px-4 py-3 font-black text-zinc-100">{row.name}</td>
								<td class="px-4 py-3 text-zinc-300">{row.status}</td>
								<td class="px-4 py-3 text-zinc-300">{row.memoryMb} MB</td>
								<td class="px-4 py-3 text-zinc-300">{row.cpu}%</td>
								<td class="px-4 py-3 text-zinc-300">{row.restarts}</td>
								<td class="px-4 py-3 text-zinc-300">{duration(row.uptimeMs)}</td>
								<td class="px-4 py-3">
									<div class="flex justify-end gap-2">
										{#if row.status !== 'online'}
											<button
												type="button"
												onclick={() => runPm2Action(row.name, 'start')}
												disabled={actingKey === `${row.name}:start`}
												class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 text-xs font-black text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
											>
												<AppIcon name="play_arrow" class="text-[16px]" />
												Start
											</button>
										{/if}
										<button
											type="button"
											onclick={() => runPm2Action(row.name, 'restart')}
											disabled={actingKey === `${row.name}:restart`}
											class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-500/30 px-3 text-xs font-black text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
										>
											<AppIcon name="restart_alt" class="text-[16px]" />
											Restart
										</button>
										{#if canStop(row)}
											<button
												type="button"
												onclick={() => runPm2Action(row.name, 'stop')}
												disabled={actingKey === `${row.name}:stop`}
												class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-xs font-black text-red-300 hover:bg-red-500/10 disabled:opacity-50"
											>
												<AppIcon name="stop" class="text-[16px]" />
												Stop
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="px-4 py-6 text-center text-zinc-500">
									{summary.pm2.message ?? 'PM2 data belum tersedia'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="grid gap-4 xl:grid-cols-2">
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/70">
				<div class="border-b border-zinc-800 p-4">
					<h2 class="text-sm font-black text-zinc-100">Top Endpoint 1 Jam</h2>
				</div>
				<div class="divide-y divide-zinc-800">
					{#each summary.topEndpoints as endpoint}
						<div class="grid grid-cols-[1fr_auto] gap-3 p-4">
							<div class="min-w-0">
								<p class="truncate text-sm font-black text-zinc-100">
									{endpoint.method} {endpoint.route}
								</p>
								<p class="mt-1 text-xs text-zinc-500">
									avg {endpoint.avgMs}ms · p95 {endpoint.p95Ms}ms · error {endpoint.errorCount}
								</p>
							</div>
							<p class="text-sm font-black text-violet-300">{endpoint.hits} hit</p>
						</div>
					{:else}
						<p class="p-6 text-center text-sm text-zinc-500">Belum ada traffic tercatat.</p>
					{/each}
				</div>
			</div>

			<div class="rounded-lg border border-zinc-800 bg-zinc-900/70">
				<div class="border-b border-zinc-800 p-4">
					<h2 class="text-sm font-black text-zinc-100">Provider Error 1 Jam</h2>
				</div>
				<div class="divide-y divide-zinc-800">
					{#each summary.providerErrors as item}
						<div class="grid grid-cols-[1fr_auto] gap-3 p-4">
							<div class="min-w-0">
								<p class="truncate text-sm font-black text-zinc-100">{item.provider}</p>
								<p class="mt-1 text-xs text-zinc-500">
									Last {item.lastStatusCode} · {time(item.lastAt)}
								</p>
							</div>
							<p class="text-sm font-black text-red-300">{item.totalErrors} error</p>
						</div>
					{:else}
						<p class="p-6 text-center text-sm text-zinc-500">Belum ada error provider.</p>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>
