<script lang="ts">
	import { onDestroy } from 'svelte';
	import config from '$lib/config';
	import { imageUrl } from '$lib/image-url';
	import { auth } from '$lib/stores/auth.svelte';

	type ScanLog = { time: string; type: 'info' | 'success' | 'error'; message: string };
	type ScanItem = {
		card: { slug: string; title: string; thumbnail: string | null; released: string | null };
		detail?: {
			title: string;
			genres: string[];
			episodes: Array<{ number: string; title: string; thumbnail?: string | null; servers?: unknown[] }>;
		};
		error?: string;
	};
	type ScanState = {
		id: string;
		status: 'running' | 'done' | 'error';
		fromPage: number;
		toPage: number;
		episodeMode: 'full' | 'recent';
		episodeLimit: number;
		total: number;
		processed: number;
		items: ScanItem[];
		logs: ScanLog[];
		startedAt: string;
		finishedAt?: string;
	};

	const DEFAULT_BASE_URL = 'https://x5.sokuja.uk/anime/';

	let page = $state(1);
	let toPage = $state(1);
	let episodeMode = $state<'full' | 'recent'>('full');
	let episodeLimit = $state(2);
	let scanId = $state('');
	let scan = $state<ScanState | null>(null);
	let source = $state<EventSource | null>(null);
	let busy = $state(false);
	let statusText = $state('Idle');
	let selectedItem = $state<ScanItem | null>(null);
	let autoscroll = $state(true);
	let insertToDb = $state(false);
	let logPanel = $state<HTMLDivElement | null>(null);

	const targetUrl = $derived.by(() => {
		const url = new URL(DEFAULT_BASE_URL);
		url.searchParams.set('page', String(page));
		url.searchParams.set('order', 'update');
		return url.toString();
	});
	const progress = $derived.by(() => {
		const total = scan?.total ?? 0;
		const processed = scan?.processed ?? 0;
		return total ? Math.round((processed / total) * 100) : 0;
	});
	const successCount = $derived.by(() => scan?.items.filter((item) => item.detail).length ?? 0);
	const errorCount = $derived.by(() => scan?.items.filter((item) => item.error).length ?? 0);
	const episodeCount = $derived.by(() =>
		(scan?.items ?? []).reduce((sum, item) => sum + (item.detail?.episodes.length ?? 0), 0)
	);
	const serverCount = $derived.by(() =>
		(scan?.items ?? []).reduce(
			(sum, item) =>
				sum + (item.detail?.episodes.reduce((total, episode) => total + (episode.servers?.length ?? 0), 0) ?? 0),
			0
		)
	);

	function endpoint(path: string) {
		return `${config.API_BASE_URL}${path}`;
	}

	async function requestJson(path: string, init?: RequestInit) {
		if (!auth.accessToken) await auth.refreshToken();
		const response = await auth.authFetch(path, init);
		const payload = await response.json().catch(() => null);
		if (!response.ok) throw new Error(payload?.message ?? 'Request gagal');
		return payload;
	}

	function stopStream() {
		source?.close();
		source = null;
	}

	function scrollLog() {
		if (!autoscroll || !logPanel) return;
		logPanel.scrollTop = logPanel.scrollHeight;
	}

	function consume(next: ScanState | null) {
		if (!next) return;
		scan = next;
		const isImport = next.id.includes('sokuja-import:');
		statusText =
			next.status === 'running'
				? isImport
					? 'Import berjalan'
					: 'Scanning berjalan'
				: next.status === 'done'
					? isImport
						? 'Import selesai'
						: 'Scan selesai'
					: isImport
						? 'Import error'
						: 'Scan error';
		if (!selectedItem && next.items.length) selectedItem = next.items.at(-1) ?? null;
		if (next.status === 'done' || next.status === 'error') {
			busy = false;
			stopStream();
		}
		queueMicrotask(scrollLog);
	}

	function startStream(id: string) {
		stopStream();
		source = new EventSource(endpoint(`/api/scraping/sokuja/scan/${encodeURIComponent(id)}/stream`), {
			withCredentials: true
		});
		source.addEventListener('scan', (event) => {
			try {
				consume(JSON.parse((event as MessageEvent).data) as ScanState | null);
			} catch {
				// ignore malformed SSE frames
			}
		});
		source.onerror = () => {
			statusText = 'Stream terputus';
		};
	}

	async function startScan(mode: 'single' | 'range') {
		if (busy) return;
		busy = true;
		scan = null;
		selectedItem = null;
		statusText = 'Menyiapkan scan...';
		const from = mode === 'single' ? page : Math.min(page, toPage);
		const last = mode === 'single' ? page : Math.max(page, toPage);
		try {
			if (insertToDb) {
				statusText = 'Menyiapkan import...';
				const payload = await requestJson(
					`/api/scraping/sokuja/import-job?page=${from}&toPage=${last}&episodeMode=${episodeMode}&episodeLimit=${episodeLimit}`,
					{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
				);
				scanId = payload.data.scanId;
				startStream(scanId);
				statusText = 'Import dimulai';
				return;
			}

			const payload = await requestJson(
				`/api/scraping/sokuja/scan?page=${from}&toPage=${last}&episodeMode=${episodeMode}&episodeLimit=${episodeLimit}`,
				{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
			);
			scanId = payload.data.scanId;
			startStream(scanId);
			statusText = 'Scan dimulai';
		} catch (error) {
			busy = false;
			statusText = error instanceof Error ? error.message : 'Gagal mulai scan';
		}
	}

	async function clearScan() {
		if (scanId) {
			await requestJson(`/api/scraping/sokuja/scan/${encodeURIComponent(scanId)}`, { method: 'DELETE' }).catch(
				() => null
			);
		}
		stopStream();
		scanId = '';
		scan = null;
		selectedItem = null;
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
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">Sokuja Scraper</p>
				<h2 class="mt-2 text-2xl font-black text-zinc-50">
					{insertToDb ? 'Scan data Sokuja dan insert DB' : 'Scan data Sokuja tanpa insert DB'}
				</h2>
				<p class="mt-2 max-w-3xl text-sm text-zinc-400">
					Target default: {targetUrl}. {insertToDb
						? 'Data hasil scan akan langsung masuk/update DB.'
						: 'Hasil scan disimpan sementara untuk direview sebelum import.'}
				</p>
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[34rem]">
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Status</p>
					<p class="mt-2 text-sm font-bold text-zinc-100">{statusText}</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Anime</p>
					<p class="mt-2 text-xl font-black text-zinc-100">{successCount}/{scan?.total ?? 0}</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Episode</p>
					<p class="mt-2 text-xl font-black text-zinc-100">{episodeCount}</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
					<p class="text-[10px] font-black uppercase text-zinc-500">Server</p>
					<p class="mt-2 text-xl font-black text-zinc-100">{serverCount}</p>
				</div>
			</div>
		</div>
		<div class="mt-5 h-3 overflow-hidden rounded-full bg-zinc-950">
			<div class="h-full bg-violet-500 transition-all duration-500" style={`width:${progress}%`}></div>
		</div>
	</section>

	<section class="grid gap-4 xl:grid-cols-[24rem_1fr]">
		<div class="space-y-4">
			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Kontrol Scan</h3>
				<div class="mt-4 grid grid-cols-2 gap-3">
					<label class="space-y-2 text-xs font-bold text-zinc-400">
						Page
						<input bind:value={page} min="1" type="number" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-zinc-100" />
					</label>
					<label class="space-y-2 text-xs font-bold text-zinc-400">
						To Page
						<input bind:value={toPage} min="1" type="number" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-zinc-100" />
					</label>
					<label class="space-y-2 text-xs font-bold text-zinc-400">
						Episode Mode
						<select bind:value={episodeMode} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-zinc-100">
							<option value="full">Full scan</option>
							<option value="recent">Recent only</option>
						</select>
					</label>
					<label class="space-y-2 text-xs font-bold text-zinc-400">
						Recent Limit
						<input bind:value={episodeLimit} min="1" max="5" type="number" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-zinc-100" />
					</label>
				</div>
				<label class="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm font-bold text-zinc-200">
					<input bind:checked={insertToDb} disabled={busy} type="checkbox" class="h-4 w-4 accent-violet-500" />
					<span>Insert ke DB setelah scan</span>
				</label>
				<div class="mt-4 grid grid-cols-2 gap-3">
					<button disabled={busy} onclick={() => startScan('single')} class="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
						{insertToDb ? 'Import Page' : 'Scan Page'}
					</button>
					<button disabled={busy} onclick={() => startScan('range')} class="rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
						{insertToDb ? 'Import Range' : 'Scan Range'}
					</button>
					<button onclick={clearScan} class="col-span-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-200">
						Clear Result
					</button>
				</div>
			</div>

			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Result</h3>
					<p class="text-xs text-rose-300">{errorCount} error</p>
				</div>
				<div class="mt-4 max-h-[34rem] space-y-2 overflow-y-auto">
					{#each scan?.items ?? [] as item}
						<button
							onclick={() => (selectedItem = item)}
							class="flex w-full gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left hover:border-violet-500/60"
						>
							<img src={item.card.thumbnail ? imageUrl(item.card.thumbnail) : '/icon.png'} alt="" class="h-14 w-10 rounded object-cover" />
							<div class="min-w-0">
								<p class="truncate text-sm font-bold text-zinc-100">{item.card.title}</p>
								<p class="mt-1 text-xs text-zinc-500">
									{item.detail?.episodes.length ?? 0} eps · {item.detail?.genres.slice(0, 2).join(', ') || 'No genre'}
								</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Preview Data</h3>
				{#if selectedItem?.detail}
					<div class="mt-4 grid gap-3 lg:grid-cols-[12rem_1fr]">
						<img src={selectedItem.card.thumbnail ? imageUrl(selectedItem.card.thumbnail) : '/icon.png'} alt="" class="aspect-[3/4] w-full rounded-xl object-cover" />
						<div>
							<h4 class="text-xl font-black text-zinc-50">{selectedItem.detail.title}</h4>
							<p class="mt-2 text-sm text-zinc-400">{selectedItem.detail.genres.join(', ') || 'Genre kosong'}</p>
							<div class="mt-4 grid gap-2 sm:grid-cols-2">
								{#each selectedItem.detail.episodes as episode}
									<div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
										<p class="text-sm font-bold text-zinc-100">Episode {episode.number}</p>
										<p class="mt-1 text-xs text-zinc-500">{episode.servers?.length ?? 0} server</p>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<p class="mt-4 text-sm text-zinc-500">Pilih item hasil scan untuk lihat detail.</p>
				{/if}
			</div>

			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Live Log</h3>
					<label class="flex items-center gap-2 text-xs text-zinc-400">
						<input bind:checked={autoscroll} type="checkbox" class="accent-violet-500" />
						Autoscroll
					</label>
				</div>
				<div bind:this={logPanel} class="mt-4 h-[28rem] overflow-y-auto rounded-xl bg-zinc-950 p-3">
					{#each scan?.logs ?? [] as log}
						<div class="grid grid-cols-[76px_70px_1fr] gap-2 border-b border-zinc-900 py-2 text-sm">
							<span class="text-xs text-zinc-500">{formatTime(log.time)}</span>
							<span class={log.type === 'error' ? 'text-rose-300' : log.type === 'success' ? 'text-emerald-300' : 'text-sky-300'}>{log.type}</span>
							<span class="text-zinc-200">{log.message}</span>
						</div>
					{/each}
					{#if !scan?.logs.length}
						<p class="py-12 text-center text-sm text-zinc-500">Belum ada log.</p>
					{/if}
				</div>
			</div>
		</div>
	</section>
</div>
