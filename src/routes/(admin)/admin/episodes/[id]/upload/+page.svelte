<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type Episode = {
		id: number;
		animeId: number;
		number: number;
		title: string;
		slug: string;
		status?: string;
		_count?: { servers?: number };
		anime?: { id: number; title: string; slug?: string };
	};

	type SessionResp = {
		uploadId: string;
		uploadUrl: string;
		statusUrl: string;
		completeUrl: string;
		expiresAt: string;
		initialResolution: number;
	};

	type StatusResp = {
		uploadId: string;
		episodeId?: number;
		status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed' | 'expired';
		expiresAt: string;
		totalChunks: number | null;
		receivedChunks: number;
		receivedChunkIndexes: number[];
		uploadProgress: number;
		encodingProgress: number;
		r2UploadProgress: number;
		currentResolution: number | null;
		resolutionsCompleted: number[];
		masterPlaylistUrl: string | null;
		videoId: string | null;
		errorMessage: string | null;
		fileName?: string | null;
		fileSize?: number | null;
		fileLastModified?: number | null;
		initialResolution?: number;
	};

	const RESOLUTION_OPTIONS = [144, 240, 480, 720, 1080] as const;
	const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
	const STORAGE_KEY = (episodeId: number) => `upload-session:${episodeId}`;

	let id = $derived(Number(page.params.id));
	let episode = $state<Episode | null>(null);
	let isLoading = $state(true);
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement | null = null;

	let initialResolution = $state<number>(1080);
	let session = $state<SessionResp | null>(null);
	let status = $state<StatusResp | null>(null);
	let isUploading = $state(false);
	let isAborting = $state(false);
	let abortRequested = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let logLines = $state<string[]>([]);

	const fileMeta = $derived(
		selectedFile
			? {
					name: selectedFile.name,
					size: formatBytes(selectedFile.size),
					type: selectedFile.type || 'video/*'
				}
			: null
	);
	const serverCount = $derived(Number(episode?._count?.servers ?? 0));
	const totalChunks = $derived(
		selectedFile ? Math.max(1, Math.ceil(selectedFile.size / CHUNK_SIZE)) : 0
	);
	const expiresInMs = $derived(
		session ? new Date(session.expiresAt).getTime() - Date.now() : 0
	);
	const sessionExpired = $derived(
		session ? new Date(session.expiresAt).getTime() <= Date.now() : false
	);
	const isBusy = $derived(
		isUploading ||
			status?.status === 'uploading' ||
			status?.status === 'processing'
	);
	const fileMatchesSession = $derived(
		(() => {
			if (!status || !selectedFile) return null;
			if (!status.fileName && !status.fileSize) return null;
			const nameMatch = !status.fileName || status.fileName === selectedFile.name;
			const sizeMatch = !status.fileSize || status.fileSize === selectedFile.size;
			const lmMatch =
				!status.fileLastModified ||
				status.fileLastModified === selectedFile.lastModified;
			return nameMatch && sizeMatch && lmMatch;
		})()
	);

	function pushLog(line: string) {
		const ts = new Date().toLocaleTimeString();
		logLines = [...logLines.slice(-49), `[${ts}] ${line}`];
	}

	function persistSession(s: SessionResp | null, st?: StatusResp | null) {
		if (typeof window === 'undefined') return;
		try {
			if (!s) {
				localStorage.removeItem(STORAGE_KEY(id));
				return;
			}
			localStorage.setItem(
				STORAGE_KEY(id),
				JSON.stringify({
					uploadId: s.uploadId,
					expiresAt: s.expiresAt,
					initialResolution: s.initialResolution,
					fileName: st?.fileName ?? null,
					fileSize: st?.fileSize ?? null,
					fileLastModified: st?.fileLastModified ?? null
				})
			);
		} catch {
			// quota / private mode — ignore
		}
	}

	function readPersistedSession(): {
		uploadId: string;
		expiresAt: string;
		initialResolution: number;
	} | null {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem(STORAGE_KEY(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed?.uploadId) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	async function loadEpisode() {
		isLoading = true;
		try {
			episode = (await adminApi<Episode>(`/episodes/${id}`)).data;
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat episode');
		} finally {
			isLoading = false;
		}
	}

	function adoptStatus(data: StatusResp) {
		status = data;
		if (data.initialResolution && RESOLUTION_OPTIONS.includes(data.initialResolution as any)) {
			initialResolution = data.initialResolution;
		}
		if (data.status === 'processing' || data.status === 'uploading') {
			startPolling();
		}
		persistSession(session, data);
	}

	async function fetchStatus(uploadId: string): Promise<StatusResp | null> {
		try {
			const res = await auth.authFetch(`/api/upload/${uploadId}/status`);
			if (!res.ok) return null;
			const json = await res.json();
			return (json?.data ?? null) as StatusResp | null;
		} catch {
			return null;
		}
	}

	async function fetchActiveSession(): Promise<StatusResp | null> {
		try {
			const res = await auth.authFetch(`/api/upload/active?episodeId=${id}`);
			if (!res.ok) return null;
			const json = await res.json();
			return (json?.data ?? null) as StatusResp | null;
		} catch {
			return null;
		}
	}

	async function requestSession(force = false): Promise<SessionResp | null> {
		if (session && !force && !sessionExpired) return session;
		const sesid = `${id}/upload`;
		try {
			const res = await auth.authFetch(`/api/upload/session`, {
				method: 'POST',
				body: JSON.stringify({
					sesid,
					episodeId: id,
					initialResolution
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal membuat session');
			session = json.data as SessionResp;
			pushLog(`Session dibuat: ${session.uploadId}`);
			await refreshStatus();
			persistSession(session, status);
			return session;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			adminToast.error(message);
			pushLog(`ERR session: ${message}`);
			return null;
		}
	}

	async function recoverOrCreateSession() {
		// 1. Try persisted localStorage uploadId.
		const persisted = readPersistedSession();
		if (persisted?.uploadId) {
			const data = await fetchStatus(persisted.uploadId);
			if (
				data &&
				data.status !== 'completed' &&
				data.status !== 'failed' &&
				data.status !== 'expired'
			) {
				session = {
					uploadId: data.uploadId,
					uploadUrl: `/api/upload/${data.uploadId}/chunk`,
					statusUrl: `/api/upload/${data.uploadId}/status`,
					completeUrl: `/api/upload/${data.uploadId}/complete`,
					expiresAt: data.expiresAt,
					initialResolution: data.initialResolution ?? initialResolution
				};
				adoptStatus(data);
				pushLog(`Resume session ${data.uploadId} (${data.status})`);
				return;
			}
			// stale, drop
			persistSession(null);
		}

		// 2. Ask backend for any active session for this episode.
		const active = await fetchActiveSession();
		if (active) {
			session = {
				uploadId: active.uploadId,
				uploadUrl: `/api/upload/${active.uploadId}/chunk`,
				statusUrl: `/api/upload/${active.uploadId}/status`,
				completeUrl: `/api/upload/${active.uploadId}/complete`,
				expiresAt: active.expiresAt,
				initialResolution: active.initialResolution ?? initialResolution
			};
			adoptStatus(active);
			pushLog(`Recovered active session ${active.uploadId} dari server (${active.status})`);
			return;
		}

		// 3. Otherwise create a fresh one.
		await requestSession(true);
	}

	async function refreshStatus() {
		if (!session) return;
		const data = await fetchStatus(session.uploadId);
		if (!data) return;
		adoptStatus(data);
	}

	function startPolling() {
		stopPolling();
		pollTimer = setInterval(refreshStatus, 1500);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function uploadChunk(file: File, index: number, total: number) {
		if (!session) throw new Error('Session belum dibuat');
		const start = index * CHUNK_SIZE;
		const end = Math.min(file.size, start + CHUNK_SIZE);
		const blob = file.slice(start, end);

		const form = new FormData();
		form.append('chunkIndex', String(index));
		form.append('totalChunks', String(total));
		form.append('fileName', file.name);
		form.append('fileSize', String(file.size));
		form.append('fileLastModified', String(file.lastModified));
		form.append('initialResolution', String(initialResolution));
		form.append('chunk', blob, `${file.name}.part${index}`);

		const res = await auth.authFetch(`/api/upload/${session.uploadId}/chunk`, {
			method: 'POST',
			body: form
		});

		if (res.status === 410) {
			throw new Error('SESSION_EXPIRED');
		}
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`Chunk ${index} gagal: ${res.status} ${text.slice(0, 120)}`);
		}
	}

	async function completeUpload() {
		if (!session) return;
		const res = await auth.authFetch(`/api/upload/${session.uploadId}/complete`, {
			method: 'POST'
		});
		const json = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(json?.message ?? 'Gagal menyelesaikan upload');
		}
		pushLog('Upload selesai, encoding mulai...');
	}

	async function startUpload() {
		if (!selectedFile) {
			adminToast.error('Pilih file video dulu');
			return;
		}
		if (isUploading) return;

		// Mismatch warning if user picked a different file than the one stored in session.
		if (status && status.fileName && fileMatchesSession === false) {
			const ok = window.confirm(
				`Session ini sudah punya file "${status.fileName}" (${formatBytes(status.fileSize ?? 0)}).\n` +
					`File yang kamu pilih sekarang berbeda — chunk lama akan dibuang dan upload ulang dari awal. Lanjutkan?`
			);
			if (!ok) return;
		}

		isUploading = true;
		abortRequested = false;

		try {
			let active = await requestSession(false);
			if (!active) return;

			await refreshStatus();
			const total = Math.ceil(selectedFile.size / CHUNK_SIZE);
			const safeToResume =
				fileMatchesSession !== false && (status?.receivedChunkIndexes?.length ?? 0) > 0;
			const uploadedSet = new Set<number>(
				safeToResume ? (status?.receivedChunkIndexes ?? []) : []
			);
			pushLog(`Upload ${total} chunk (sudah ada di server: ${uploadedSet.size})`);

			startPolling();

			for (let i = 0; i < total; i++) {
				if (abortRequested) {
					pushLog('Upload dibatalkan user');
					break;
				}
				if (uploadedSet.has(i)) continue;
				try {
					await uploadChunk(selectedFile, i, total);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					if (msg === 'SESSION_EXPIRED') {
						pushLog('Session expired, membuat session baru...');
						session = null;
						persistSession(null);
						active = await requestSession(true);
						if (!active) throw error;
						i = -1;
						uploadedSet.clear();
						continue;
					}
					pushLog(`Retry chunk ${i}: ${msg}`);
					await new Promise((r) => setTimeout(r, 1000));
					await uploadChunk(selectedFile, i, total);
				}
			}

			if (!abortRequested) {
				await completeUpload();
				pushLog('Menunggu encoding & R2 upload...');
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			adminToast.error(msg);
			pushLog(`ERR: ${msg}`);
		} finally {
			isUploading = false;
			await refreshStatus();
		}
	}

	async function resumeUpload() {
		if (!session) {
			await requestSession();
		}
		await refreshStatus();
		await startUpload();
	}

	function setFile(file: File | undefined) {
		if (!file) return;
		selectedFile = file;
	}

	function pickFile() {
		fileInput?.click();
	}

	function handleInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setFile(input.files?.[0]);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		setFile(event.dataTransfer?.files?.[0]);
	}

	function formatBytes(bytes: number) {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const sizeIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const size = bytes / 1024 ** sizeIndex;
		return `${size.toFixed(size >= 10 || sizeIndex === 0 ? 0 : 1)} ${units[sizeIndex]}`;
	}

	function resetFile() {
		selectedFile = null;
		if (fileInput) fileInput.value = '';
	}

	function abortUpload() {
		abortRequested = true;
		isAborting = true;
		setTimeout(() => (isAborting = false), 1500);
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!isBusy) return;
		event.preventDefault();
	}

	$effect(() => {
		if (!status) return;
		if (
			status.status === 'completed' ||
			status.status === 'failed' ||
			status.status === 'expired'
		) {
			stopPolling();
		}
		if (status.status === 'completed') {
			persistSession(null);
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		if (isBusy) {
			window.addEventListener('beforeunload', handleBeforeUnload);
			return () => window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	});

	beforeNavigate((nav) => {
		if (!isBusy) return;
		const reason =
			isUploading || status?.status === 'uploading'
				? 'Upload masih berjalan — kalau pindah halaman, upload akan terputus.'
				: 'Encoding masih berjalan — kamu bisa pindah halaman, progress tetap jalan di server. Yakin pindah?';
		const ok = window.confirm(`${reason}\n\nLanjut keluar dari halaman upload?`);
		if (!ok) nav.cancel();
	});

	onMount(async () => {
		await loadEpisode();
		await recoverOrCreateSession();
	});

	onDestroy(() => {
		stopPolling();
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	});
</script>

<div class="mx-auto max-w-6xl space-y-5">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<button
			type="button"
			onclick={() => goto('/admin/episodes')}
			class="inline-flex w-fit items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300"
		>
			<span class="material-symbols-rounded text-[18px]">arrow_back</span>
			Kembali ke Episode
		</button>
		{#if episode}
			<a
				href="/admin/episodes/{episode.id}"
				class="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
			>
				<span class="material-symbols-rounded text-[18px]">edit</span>
				Edit Episode
			</a>
		{/if}
	</div>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<span class="material-symbols-rounded text-violet-300">cloud_upload</span>
					<span
						class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300"
					>
						HLS Pipeline
					</span>
				</div>
				<h2 class="text-2xl font-black">Video Uploader</h2>
				<p class="mt-1 text-sm text-zinc-500">
					{#if isLoading}
						Memuat episode...
					{:else if episode}
						Ep {episode.number} - {episode.title}
					{:else}
						Episode tidak ditemukan
					{/if}
				</p>
			</div>
			<div class="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[460px]">
				<div class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-500">Episode ID</p>
					<p class="mt-1 font-bold text-zinc-100">{id}</p>
				</div>
				<div class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-500">Server</p>
					<p class="mt-1 font-bold text-zinc-100">{serverCount}</p>
				</div>
				<div class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
					<p class="text-[11px] font-black uppercase tracking-widest text-zinc-500">Status</p>
					<p class="mt-1 font-bold text-zinc-100 capitalize">
						{status?.status ?? episode?.status ?? '-'}
					</p>
				</div>
			</div>
		</div>
	</section>

	<div class="grid gap-5 xl:grid-cols-[1fr_360px]">
		<form
			onsubmit={(event) => {
				event.preventDefault();
				startUpload();
			}}
			class="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
		>
			<div>
				<h3 class="text-lg font-black">File Video</h3>
				<p class="text-sm text-zinc-500">
					Chunk {formatBytes(CHUNK_SIZE)} per request, resume otomatis bila terputus.
				</p>
			</div>

			{#if status && (status.status === 'uploading' || status.status === 'processing') && status.fileName}
				<div
					class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
				>
					<div class="flex items-start gap-2">
						<span class="material-symbols-rounded mt-0.5 text-amber-300 text-[18px]">history</span>
						<div class="flex-1 space-y-1">
							<p class="font-black text-amber-100">
								Session aktif dipulihkan
							</p>
							<p class="text-xs text-amber-200/80">
								File <span class="font-mono">{status.fileName}</span>
								{status.fileSize ? `(${formatBytes(status.fileSize)})` : ''}
								— {status.status === 'uploading'
									? `${status.receivedChunks}/${status.totalChunks ?? '?'} chunk sudah di server`
									: 'sedang di-encode di server, kamu boleh tunggu di sini'}.
								{#if !selectedFile}
									Pilih file yang sama untuk lanjut upload, atau pilih file lain untuk mulai dari awal.
								{/if}
							</p>
							{#if selectedFile && fileMatchesSession === false}
								<p class="mt-1 rounded bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-300">
									File yang dipilih berbeda dari yang ada di session — mulai upload akan
									menghapus chunk lama.
								</p>
							{:else if selectedFile && fileMatchesSession === true}
								<p class="mt-1 rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-300">
									File cocok — upload akan dilanjut dari chunk yang sudah ada.
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<input
				bind:this={fileInput}
				type="file"
				accept="video/*"
				class="hidden"
				onchange={handleInput}
			/>

			<button
				type="button"
				ondragover={(event) => {
					event.preventDefault();
					isDragging = true;
				}}
				ondragleave={() => (isDragging = false)}
				ondrop={handleDrop}
				onclick={pickFile}
				disabled={isUploading}
				class="flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition disabled:cursor-not-allowed disabled:opacity-60
					{isDragging
					? 'border-violet-400 bg-violet-500/10 text-violet-100'
					: 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-violet-500/70 hover:bg-violet-500/5'}"
			>
				<span class="material-symbols-rounded mb-3 text-5xl text-violet-300">upload_file</span>
				{#if fileMeta}
					<span class="max-w-full truncate text-base font-black">{fileMeta.name}</span>
					<span class="mt-1 text-sm font-semibold text-zinc-500">
						{fileMeta.size} - {fileMeta.type} - {totalChunks} chunk
					</span>
				{:else}
					<span class="text-base font-black">Pilih atau drop video</span>
					<span class="mt-1 text-sm font-semibold text-zinc-500">MP4, MKV, WEBM</span>
				{/if}
			</button>

			<div class="grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">Initial Resolution</span>
					<select
						bind:value={initialResolution}
						disabled={isUploading}
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm disabled:cursor-not-allowed"
					>
						{#each RESOLUTION_OPTIONS as res}
							<option value={res}>{res}p</option>
						{/each}
					</select>
				</label>
				<div class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">Upload Session</span>
					<div
						class="flex h-10 items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono"
					>
						<span class="truncate text-zinc-300">{session?.uploadId ?? '—'}</span>
						<span class="ml-2 shrink-0 font-bold {sessionExpired ? 'text-red-400' : 'text-emerald-400'}">
							{sessionExpired ? 'expired' : `${Math.max(0, Math.floor(expiresInMs / 60000))}m`}
						</span>
					</div>
				</div>
			</div>

			{#if status}
				<div class="grid gap-3 md:grid-cols-3">
					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
						<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Upload</p>
						<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
							<div
								class="h-full bg-violet-500 transition-all"
								style="width: {status.uploadProgress}%"
							></div>
						</div>
						<p class="mt-1 text-xs font-bold text-zinc-300">
							{status.uploadProgress.toFixed(1)}% ({status.receivedChunks}/{status.totalChunks ?? 0})
						</p>
					</div>
					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
						<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Encoding</p>
						<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
							<div
								class="h-full bg-amber-500 transition-all"
								style="width: {status.encodingProgress}%"
							></div>
						</div>
						<p class="mt-1 text-xs font-bold text-zinc-300">
							{status.encodingProgress.toFixed(1)}%
							{status.currentResolution ? `→ ${status.currentResolution}p` : ''}
						</p>
					</div>
					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
						<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">R2 Upload</p>
						<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
							<div
								class="h-full bg-emerald-500 transition-all"
								style="width: {status.r2UploadProgress}%"
							></div>
						</div>
						<p class="mt-1 text-xs font-bold text-zinc-300">
							{status.r2UploadProgress.toFixed(1)}%
						</p>
					</div>
				</div>

				{#if status.resolutionsCompleted.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each status.resolutionsCompleted as res}
							<span
								class="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
							>
								<span class="material-symbols-rounded text-[14px]">check_circle</span>
								{res}p
							</span>
						{/each}
					</div>
				{/if}

				{#if status.masterPlaylistUrl}
					<div class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
						<p class="font-black text-emerald-200">Master playlist siap</p>
						<a
							href={status.masterPlaylistUrl}
							target="_blank"
							rel="noopener"
							class="mt-1 block break-all font-mono text-xs text-emerald-300 hover:underline"
						>
							{status.masterPlaylistUrl}
						</a>
					</div>
				{/if}

				{#if status.errorMessage}
					<div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
						<p class="font-black text-red-200">Encoding error</p>
						<p class="mt-1 text-xs text-red-300">{status.errorMessage}</p>
					</div>
				{/if}
			{/if}

			<div class="flex flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={resetFile}
					disabled={isUploading}
					class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Reset File
				</button>
				{#if isUploading}
					<button
						type="button"
						onclick={abortUpload}
						disabled={isAborting}
						class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
					>
						{isAborting ? 'Membatalkan...' : 'Batalkan'}
					</button>
				{:else if status && status.status === 'uploading'}
					<button
						type="button"
						onclick={resumeUpload}
						class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-amber-400"
					>
						Resume Upload
					</button>
				{:else}
					<button
						disabled={!selectedFile || sessionExpired}
						class="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<span class="material-symbols-rounded text-[18px]">cloud_upload</span>
						Mulai Upload
					</button>
				{/if}
			</div>
		</form>

		<aside class="space-y-4">
			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h3 class="text-lg font-black">Episode Target</h3>
				{#if isLoading}
					<div class="mt-4 space-y-2">
						<div class="h-5 animate-pulse rounded bg-zinc-800"></div>
						<div class="h-5 animate-pulse rounded bg-zinc-800"></div>
						<div class="h-5 animate-pulse rounded bg-zinc-800"></div>
					</div>
				{:else if episode}
					<div class="mt-4 space-y-3 text-sm">
						<div>
							<p class="text-xs font-bold text-zinc-500">Anime</p>
							<p class="mt-1 font-bold text-zinc-100">{episode.anime?.title ?? episode.animeId}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-zinc-500">Episode</p>
							<p class="mt-1 font-bold text-zinc-100">Ep {episode.number} - {episode.title}</p>
						</div>
						<div>
							<p class="text-xs font-bold text-zinc-500">Slug</p>
							<p class="mt-1 break-all font-mono text-xs text-zinc-300">{episode.slug}</p>
						</div>
					</div>
				{:else}
					<p class="mt-3 text-sm font-semibold text-zinc-500">Data episode kosong.</p>
				{/if}
			</section>

			<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-black">Activity</h3>
					{#if logLines.length > 0}
						<button
							type="button"
							onclick={() => (logLines = [])}
							class="text-xs font-bold text-zinc-500 hover:text-zinc-300"
						>
							Clear
						</button>
					{/if}
				</div>
				<div
					class="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400"
				>
					{#if logLines.length === 0}
						<p class="text-zinc-600">Belum ada aktivitas.</p>
					{:else}
						{#each logLines as line}
							<p class="break-all">{line}</p>
						{/each}
					{/if}
				</div>
			</section>
		</aside>
	</div>
</div>
