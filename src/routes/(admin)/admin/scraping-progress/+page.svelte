<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import config from '$lib/config';
	import PageShortcutPanel from '$lib/components/admin/PageShortcutPanel.svelte';
	import ScrapeQueuePanel from '$lib/components/admin/ScrapeQueuePanel.svelte';
	import ScrapingTargetPanel from '$lib/components/admin/ScrapingTargetPanel.svelte';
	import ScrapingUpdateSummary from '$lib/components/admin/ScrapingUpdateSummary.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	type LogType = 'info' | 'success' | 'error' | 'sys';
	type LogEntry = {
		time: string;
		type: LogType;
		message: string;
	};

	type ProgressData = {
		status?: 'idle' | 'running' | 'done' | 'error' | string;
		processed?: number;
		total?: number;
		startedAt?: string | null;
		finishedAt?: string | null;
		logs?: LogEntry[];
		summary?: {
			recentEpisodeLimit?: number;
			newAnimeCount?: number;
			animeWithNewEpisodesCount?: number;
			newEpisodesTotal?: number;
			animeUpdates?: Array<{
				animeTitle: string;
				animeSlug: string;
				isNewAnime: boolean;
				totalEpisodesDetected: number;
				scannedEpisodes: number;
				newEpisodesAdded: number;
				newEpisodeNumbers: number[];
			}>;
		};
	};

	type QueueItem = {
		page: number;
		status: 'pending' | 'running' | 'done' | 'error';
	};

	const BASE_SCRAPE_URL = 'https://anichin.cafe/seri/';
	const SCRAPE_ORDER = 'update';
	const TOTAL_PAGES = 30;
	const pageNumbers = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);

	let currentUrl = $state(buildPageUrl(1));
	let singlePage = $state(1);
	let rangeFrom = $state(1);
	let rangeTo = $state(5);
	let monitorSource = $state<EventSource | null>(null);
	let paused = $state(false);
	let isMonitoring = $state(false);
	let isLoading = $state(false);
	let activeFilter = $state<'all' | 'info' | 'success' | 'error'>('all');
	let filterSearch = $state('');
	let queue = $state<QueueItem[]>([]);
	let queueRunning = $state(false);
	let queueCancelled = $state(false);
	let queueStatus = $state('Belum ada queue aktif.');
	let footerStatus = $state('Idle');
	let lastUpdate = $state<string | null>(null);
	let progress = $state<ProgressData | null>(null);
	let systemLogs = $state<LogEntry[]>([]);
	let emptyMessage = $state('Pilih halaman target lalu klik monitor untuk mulai melihat progress.');
	let autoscroll = $state(true);
	let logContainer = $state<HTMLDivElement | null>(null);

	const statusCounts = $derived.by(() => {
		const logs = progress?.logs ?? [];
		return {
			total: logs.length,
			errors: logs.filter((log) => log.type === 'error').length,
			success: logs.filter((log) => log.type === 'success').length
		};
	});

	const progressPercent = $derived.by(() => {
		const total = progress?.total ?? 0;
		const processed = progress?.processed ?? 0;
		return total > 0 ? Math.max(0, Math.min(100, Math.round((processed / total) * 100))) : 0;
	});

	const selectedPage = $derived.by(() => {
		const match = currentUrl.match(/[?&]page=(\d+)/);
		return match ? Number(match[1]) : null;
	});

	const visibleLogs = $derived.by(() => {
		const search = filterSearch.trim().toLowerCase();
		return [...(progress?.logs ?? []), ...systemLogs].filter((log) => {
			const matchType = activeFilter === 'all' || log.type === activeFilter;
			const matchSearch = !search || log.message.toLowerCase().includes(search);
			return matchType && matchSearch;
		});
	});

	function endpoint(path: string) {
		return `${config.API_BASE_URL}${path}`;
	}

	function setQueueStatus(message: string) {
		queueStatus = message;
	}

	function buildPageUrl(page: number) {
		const url = new URL(BASE_SCRAPE_URL);
		url.searchParams.set('page', String(page));
		url.searchParams.set('order', SCRAPE_ORDER);
		return url.toString();
	}

	function setCurrentPage(page: number) {
		currentUrl = buildPageUrl(page);
	}

	function resetMonitorState(message: string) {
		progress = null;
		systemLogs = [];
		emptyMessage = message;
		lastUpdate = null;
	}

	function appendSystemLog(message: string) {
		systemLogs = [
			...systemLogs,
			{
				time: new Date().toISOString(),
				type: 'sys',
				message
			}
		];
		queueMicrotask(scrollToBottom);
	}

	function scrollToBottom() {
		if (!autoscroll || !logContainer) return;
		logContainer.scrollTop = logContainer.scrollHeight;
	}

	async function requestJson(path: string, init?: RequestInit) {
		if (!auth.accessToken) await auth.refreshToken();
		const response = await auth.authFetch(path, init);
		const payload = await response.json().catch(() => null);
		if (!response.ok) {
			throw new Error(payload?.message ?? 'Request gagal');
		}
		return payload;
	}

	function consumeProgress(data: ProgressData | null) {
		progress = data;
		lastUpdate = new Date().toLocaleTimeString('id-ID');
		footerStatus =
			progress?.status === 'running'
				? 'Monitoring aktif'
				: progress?.status === 'done'
					? 'Selesai'
					: progress?.status === 'error'
						? 'Error'
						: paused
							? 'Paused'
							: 'Idle';
		emptyMessage = 'Belum ada log untuk URL ini.';
		stopIfDone(progress);
		queueMicrotask(scrollToBottom);
	}

	function parseProgressEvent(data: string) {
		try {
			return JSON.parse(data) as ProgressData | null;
		} catch {
			return null;
		}
	}

	function startMonitor() {
		if (!currentUrl.trim()) return;
		stopMonitor();
		paused = false;
		isMonitoring = true;
		isLoading = false;
		footerStatus = 'Monitoring aktif';
		const streamUrl = endpoint(
			`/api/scraping/progress/stream?url=${encodeURIComponent(currentUrl)}`
		);
		monitorSource = new EventSource(streamUrl, { withCredentials: true });
		monitorSource.addEventListener('progress', (event) => {
			const payload = parseProgressEvent((event as MessageEvent).data);
			consumeProgress(payload);
		});
		monitorSource.onerror = () => {
			footerStatus = 'Koneksi stream putus';
		};
	}

	function stopMonitor() {
		if (monitorSource) {
			monitorSource.close();
			monitorSource = null;
		}
		isMonitoring = false;
	}

	function togglePause() {
		paused = !paused;
		if (paused) {
			stopMonitor();
			footerStatus = 'Paused';
			return;
		}
		startMonitor();
	}

	function stopIfDone(data: ProgressData | null) {
		if (!data?.status) return;
		if (data.status === 'done' || data.status === 'error') {
			stopMonitor();
			footerStatus = data.status === 'done' ? 'Scrape selesai' : 'Scrape error';
		}
	}

	async function deleteProgress() {
		if (!currentUrl.trim()) return;
		try {
			const payload = await requestJson(
				`/api/scraping/deleteprogress?url=${encodeURIComponent(currentUrl)}`,
				{ method: 'DELETE' }
			);
			resetMonitorState('Progress dihapus. Pilih URL lain atau mulai scrape baru.');
			appendSystemLog(payload.message ?? 'Progress berhasil dihapus');
			footerStatus = 'Progress dihapus';
		} catch (error) {
			appendSystemLog(error instanceof Error ? error.message : 'Gagal hapus progress');
		}
	}

	async function triggerScrape(url: string) {
		await requestJson(`/api/scraping?url=${encodeURIComponent(url)}&episodeLimit=2`);
	}

	async function waitUntilDone(url: string) {
		return new Promise<void>((resolve) => {
			const streamUrl = endpoint(`/api/scraping/progress/stream?url=${encodeURIComponent(url)}`);
			const queueSource = new EventSource(streamUrl, { withCredentials: true });
			const done = () => {
				queueSource.close();
				resolve();
			};

			queueSource.addEventListener('progress', (event) => {
				if (queueCancelled) {
					done();
					return;
				}
				const payload = parseProgressEvent((event as MessageEvent).data);
				const status = payload?.status;
				if (status === 'done' || status === 'error') {
					done();
				}
			});
			queueSource.onerror = () => {
				appendSystemLog('Stream progress queue terputus.');
				done();
			};
		});
	}

	async function processQueue() {
		for (let index = 0; index < queue.length; index += 1) {
			if (queueCancelled) break;

			const item = queue[index];
			const url = buildPageUrl(item.page);
			item.status = 'running';
			queue = [...queue];
			setCurrentPage(item.page);
			setQueueStatus(`Menjalankan scrape page ${item.page}...`);

			try {
				await triggerScrape(url);
				startMonitor();
				await waitUntilDone(url);

				if (queueCancelled) break;

				item.status = progress?.status === 'error' ? 'error' : 'done';
				setQueueStatus(
					item.status === 'done'
						? `Page ${item.page} selesai diproses.`
						: `Page ${item.page} selesai dengan error.`
				);
			} catch (error) {
				item.status = 'error';
				appendSystemLog(
					error instanceof Error
						? `Page ${item.page} gagal: ${error.message}`
						: `Page ${item.page} gagal dijalankan`
				);
				setQueueStatus(`Page ${item.page} gagal dijalankan.`);
			}

			queue = [...queue];
		}

		const doneCount = queue.filter((item) => item.status === 'done').length;
		const totalCount = queue.length;

		queueRunning = false;
		queueCancelled = false;
		setQueueStatus(
			totalCount
				? `Queue selesai. ${doneCount}/${totalCount} page sukses diproses.`
				: 'Belum ada queue aktif.'
		);
	}

	async function startScrape(mode: 'single' | 'range') {
		if (queueRunning) return;

		if (mode === 'single') {
			if (!singlePage || singlePage < 1 || singlePage > TOTAL_PAGES) return;
			queue = [{ page: singlePage, status: 'pending' }];
		} else {
			if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) {
				appendSystemLog('Range page tidak valid.');
				return;
			}

			queue = Array.from({ length: rangeTo - rangeFrom + 1 }, (_, index) => ({
				page: rangeFrom + index,
				status: 'pending' as const
			}));
		}

		queueRunning = true;
		queueCancelled = false;
		setQueueStatus(`Queue dibuat untuk ${queue.length} page.`);
		await processQueue();
	}

	function cancelQueue() {
		queueCancelled = true;
		queue = queue.map((item) =>
			item.status === 'pending' || item.status === 'running' ? { ...item, status: 'error' } : item
		);
		setQueueStatus('Queue dibatalkan.');
	}

	function formatTime(value?: string | null) {
		if (!value) return '—';
		return new Date(value).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatDateTime(value?: string | Date | null) {
		if (!value) return '—';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatMessage(message: string) {
		const escaped = message
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		return escaped
			.replace(/✓ ([^<]+)/g, '<span class="text-emerald-300">✓ $1</span>')
			.replace(/✗ ([^<]+)/g, '<span class="text-rose-300">✗ $1</span>')
			.replace(/↳ ([^<]+)/g, '<span class="text-sky-300">↳ $1</span>')
			.replace(/(\d+ episodes?)/gi, '<span class="text-amber-200">$1</span>')
			.replace(/(Found \d+ series)/gi, '<span class="text-amber-200">$1</span>')
			.replace(/(\d+ server\(s\))/gi, '<span class="text-sky-300">$1</span>');
	}

	onMount(() => {
		startMonitor();
	});

	onDestroy(() => {
		stopMonitor();
	});
</script>

<div class="space-y-6">
	<section class="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-[0_24px_80px_-48px_rgba(168,85,247,0.45)]">
		<div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
			<div class="space-y-3">
				<div class="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-violet-300">
					<span class="h-2 w-2 rounded-full {isMonitoring && !paused ? 'bg-emerald-400' : 'bg-zinc-500'}"></span>
					Scraping Monitor
				</div>
				<div>
					<h2 class="text-2xl font-black text-zinc-50">Monitor scraping dari dashboard admin</h2>
					<p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
						Halaman ini mindahin fungsi `progress.html` ke dashboard admin dengan kontrol queue,
						progress bar, log filter, dan tampilan yang nyatu sama UI admin sekarang.
					</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Status</p>
					<p class="mt-2 text-lg font-black text-zinc-100">{progress?.status ?? 'idle'}</p>
					<p class="mt-1 text-xs text-zinc-500">{footerStatus}</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Progress</p>
					<p class="mt-2 text-lg font-black text-zinc-100">
						{progress?.processed ?? 0}/{progress?.total ?? 0}
					</p>
					<p class="mt-1 text-xs text-zinc-500">{progressPercent}% selesai</p>
				</div>
			</div>
		</div>
	</section>

	<section class="grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
		<div class="space-y-4">
			<ScrapingTargetPanel
				bind:currentUrl
				{progress}
				{lastUpdate}
				{startMonitor}
				{togglePause}
				{deleteProgress}
				{formatDateTime}
				{paused}
			/>

			<ScrapeQueuePanel
				bind:singlePage
				bind:rangeFrom
				bind:rangeTo
				{queue}
				{queueRunning}
				{queueStatus}
				totalPages={TOTAL_PAGES}
				{startScrape}
				{cancelQueue}
			/>

			<PageShortcutPanel
				{pageNumbers}
				{selectedPage}
				{setCurrentPage}
				{startMonitor}
			/>
		</div>

		<div class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
				<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Total Logs</p>
					<p class="mt-3 text-3xl font-black text-zinc-100">{statusCounts.total}</p>
					<p class="mt-2 text-sm text-zinc-500">Termasuk log scraping dan system notice.</p>
				</div>
				<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Error</p>
					<p class="mt-3 text-3xl font-black text-rose-300">{statusCounts.errors}</p>
					<p class="mt-2 text-sm text-zinc-500">Biar cepat kebaca kalau ada page yang gagal.</p>
				</div>
			</div>

				<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">Live Progress</h3>
							<p class="mt-2 text-sm text-zinc-500">Progress live via SSE selama monitor aktif.</p>
						</div>
						<p class="text-sm font-black text-violet-300">{progressPercent}%</p>
					</div>
				<div class="mt-4 h-4 overflow-hidden rounded-full bg-zinc-950">
					<div
						class="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 transition-all duration-500"
						style={`width:${progressPercent}%`}
					></div>
				</div>
				<div class="mt-3 flex items-center justify-between text-xs text-zinc-500">
					<span>{progress?.processed ?? 0} series diproses</span>
					<span>{progress?.total ?? 0} total series</span>
				</div>
			</div>

			<ScrapingUpdateSummary {progress} />

			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
						<div>
							<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">Terminal Log</h3>
							<p class="mt-2 text-sm text-zinc-500">Filter log berdasarkan tipe atau cari teks tertentu.</p>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							{#each ['all', 'info', 'success', 'error'] as filter}
								<button
									onclick={() => (activeFilter = filter as typeof activeFilter)}
									class="rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition {activeFilter === filter
										? filter === 'error'
											? 'border-rose-500/50 bg-rose-500/10 text-rose-200'
											: filter === 'success'
												? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
												: filter === 'info'
													? 'border-sky-500/50 bg-sky-500/10 text-sky-200'
													: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-100'
										: 'border-zinc-700 bg-zinc-950/70 text-zinc-400 hover:bg-zinc-800'}"
								>
									{filter}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-3 xl:flex-row xl:items-center">
						<input
							bind:value={filterSearch}
							placeholder="Cari isi log..."
							class="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500"
						/>
						<label class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
							<input bind:checked={autoscroll} type="checkbox" class="accent-violet-500" />
							Autoscroll
						</label>
						<div class="text-xs font-semibold text-zinc-500">{visibleLogs.length} log tampil</div>
					</div>

					<div
						bind:this={logContainer}
						class="h-[42rem] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0b0b0f] p-4 shadow-inner shadow-black/30"
					>
						{#if visibleLogs.length === 0}
							<div class="flex h-full flex-col items-center justify-center text-center">
								<div class="rounded-full border border-zinc-800 bg-zinc-900 p-4 text-2xl text-zinc-500">_</div>
								<p class="mt-4 text-sm font-semibold text-zinc-300">{emptyMessage}</p>
								<p class="mt-2 text-xs text-zinc-500">
									{isLoading ? 'Sedang mengambil data...' : 'Log akan muncul setelah progress tersedia.'}
								</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each visibleLogs as log}
									<div class="grid grid-cols-[88px_72px_1fr] gap-3 rounded-xl border border-zinc-900 bg-zinc-950/80 px-3 py-2 text-sm">
										<div class="pt-0.5 text-[11px] text-zinc-500">{formatTime(log.time)}</div>
										<div>
											<span
												class="inline-flex min-w-[60px] justify-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide {log.type === 'success'
													? 'bg-emerald-500/15 text-emerald-300'
													: log.type === 'error'
														? 'bg-rose-500/15 text-rose-300'
														: log.type === 'sys'
															? 'bg-zinc-700/60 text-zinc-300'
															: 'bg-sky-500/15 text-sky-300'}"
											>
												{log.type}
											</span>
										</div>
										<div class="min-w-0 break-words text-zinc-100">
											{@html formatMessage(log.message)}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
