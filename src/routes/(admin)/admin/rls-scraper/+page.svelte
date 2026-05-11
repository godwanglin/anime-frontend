<script lang="ts">
	import { onDestroy } from 'svelte';
	import config from '$lib/config';
	import { adminApi } from '$lib/admin/api';

	type ImportLog = { time: string; type: 'info' | 'success' | 'error'; message: string };
	type ImportItem = {
		sourceUrl: string;
		title?: string;
		slug?: string;
		episodeCount?: number;
		serverCount?: number;
		error?: string;
	};
	type ImportState = {
		id: string;
		status: 'running' | 'done' | 'error';
		total: number;
		processed: number;
		episodeTotal: number;
		episodeProcessed: number;
		urls: string[];
		items: ImportItem[];
		logs: ImportLog[];
		startedAt: string;
		finishedAt?: string;
	};

	let urls = $state([
		'https://www.reelshort.com/id/movie/versi-dub-taklukkan-dunia-hantu-tanpa-sepeser-pun-69d76d6d112f6fd2b6031d70'
	]);
	let importId = $state('');
	let importState = $state<ImportState | null>(null);
	let source = $state<EventSource | null>(null);
	let busy = $state(false);
	let statusText = $state('Idle');
	let logPanel = $state<HTMLDivElement | null>(null);
	let autoscroll = $state(true);

	const movieProgress = $derived.by(() => {
		const total = importState?.total ?? 0;
		return total ? Math.round(((importState?.processed ?? 0) / total) * 100) : 0;
	});
	const episodeProgress = $derived.by(() => {
		const total = importState?.episodeTotal ?? 0;
		return total ? Math.round(((importState?.episodeProcessed ?? 0) / total) * 100) : 0;
	});
	const successCount = $derived.by(() => importState?.items.filter((item) => !item.error).length ?? 0);
	const errorCount = $derived.by(() => importState?.items.filter((item) => item.error).length ?? 0);

	function stopStream() {
		source?.close();
		source = null;
	}

	function scrollLog() {
		if (!autoscroll || !logPanel) return;
		logPanel.scrollTop = logPanel.scrollHeight;
	}

	function consume(next: ImportState | null) {
		if (!next) return;
		importState = next;
		statusText =
			next.status === 'running'
				? 'Import berjalan'
				: next.status === 'done'
					? 'Import selesai'
					: 'Import selesai dengan error';
		if (next.status !== 'running') {
			busy = false;
			stopStream();
		}
		queueMicrotask(scrollLog);
	}

	function startStream(id: string) {
		stopStream();
		source = new EventSource(
			`${config.API_BASE_URL}/api/admin/rls-scraper/import/${encodeURIComponent(id)}/stream`,
			{ withCredentials: true }
		);
		source.addEventListener('import', (event) => {
			try {
				consume(JSON.parse((event as MessageEvent).data) as ImportState | null);
			} catch {
				// ignore malformed SSE frames
			}
		});
		source.onerror = () => {
			statusText = 'Stream terputus';
		};
	}

	function addInput() {
		urls = [...urls, ''];
	}

	function removeInput(index: number) {
		urls = urls.filter((_, itemIndex) => itemIndex !== index);
		if (urls.length === 0) urls = [''];
	}

	async function startImport() {
		const cleanUrls = urls.map((url) => url.trim()).filter(Boolean);
		if (busy || cleanUrls.length === 0) return;
		busy = true;
		importState = null;
		statusText = 'Menyiapkan import...';

		try {
			const payload = await adminApi<{ importId: string; streamUrl: string }>('/rls-scraper/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls: cleanUrls })
			});
			importId = payload.data.importId;
			startStream(importId);
			statusText = 'Import dimulai';
		} catch (error) {
			busy = false;
			statusText = error instanceof Error ? error.message : 'Gagal mulai import';
		}
	}

	async function clearImport() {
		if (importId) {
			await adminApi(`/rls-scraper/import/${encodeURIComponent(importId)}`, { method: 'DELETE' }).catch(
				() => null
			);
		}
		stopStream();
		importId = '';
		importState = null;
		busy = false;
		statusText = 'Idle';
	}

	function formatTime(value: string) {
		return new Date(value).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	onDestroy(stopStream);
</script>

<div class="space-y-5">
	<section class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
			<div>
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">RLS Scraper</p>
				<h2 class="mt-2 text-2xl font-black text-zinc-50">Import ReelShort ke Short</h2>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
					Input URL movie ReelShort, scraper akan membuat anime type Short, episode, dan server rawtext
					quality. Kalau quality detail gagal, server disimpan sebagai fallback untuk hydrate ulang di client.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[34rem]">
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Status</p>
					<p class="mt-2 text-sm font-bold text-zinc-100">{statusText}</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Movie</p>
					<p class="mt-2 text-xl font-black text-zinc-100">{successCount}/{importState?.total ?? 0}</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Episode</p>
					<p class="mt-2 text-xl font-black text-zinc-100">
						{importState?.episodeProcessed ?? 0}/{importState?.episodeTotal ?? 0}
					</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Error</p>
					<p class="mt-2 text-xl font-black text-rose-300">{errorCount}</p>
				</div>
			</div>
		</div>
		<div class="mt-5 space-y-2">
			<div class="h-3 overflow-hidden rounded-full bg-zinc-950">
				<div class="h-full bg-violet-500 transition-all duration-500" style={`width:${movieProgress}%`}></div>
			</div>
			<div class="h-2 overflow-hidden rounded-full bg-zinc-950">
				<div class="h-full bg-sky-500 transition-all duration-500" style={`width:${episodeProgress}%`}></div>
			</div>
		</div>
	</section>

	<section class="grid gap-4 xl:grid-cols-[28rem_1fr]">
		<div class="space-y-4">
			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Input URL</h3>
					<button
						disabled={busy}
						onclick={addInput}
						class="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
					>
						Tambah Input
					</button>
				</div>

				<div class="mt-4 space-y-3">
					{#each urls as url, index}
						<div class="grid gap-2 sm:grid-cols-[1fr_auto]">
							<input
								value={url}
								oninput={(event) => {
									urls[index] = event.currentTarget.value;
								}}
								disabled={busy}
								placeholder="https://www.reelshort.com/id/movie/..."
								class="h-12 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500 disabled:opacity-50"
							/>
							<button
								disabled={busy}
								onclick={() => removeInput(index)}
								class="rounded-xl border border-red-900 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
							>
								Hapus
							</button>
						</div>
					{/each}
				</div>

				<div class="mt-4 grid grid-cols-2 gap-3">
					<button
						disabled={busy}
						onclick={startImport}
						class="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
					>
						{busy ? 'Scraping...' : 'Start Scrape'}
					</button>
					<button
						onclick={clearImport}
						class="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
					>
						Clear
					</button>
				</div>
			</div>

			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Result</h3>
				<div class="mt-4 max-h-[34rem] space-y-2 overflow-y-auto">
					{#each importState?.items ?? [] as item}
						<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
							<p class="truncate text-sm font-black text-zinc-100">{item.title ?? item.sourceUrl}</p>
							{#if item.error}
								<p class="mt-1 text-xs leading-5 text-rose-300">{item.error}</p>
							{:else}
								<p class="mt-1 text-xs text-zinc-500">
									{item.slug} · {item.episodeCount ?? 0} eps · {item.serverCount ?? 0} server
								</p>
							{/if}
						</div>
					{/each}
					{#if !importState?.items.length}
						<p class="py-10 text-center text-sm text-zinc-500">Belum ada result.</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Live Log</h3>
				<label class="flex items-center gap-2 text-xs text-zinc-400">
					<input bind:checked={autoscroll} type="checkbox" class="accent-violet-500" />
					Autoscroll
				</label>
			</div>
			<div bind:this={logPanel} class="mt-4 h-[46rem] overflow-y-auto rounded-xl bg-zinc-950 p-3">
				{#each importState?.logs ?? [] as log}
					<div class="grid grid-cols-[76px_70px_1fr] gap-2 border-b border-zinc-900 py-2 text-sm">
						<span class="text-xs text-zinc-500">{formatTime(log.time)}</span>
						<span
							class={log.type === 'error'
								? 'text-rose-300'
								: log.type === 'success'
									? 'text-emerald-300'
									: 'text-sky-300'}>{log.type}</span
						>
						<span class="text-zinc-200">{log.message}</span>
					</div>
				{/each}
				{#if !importState?.logs.length}
					<p class="py-12 text-center text-sm text-zinc-500">Belum ada log.</p>
				{/if}
			</div>
		</div>
	</section>
</div>
