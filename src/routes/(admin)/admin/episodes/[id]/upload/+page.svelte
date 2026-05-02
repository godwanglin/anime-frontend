<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import { auth } from '$lib/stores/auth.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import config from '$lib/config';

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

	type UrlSourceInput = { resolution: number; url: string };
	type UrlSubtitleInput = { language: string; label: string; sourceUrl: string };
	type SignalRecord = {
		id: string;
		url: string;
		type: string;
		source?: string;
		method?: string;
		contentType?: string;
		pageUrl?: string;
		statusCode?: number;
		requestId?: string;
		capturedAt?: number;
		receivedAt: string;
	};
	type SignalGroupKey = 'playlist' | 'subtitle' | 'video' | 'audio' | 'segment' | 'other';
	type SignalAnalysis = {
		url: string;
		resolution: number | null;
		bandwidth: number | null;
		sampleSizeBytes: number | null;
		sampleDurationSeconds: number | null;
		sampleSegmentUrl: string | null;
		detectedFrom: string;
		error?: string;
	};
	type SubtitleAnalysis = {
		url: string;
		language: string;
		label: string;
		confidence: number;
		detectedFrom: string;
		sampleCueCount: number;
		sampleText: string;
		error?: string;
	};
	type UrlSourceProgress = {
		resolution: number;
		url: string;
		totalSegments: number | null;
		completedSegments: number;
		status: 'pending' | 'fetching-playlist' | 'uploading' | 'completed' | 'failed';
		errorMessage?: string | null;
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
		mode?: 'file' | 'url';
		expiresAt: string;
		totalChunks: number | null;
		receivedChunks: number;
		receivedChunkIndexes?: number[];
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
		urlSources?: UrlSourceInput[] | null;
		urlProgress?: UrlSourceProgress[] | null;
		encodingLogs?: EncodingLog[];
	};

	type EncodingLog = {
		at: string;
		level: 'info' | 'warn' | 'error';
		message: string;
	};

	const RESOLUTION_OPTIONS = [144, 240, 360, 480, 720, 1080, 2160] as const;
	const RESOLUTION_LABELS: Record<number, string> = {
		144: '144p',
		240: '240p',
		360: '360p',
		480: '480p',
		720: '720p',
		1080: '1080p',
		2160: '4K (2160p)'
	};
	const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
	const STORAGE_KEY = (episodeId: number) => `upload-session:${episodeId}`;
	const URL_STORAGE_KEY = (episodeId: number) => `upload-url-session:${episodeId}`;
	const URL_SUBTITLE_STORAGE_KEY = (episodeId: number) => `upload-url-subtitles:${episodeId}`;

	type Tab = 'file' | 'url';
	let id = $derived(Number(page.params.id));
	let activeTab = $state<Tab>('file');
	let episode = $state<Episode | null>(null);
	let isLoading = $state(true);

	// ── File-mode state ────────────────────────────────────────────────────
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement | null = null;

	let initialResolution = $state<number>(1080);
	let session = $state<SessionResp | null>(null);
	let status = $state<StatusResp | null>(null);
	let receivedChunkIndexes = $state<number[]>([]);
	let isUploading = $state(false);
	let isAborting = $state(false);
	let abortRequested = $state(false);
	let logLines = $state<string[]>([]);
	let serverLogs = $state<EncodingLog[]>([]);
	let eventSource: EventSource | null = null;

	// ── URL-mode state ─────────────────────────────────────────────────────
	let urlSources = $state<UrlSourceInput[]>([{ resolution: 1080, url: '' }]);
	let urlSubtitles = $state<UrlSubtitleInput[]>([
		{ language: 'id', label: 'Bahasa Indonesia', sourceUrl: '' }
	]);
	let isUrlBusy = $state(false);
	let abortUrlRequested = $state(false);
	let signals = $state<SignalRecord[]>([]);
	let signalStatus = $state<'idle' | 'connecting' | 'connected' | 'error'>('idle');
	let signalError = $state('');
	let signalStream: EventSource | null = null;
	let signalStreamToken = 0;
	let isAnalyzingSignals = $state(false);
	let signalAnalyses = $state<SignalAnalysis[]>([]);
	let isAnalyzingSubtitles = $state(false);
	let subtitleAnalyses = $state<SubtitleAnalysis[]>([]);

	// ── Derived ────────────────────────────────────────────────────────────
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
			isUrlBusy ||
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
	const serverLogLines = $derived(
		serverLogs.map((entry) => {
			const time = Number.isNaN(new Date(entry.at).getTime())
				? entry.at
				: new Date(entry.at).toLocaleTimeString();
			const level = entry.level === 'error' ? 'ERR' : entry.level === 'warn' ? 'WARN' : 'INFO';
			return `[${time}] ${level} ${entry.message}`;
		})
	);
	const activityLines = $derived([...serverLogLines, ...logLines].slice(-220));
	const signalGroups = $derived(
		(() => {
			const order: SignalGroupKey[] = ['playlist', 'subtitle', 'video', 'audio', 'segment', 'other'];
			const grouped = new Map<SignalGroupKey, SignalRecord[]>();
			for (const key of order) grouped.set(key, []);
			for (const signal of signals) {
				const key = getSignalGroup(signal);
				grouped.get(key)?.push(signal);
			}
			return order
				.map((key) => ({ key, label: getSignalGroupLabel(key), items: grouped.get(key) ?? [] }))
				.filter((group) => group.items.length > 0);
		})()
	);
	const playlistSignals = $derived(signals.filter((signal) => getSignalGroup(signal) === 'playlist'));
	const subtitleSignals = $derived(signals.filter((signal) => getSignalGroup(signal) === 'subtitle'));

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

	function persistUrlSources(sources: UrlSourceInput[]) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(URL_STORAGE_KEY(id), JSON.stringify(sources));
		} catch {
			// ignore
		}
	}

	function persistUrlSubtitles(subtitles: UrlSubtitleInput[]) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(URL_SUBTITLE_STORAGE_KEY(id), JSON.stringify(subtitles));
		} catch {
			// ignore
		}
	}

	function readPersistedUrlSources(): UrlSourceInput[] | null {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem(URL_STORAGE_KEY(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return null;
			return parsed.filter(
				(item: any) =>
					item &&
					typeof item.url === 'string' &&
					RESOLUTION_OPTIONS.includes(item.resolution)
			);
		} catch {
			return null;
		}
	}

	function readPersistedUrlSubtitles(): UrlSubtitleInput[] | null {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem(URL_SUBTITLE_STORAGE_KEY(id));
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return null;
			return parsed.filter(
				(item: any) =>
					item &&
					typeof item.language === 'string' &&
					typeof item.label === 'string' &&
					typeof item.sourceUrl === 'string'
			);
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
		if (Array.isArray(data.receivedChunkIndexes)) {
			receivedChunkIndexes = data.receivedChunkIndexes;
		}
		if (data.mode === 'url') {
			activeTab = 'url';
			if (Array.isArray(data.urlSources) && data.urlSources.length > 0) {
				urlSources = data.urlSources.map((src) => ({
					resolution: src.resolution,
					url: src.url
				}));
			}
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

	function buildSessionFromStatus(data: StatusResp): SessionResp {
		return {
			uploadId: data.uploadId,
			uploadUrl: `/api/upload/${data.uploadId}/chunk`,
			statusUrl: `/api/upload/${data.uploadId}/status`,
			completeUrl: `/api/upload/${data.uploadId}/complete`,
			expiresAt: data.expiresAt,
			initialResolution: data.initialResolution ?? initialResolution
		};
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
			openEventStream(session.uploadId);
			return session;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			adminToast.error(message);
			pushLog(`ERR session: ${message}`);
			return null;
		}
	}

	async function recoverOrCreateSession() {
		const persisted = readPersistedSession();
		if (persisted?.uploadId) {
			const data = await fetchStatus(persisted.uploadId);
			if (
				data &&
				data.status !== 'completed' &&
				data.status !== 'failed' &&
				data.status !== 'expired'
			) {
				session = buildSessionFromStatus(data);
				adoptStatus(data);
				openEventStream(data.uploadId);
				pushLog(`Resume session ${data.uploadId} (${data.status}, mode=${data.mode ?? 'file'})`);
				return;
			}
			persistSession(null);
		}

		const active = await fetchActiveSession();
		if (active) {
			session = buildSessionFromStatus(active);
			adoptStatus(active);
			openEventStream(active.uploadId);
			pushLog(`Recovered active session ${active.uploadId} dari server (${active.status})`);
			return;
		}
	}

	async function refreshStatus() {
		if (!session) return;
		const data = await fetchStatus(session.uploadId);
		if (!data) return;
		adoptStatus(data);
	}

	// ── SSE ────────────────────────────────────────────────────────────────
	function closeEventStream() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	function openEventStream(uploadId: string) {
		closeEventStream();
		if (typeof window === 'undefined') return;
		const token = auth.accessToken;
		if (!token) return;
		const url = `${config.API_BASE_URL}/api/upload/${uploadId}/events?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url, { withCredentials: true });
		eventSource = es;

		es.addEventListener('snapshot', (evt) => {
			try {
				const payload = JSON.parse((evt as MessageEvent).data);
				if (payload?.session) {
					adoptStatus({
						...payload.session,
						encodingLogs: payload.logs ?? []
					});
				}
				if (Array.isArray(payload?.logs)) {
					serverLogs = payload.logs;
				}
			} catch {
				// ignore
			}
		});

		es.addEventListener('status', (evt) => {
			try {
				const payload = JSON.parse((evt as MessageEvent).data) as StatusResp;
				adoptStatus(payload);
			} catch {
				// ignore
			}
		});

		es.addEventListener('log', (evt) => {
			try {
				const entry = JSON.parse((evt as MessageEvent).data) as EncodingLog;
				if (entry?.at && entry?.message) {
					serverLogs = [...serverLogs.slice(-199), entry];
				}
			} catch {
				// ignore
			}
		});

		es.onerror = () => {
			// EventSource auto-reconnects with exponential backoff. We just log.
			// If the server closed because session is completed, the next reconnect
			// returns the final snapshot then idles.
		};
	}

	// ── File-mode upload (existing) ────────────────────────────────────────
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
		// Update local set so resume logic is correct without polling.
		if (!receivedChunkIndexes.includes(index)) {
			receivedChunkIndexes = [...receivedChunkIndexes, index].sort((a, b) => a - b);
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
				fileMatchesSession !== false && receivedChunkIndexes.length > 0;
			const uploadedSet = new Set<number>(safeToResume ? receivedChunkIndexes : []);
			pushLog(`Upload ${total} chunk (sudah ada di server: ${uploadedSet.size})`);

			for (let i = 0; i < total; i++) {
				if (abortRequested) {
					pushLog('Upload dibatalkan user');
					break;
				}
				if (uploadedSet.has(i)) continue;
				try {
					await uploadChunk(selectedFile, i, total);
					uploadedSet.add(i);
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
						receivedChunkIndexes = [];
						continue;
					}
					pushLog(`Retry chunk ${i}: ${msg}`);
					await new Promise((r) => setTimeout(r, 1000));
					await uploadChunk(selectedFile, i, total);
					uploadedSet.add(i);
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

	function getSignalGroup(signal: SignalRecord): SignalGroupKey {
		const haystack = `${signal.type} ${signal.contentType ?? ''} ${signal.url}`.toLowerCase();
		if (
			haystack.includes('playlist') ||
			haystack.includes('mpegurl') ||
			haystack.includes('m3u8') ||
			haystack.includes('dash') ||
			/\.m3u8?(\?|#|$)/i.test(signal.url) ||
			/\.mpd(\?|#|$)/i.test(signal.url)
		) {
			return 'playlist';
		}
		if (
			haystack.includes('subtitle') ||
			haystack.includes('text/vtt') ||
			/\.(vtt|srt|ass|ssa|ttml)(\?|#|$)/i.test(signal.url)
		) {
			return 'subtitle';
		}
		if (
			haystack.includes('video') ||
			/\.(mp4|webm|mkv|mov|m4v)(\?|#|$)/i.test(signal.url)
		) {
			return 'video';
		}
		if (haystack.includes('audio') || /\.(mp3|m4a|aac|ogg|wav)(\?|#|$)/i.test(signal.url)) {
			return 'audio';
		}
		if (/\.(ts|m4s|cmfv|cmfa)(\?|#|$)/i.test(signal.url)) {
			return 'segment';
		}
		return 'other';
	}

	function getSignalGroupLabel(key: SignalGroupKey) {
		const labels: Record<SignalGroupKey, string> = {
			playlist: 'Playlist / Manifest',
			subtitle: 'Subtitle',
			video: 'Video',
			audio: 'Audio',
			segment: 'Segment',
			other: 'Response Lain'
		};
		return labels[key];
	}

	function getSignalIcon(key: SignalGroupKey) {
		const icons: Record<SignalGroupKey, string> = {
			playlist: 'playlist_play',
			subtitle: 'subtitles',
			video: 'movie',
			audio: 'graphic_eq',
			segment: 'view_stream',
			other: 'data_object'
		};
		return icons[key];
	}

	function formatSignalTime(signal: SignalRecord) {
		const raw = signal.receivedAt || signal.capturedAt;
		const date = raw ? new Date(raw) : null;
		return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString() : '-';
	}

	function formatBitrate(bps: number | null) {
		if (!bps) return '-';
		if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
		return `${Math.round(bps / 1_000)} Kbps`;
	}

	function formatConfidence(value: number) {
		return `${Math.round(value * 100)}%`;
	}

	function inferResolutionFromSignalUrl(url: string): number | null {
		const match = url.match(/\.f(\d{6})\.ts\.m3u8/i);
		if (!match) return null;
		const wetvMap: Record<string, number> = {
			'007': 144,
			'004': 360,
			'003': 480,
			'002': 720,
			'001': 1080
		};
		return wetvMap[match[1].slice(-3)] ?? null;
	}

	function mergeSignals(incoming: SignalRecord[]) {
		const map = new Map<string, SignalRecord>();
		for (const signal of [...signals, ...incoming]) {
			if (!signal?.url) continue;
			const key = signal.id || `${signal.type}:${signal.url}`;
			map.set(key, signal);
		}
		signals = Array.from(map.values())
			.sort((a, b) => {
				const aTime = new Date(a.receivedAt).getTime() || a.capturedAt || 0;
				const bTime = new Date(b.receivedAt).getTime() || b.capturedAt || 0;
				return bTime - aTime;
			})
			.slice(0, 80);
	}

	async function loadSignals() {
		try {
			const res = await fetch(`${config.API_BASE_URL}/api/signals`);
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal memuat signal');
			mergeSignals(Array.isArray(json?.data) ? json.data : []);
			signalError = '';
		} catch (error) {
			signalError = error instanceof Error ? error.message : String(error);
			signalStatus = 'error';
		}
	}

	function closeSignalStream() {
		signalStreamToken += 1;
		signalStream?.close();
		signalStream = null;
		if (signalStatus === 'connected' || signalStatus === 'connecting') {
			signalStatus = 'idle';
		}
	}

	function openSignalStream() {
		if (typeof window === 'undefined') return;
		closeSignalStream();
		const token = signalStreamToken;
		signalStatus = 'connecting';
		signalError = '';
		const stream = new EventSource(`${config.API_BASE_URL}/api/signals/stream`);
		signalStream = stream;
		stream.addEventListener('ready', (event) => {
			if (token !== signalStreamToken || stream !== signalStream) return;
			try {
				const payload = JSON.parse((event as MessageEvent).data);
				mergeSignals(Array.isArray(payload?.signals) ? payload.signals : []);
				signalStatus = 'connected';
			} catch {
				signalError = 'Payload signal tidak valid.';
			}
		});
		stream.addEventListener('signal', (event) => {
			if (token !== signalStreamToken || stream !== signalStream) return;
			try {
				const signal = JSON.parse((event as MessageEvent).data) as SignalRecord;
				mergeSignals([signal]);
				signalStatus = 'connected';
			} catch {
				signalError = 'Payload signal tidak valid.';
			}
		});
		stream.addEventListener('clear', () => {
			if (token !== signalStreamToken || stream !== signalStream) return;
			signals = [];
			signalStatus = 'connected';
		});
		stream.onerror = () => {
			if (token !== signalStreamToken || stream !== signalStream) return;
			signalStatus = 'error';
			signalError = 'Koneksi signal putus, klik Terima Signal untuk sambung ulang.';
		};
	}

	function useSignal(signal: SignalRecord) {
		const group = getSignalGroup(signal);
		activeTab = 'url';
		if (group === 'subtitle') {
			const next = [...urlSubtitles];
			const emptyIndex = next.findIndex((item) => !item.sourceUrl.trim());
			const subtitle = {
				language: 'id',
				label: 'Signal Subtitle',
				sourceUrl: signal.url
			};
			if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], ...subtitle };
			else next.push(subtitle);
			urlSubtitles = next;
			adminToast.success('Signal subtitle masuk ke form');
			return;
		}
		if (group === 'playlist') {
			const next = [...urlSources];
			const emptyIndex = next.findIndex((item) => !item.url.trim());
			const source = { resolution: pickNextResolution(), url: signal.url };
			if (emptyIndex >= 0) next[emptyIndex] = { ...next[emptyIndex], url: signal.url };
			else next.push(source);
			urlSources = next;
			adminToast.success('Signal playlist masuk ke form');
			return;
		}
		copySignalUrl(signal);
	}

	async function copySignalUrl(signal: SignalRecord) {
		try {
			await navigator.clipboard.writeText(signal.url);
			adminToast.success('URL signal disalin');
		} catch {
			adminToast.info('Browser tidak bisa copy otomatis');
		}
	}

	async function clearSignals() {
		if (signals.length === 0) return;
		const okToClear = window.confirm(
			`Hapus ${signals.length} signal dari receiver extension? Data ini akan hilang dari buffer backend.`
		);
		if (!okToClear) return;

		try {
			const res = await fetch(`${config.API_BASE_URL}/api/signals`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal clear signals');
			signals = [];
			adminToast.success('Signals dibersihkan');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal clear signals');
		}
	}

	async function autoDetectSignals() {
		const urls = playlistSignals.map((signal) => signal.url);
		if (urls.length === 0) {
			signalAnalyses = [];
			return;
		}
		isAnalyzingSignals = true;
		try {
			const res = await fetch(`${config.API_BASE_URL}/api/signals/analyze`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal auto detect signal');
			const analyses = (Array.isArray(json?.data) ? json.data : []) as SignalAnalysis[];
			signalAnalyses = analyses;
			const detected = analyses
				.map((item) => ({
					resolution: item.resolution ?? inferResolutionFromSignalUrl(item.url),
					url: item.url
				}))
				.filter(
					(item): item is UrlSourceInput =>
						typeof item.resolution === 'number' &&
						RESOLUTION_OPTIONS.includes(item.resolution as any) &&
						/^https?:\/\//i.test(item.url)
				);
			if (detected.length === 0) {
				return;
			}
			const byResolution = new Map<number, string>();
			for (const item of detected) byResolution.set(item.resolution, item.url);
			urlSources = Array.from(byResolution.entries())
				.sort((a, b) => b[0] - a[0])
				.map(([resolution, url]) => ({ resolution, url }));
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal auto detect signal');
		} finally {
			isAnalyzingSignals = false;
		}
	}

	async function autoDetectSubtitles() {
		const urls = subtitleSignals.map((signal) => signal.url);
		if (urls.length === 0) {
			subtitleAnalyses = [];
			return;
		}
		isAnalyzingSubtitles = true;
		try {
			const res = await fetch(`${config.API_BASE_URL}/api/signals/analyze-subtitles`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ urls })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal auto detect subtitle');
			const analyses = (Array.isArray(json?.data) ? json.data : []) as SubtitleAnalysis[];
			subtitleAnalyses = analyses;
			const detected = analyses
				.filter((item) => item.language && item.language !== 'unknown' && item.confidence >= 0.45)
				.map((item) => ({
					language: item.language,
					label: item.label || item.language.toUpperCase(),
					sourceUrl: item.url
				}));
			if (detected.length === 0) {
				return;
			}
			const byLanguage = new Map<string, UrlSubtitleInput>();
			for (const item of detected) byLanguage.set(item.language, item);
			urlSubtitles = Array.from(byLanguage.values());
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal auto detect subtitle');
		} finally {
			isAnalyzingSubtitles = false;
		}
	}

	async function autoImportSignals() {
		if (playlistSignals.length === 0 && subtitleSignals.length === 0) {
			adminToast.info('Belum ada playlist/subtitle signal untuk auto import');
			return;
		}
		await Promise.all([autoDetectSignals(), autoDetectSubtitles()]);
		const imported = [
			playlistSignals.length > 0 ? `${urlSources.length} source` : '',
			subtitleSignals.length > 0 ? `${urlSubtitles.length} subtitle` : ''
		].filter(Boolean);
		adminToast.success(`Auto import selesai: ${imported.join(', ')}`);
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!isBusy) return;
		event.preventDefault();
	}

	// ── URL-mode logic ─────────────────────────────────────────────────────

	function addUrlSource() {
		urlSources = [...urlSources, { resolution: pickNextResolution(), url: '' }];
	}

	function removeUrlSource(index: number) {
		urlSources = urlSources.filter((_, i) => i !== index);
		if (urlSources.length === 0) urlSources = [{ resolution: 1080, url: '' }];
	}

	function addUrlSubtitle() {
		urlSubtitles = [...urlSubtitles, { language: '', label: '', sourceUrl: '' }];
	}

	function removeUrlSubtitle(index: number) {
		urlSubtitles = urlSubtitles.filter((_, i) => i !== index);
		if (urlSubtitles.length === 0) {
			urlSubtitles = [{ language: 'id', label: 'Bahasa Indonesia', sourceUrl: '' }];
		}
	}

	function pickNextResolution(): number {
		const used = new Set(urlSources.map((s) => s.resolution));
		for (const r of [1080, 720, 480, 360, 240, 144, 2160]) {
			if (!used.has(r)) return r;
		}
		return 720;
	}

	$effect(() => {
		// Auto-persist URL sources draft so user doesn't lose form state
		// (skip when a session is already active for this payload — we rely on it).
		if (!session || status?.mode !== 'url') {
			persistUrlSources(urlSources);
			persistUrlSubtitles(urlSubtitles);
		}
	});

	async function startUrlUpload() {
		if (isUrlBusy) return;

		const cleaned = urlSources
			.map((s) => ({ resolution: Number(s.resolution), url: s.url.trim() }))
			.filter((s) => s.url.length > 0);

		if (cleaned.length === 0) {
			adminToast.error('Minimal satu URL wajib diisi');
			return;
		}
		const seen = new Set<number>();
		for (const src of cleaned) {
			if (!RESOLUTION_OPTIONS.includes(src.resolution as any)) {
				adminToast.error(`Resolusi ${src.resolution} tidak didukung`);
				return;
			}
			if (seen.has(src.resolution)) {
				adminToast.error(`Resolusi ${src.resolution}p didaftarkan dua kali`);
				return;
			}
			seen.add(src.resolution);
			if (!/^https?:\/\//i.test(src.url)) {
				adminToast.error(`URL ${src.resolution}p invalid`);
				return;
			}
		}
		const subtitles = urlSubtitles
			.map((s) => ({
				language: s.language.trim().toLowerCase(),
				label: s.label.trim(),
				sourceUrl: s.sourceUrl.trim()
			}))
			.filter((s) => s.sourceUrl);
		for (const subtitle of subtitles) {
			if (!subtitle.language) {
				adminToast.error('Subtitle yang punya URL wajib punya kode bahasa');
				return;
			}
			if (!/^https?:\/\//i.test(subtitle.sourceUrl)) {
				adminToast.error(`URL subtitle ${subtitle.language} invalid`);
				return;
			}
			if (!subtitle.label) {
				subtitle.label = subtitle.language.toUpperCase();
			}
		}

		isUrlBusy = true;
		abortUrlRequested = false;

		try {
			pushLog(`Membuat URL session untuk ${cleaned.length} source`);
			const res = await auth.authFetch('/api/upload/url-session', {
				method: 'POST',
				body: JSON.stringify({
					sesid: `${id}/upload-url`,
					episodeId: id,
					sources: cleaned,
					subtitles
				})
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message ?? 'Gagal membuat URL session');
			const sessData = json.data as StatusResp;
			session = buildSessionFromStatus(sessData);
			adoptStatus(sessData);
			openEventStream(sessData.uploadId);
			persistSession(session, sessData);
			pushLog(`URL upload masuk queue server: ${sessData.uploadId}`);
			if (subtitles.length > 0) {
				pushLog(`${subtitles.length} subtitle dipasang ke master R2`);
			}
			adminToast.success('Upload URL masuk queue server');
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			adminToast.error(msg);
			pushLog(`ERR url-upload: ${msg}`);
		} finally {
			isUrlBusy = false;
		}
	}

	function abortUrlUpload() {
		abortUrlRequested = true;
		pushLog('Job sudah jalan di server; tutup/reload halaman tidak menghentikan proses');
	}

	$effect(() => {
		if (!status) return;
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
			isUploading || isUrlBusy || status?.status === 'uploading'
				? status?.mode === 'url'
					? 'Upload URL berjalan di server — kamu bisa pindah halaman dan lanjut pantau nanti.'
					: 'Upload masih berjalan — kalau pindah halaman, upload akan terputus.'
				: 'Encoding masih berjalan — kamu bisa pindah halaman, progress tetap jalan di server. Yakin pindah?';
		const ok = window.confirm(`${reason}\n\nLanjut keluar dari halaman upload?`);
		if (!ok) nav.cancel();
	});

	onMount(async () => {
		const persistedUrlSources = readPersistedUrlSources();
		if (persistedUrlSources && persistedUrlSources.length > 0) {
			urlSources = persistedUrlSources;
		}
		const persistedUrlSubtitles = readPersistedUrlSubtitles();
		if (persistedUrlSubtitles && persistedUrlSubtitles.length > 0) {
			urlSubtitles = persistedUrlSubtitles;
		}
		await loadEpisode();
		await recoverOrCreateSession();
		await loadSignals();
		openSignalStream();
	});

	onDestroy(() => {
		closeEventStream();
		closeSignalStream();
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
			<AppIcon name="arrow_back" class="text-[18px]" />
			Kembali ke Episode
		</button>
		{#if episode}
			<a
				href="/admin/episodes/{episode.id}"
				class="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
			>
				<AppIcon name="edit" class="text-[18px]" />
				Edit Episode
			</a>
		{/if}
	</div>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div>
				<div class="mb-2 flex flex-wrap items-center gap-2">
					<AppIcon name="cloud_upload" class="text-violet-300" />
					<span
						class="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-300"
					>
						HLS Pipeline
					</span>
					<span
						class="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-sky-300"
					>
						SSE Live
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

	<div class="flex w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
		<button
			type="button"
			onclick={() => (activeTab = 'url')}
			class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wide transition
				{activeTab === 'url'
				? 'bg-violet-600 text-white'
				: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}"
		>
			<AppIcon name="link" class="text-[18px]" />
			Upload URL
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'file')}
			class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wide transition
				{activeTab === 'file'
				? 'bg-violet-600 text-white'
				: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}"
		>
			<AppIcon name="videocam" class="text-[18px]" />
			Upload Video
		</button>
	</div>

	<div class="grid gap-5 xl:grid-cols-[1fr_360px]">
		{#if activeTab === 'file'}
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

				{#if status && status.mode !== 'url' && (status.status === 'uploading' || status.status === 'processing') && status.fileName}
					<div
						class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
					>
						<div class="flex items-start gap-2">
							<AppIcon name="history" class="mt-0.5 text-amber-300 text-[18px]" />
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
					<AppIcon name="upload_file" class="mb-3 text-5xl text-violet-300" />
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
								<option value={res}>{RESOLUTION_LABELS[res]}</option>
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

				{#if status && status.mode !== 'url'}
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
									<AppIcon name="check_circle" class="text-[14px]" />
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
					{:else if status && status.status === 'uploading' && status.mode !== 'url'}
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
							<AppIcon name="cloud_upload" class="text-[18px]" />
							Mulai Upload
						</button>
					{/if}
				</div>
			</form>
		{:else}
			<form
				onsubmit={(event) => {
					event.preventDefault();
					startUrlUpload();
				}}
				class="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
			>
				<div>
					<h3 class="text-lg font-black">Upload via URL Playlist</h3>
					<p class="text-sm text-zinc-500">
						Tempel URL <span class="font-mono">.m3u8</span> per resolusi. Segmen akan
						didownload oleh server lalu langsung di-upload ke R2. Tidak ada re-encode,
						progress tetap aman walau halaman di-reload.
					</p>
				</div>

				<section class="space-y-3 rounded-xl border border-violet-500/20 bg-zinc-950/80 p-4 shadow-[0_20px_60px_rgba(124,58,237,0.12)]">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<div class="flex items-center gap-2">
								<AppIcon name="sensors" class="text-violet-300" />
								<h4 class="text-sm font-black text-zinc-100">Signal dari Extension</h4>
							</div>
							<p class="mt-1 text-xs text-zinc-500">
								Response extension dikelompokkan dari tipe, mime, dan ekstensi URL.
							</p>
						</div>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								onclick={() => {
									loadSignals();
									openSignalStream();
								}}
								class="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-violet-200 hover:bg-violet-500/20"
							>
								<AppIcon name="sync" class="text-[17px]" />
								Terima Signal
							</button>
							<button
								type="button"
								onclick={clearSignals}
								disabled={signals.length === 0}
								class="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<AppIcon name="delete_sweep" class="text-[17px]" />
								Clear
							</button>
							<button
								type="button"
								onclick={autoImportSignals}
								disabled={(playlistSignals.length === 0 && subtitleSignals.length === 0) || isAnalyzingSignals || isAnalyzingSubtitles}
								class="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<AppIcon name="auto_awesome" class="text-[17px]" />
								{isAnalyzingSignals || isAnalyzingSubtitles ? 'Importing...' : 'Auto Import'}
							</button>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2 text-[11px] font-bold">
						<span
							class="rounded-full border px-2.5 py-1
								{signalStatus === 'connected'
									? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
									: signalStatus === 'error'
										? 'border-red-500/40 bg-red-500/10 text-red-300'
										: 'border-zinc-700 bg-zinc-900 text-zinc-400'}"
						>
							{signalStatus === 'connected'
								? 'Live connected'
								: signalStatus === 'connecting'
									? 'Connecting'
									: signalStatus === 'error'
										? 'Disconnected'
										: 'Idle'}
						</span>
						<span class="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-400">
							{signals.length} signal tersimpan
						</span>
						{#if signalError}
							<span class="text-red-300">{signalError}</span>
						{/if}
					</div>

					{#if signalGroups.length === 0}
						<div class="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/60 p-4 text-sm font-semibold text-zinc-500">
							Belum ada signal. Klik tombol kirim dari extension, lalu panel ini akan update otomatis.
						</div>
					{:else}
						{#if signalAnalyses.length > 0}
							<div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
								<p class="mb-2 text-xs font-black uppercase tracking-wide text-emerald-200">
									Hasil Auto Detect
								</p>
								<div class="space-y-2">
									{#each signalAnalyses as item (item.url)}
										<div class="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs sm:grid-cols-[70px_1fr_110px_95px] sm:items-center">
											<span class="font-black text-zinc-100">
												{item.resolution ?? inferResolutionFromSignalUrl(item.url) ?? '?'}p
											</span>
											<span class="truncate font-mono text-zinc-400" title={item.url}>{item.url}</span>
											<span class="font-bold text-zinc-300">{formatBitrate(item.bandwidth)}</span>
											<span class="font-bold text-zinc-300">{formatBytes(item.sampleSizeBytes ?? 0)}</span>
											{#if item.error}
												<p class="sm:col-span-4 text-[11px] text-amber-300">{item.error}</p>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
						{#if subtitleAnalyses.length > 0}
							<div class="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
								<p class="mb-2 text-xs font-black uppercase tracking-wide text-sky-200">
									Hasil Auto Subtitle
								</p>
								<div class="space-y-2">
									{#each subtitleAnalyses as item (item.url)}
										<div class="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs sm:grid-cols-[90px_90px_1fr_80px] sm:items-center">
											<span class="font-black text-zinc-100">{item.language}</span>
											<span class="font-bold text-zinc-300">{formatConfidence(item.confidence)}</span>
											<span class="truncate font-mono text-zinc-400" title={item.url}>{item.url}</span>
											<span class="font-bold text-zinc-300">{item.sampleCueCount} cues</span>
											<p class="sm:col-span-4 text-[11px] text-zinc-500">
												{item.label} - {item.detectedFrom}{item.sampleText ? ` - ${item.sampleText}` : ''}
											</p>
											{#if item.error}
												<p class="sm:col-span-4 text-[11px] text-amber-300">{item.error}</p>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
						<div class="space-y-3">
							{#each signalGroups as group}
								<div class="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
									<div class="mb-2 flex items-center justify-between gap-3">
										<div class="flex items-center gap-2">
											<AppIcon name={getSignalIcon(group.key)} class="text-[18px] text-zinc-300" />
											<p class="text-xs font-black uppercase tracking-wide text-zinc-200">
												{group.label}
											</p>
										</div>
										<span class="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
											{group.items.length}
										</span>
									</div>
									<div class="space-y-2">
										{#each group.items.slice(0, 6) as signal (signal.id)}
											<div class="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 sm:grid-cols-[1fr_auto] sm:items-center">
												<div class="min-w-0">
													<p class="truncate font-mono text-xs text-zinc-200" title={signal.url}>
														{signal.url}
													</p>
													<p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-zinc-500">
														<span>{signal.type || 'unknown'}</span>
														{#if signal.contentType}<span>{signal.contentType}</span>{/if}
														{#if signal.statusCode}<span>HTTP {signal.statusCode}</span>{/if}
														<span>{formatSignalTime(signal)}</span>
													</p>
												</div>
												<div class="flex gap-2">
													<button
														type="button"
														onclick={() => useSignal(signal)}
														class="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-white"
													>
														<AppIcon name={group.key === 'subtitle' ? 'subtitles' : group.key === 'playlist' ? 'add_link' : 'content_copy'} class="text-[16px]" />
														{group.key === 'playlist' || group.key === 'subtitle' ? 'Pakai' : 'Copy'}
													</button>
													<button
														type="button"
														onclick={() => copySignalUrl(signal)}
														class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
														aria-label="Copy URL signal"
													>
														<AppIcon name="content_copy" class="text-[16px]" />
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<div class="space-y-2">
					{#each urlSources as source, idx (idx)}
						<div class="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-[140px_1fr_44px]">
							<select
								bind:value={source.resolution}
								disabled={isUrlBusy}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm disabled:cursor-not-allowed"
							>
								{#each RESOLUTION_OPTIONS as res}
									<option value={res}>{RESOLUTION_LABELS[res]}</option>
								{/each}
							</select>
							<input
								type="url"
								placeholder="https://.../variant.m3u8"
								bind:value={source.url}
								disabled={isUrlBusy}
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono disabled:cursor-not-allowed"
							/>
							<button
								type="button"
								onclick={() => removeUrlSource(idx)}
								disabled={isUrlBusy || urlSources.length <= 1}
								class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
								aria-label="Hapus source"
							>
								<AppIcon name="delete" class="text-[18px]" />
							</button>
						</div>
					{/each}
					<button
						type="button"
						onclick={addUrlSource}
						disabled={isUrlBusy || urlSources.length >= RESOLUTION_OPTIONS.length}
						class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<AppIcon name="add" class="text-[18px]" />
						Tambah source
					</button>
				</div>

				<div class="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h4 class="text-sm font-black text-zinc-100">Subtitle URL</h4>
							<p class="text-xs text-zinc-500">
								Opsional, disimpan ke server R2 yang sama dengan master playlist.
							</p>
						</div>
						<button
							type="button"
							onclick={addUrlSubtitle}
							disabled={isUrlBusy}
							class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Tambah subtitle"
						>
							<AppIcon name="add" class="text-[18px]" />
						</button>
					</div>
					{#each urlSubtitles as subtitle, idx (idx)}
						<div class="grid gap-2 sm:grid-cols-[90px_160px_1fr_44px]">
							<input
								placeholder="id"
								bind:value={subtitle.language}
								disabled={isUrlBusy}
								class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono disabled:cursor-not-allowed"
							/>
							<input
								placeholder="Bahasa Indonesia"
								bind:value={subtitle.label}
								disabled={isUrlBusy}
								class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm disabled:cursor-not-allowed"
							/>
							<input
								type="url"
								placeholder="https://.../subtitle.vtt"
								bind:value={subtitle.sourceUrl}
								disabled={isUrlBusy}
								class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono disabled:cursor-not-allowed"
							/>
							<button
								type="button"
								onclick={() => removeUrlSubtitle(idx)}
								disabled={isUrlBusy || urlSubtitles.length <= 1}
								class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
								aria-label="Hapus subtitle"
							>
								<AppIcon name="delete" class="text-[18px]" />
							</button>
						</div>
					{/each}
				</div>

				{#if status && status.mode === 'url' && Array.isArray(status.urlProgress) && status.urlProgress.length > 0}
					<div class="space-y-2">
						<p class="text-xs font-black uppercase tracking-widest text-zinc-500">Progress per source</p>
						{#each status.urlProgress as entry}
							{@const total = entry.totalSegments ?? 0}
							{@const pct = total > 0 ? (entry.completedSegments / total) * 100 : 0}
							<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
								<div class="flex items-center justify-between text-xs font-bold">
									<span class="text-zinc-200">{entry.resolution}p</span>
									<span class="text-zinc-400">
										{entry.completedSegments}/{entry.totalSegments ?? '?'} segmen — <span class="capitalize">{entry.status}</span>
									</span>
								</div>
								<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
									<div
										class="h-full transition-all
											{entry.status === 'completed' ? 'bg-emerald-500' : entry.status === 'failed' ? 'bg-red-500' : 'bg-violet-500'}"
										style="width: {pct}%"
									></div>
								</div>
								{#if entry.errorMessage}
									<p class="mt-1 text-[11px] text-red-300">{entry.errorMessage}</p>
								{/if}
							</div>
						{/each}
					</div>

					<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
						<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Upload</p>
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
							<p class="font-black text-red-200">Error</p>
							<p class="mt-1 text-xs text-red-300">{status.errorMessage}</p>
						</div>
					{/if}
				{/if}

				<div class="flex flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
					{#if isUrlBusy}
						<button
							type="button"
							onclick={abortUrlUpload}
							class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/20"
						>
							Batalkan
						</button>
					{:else}
						<button
							class="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<AppIcon name="link" class="text-[18px]" />
							Mulai Upload URL
						</button>
					{/if}
				</div>
			</form>
		{/if}

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
							Clear Local
						</button>
					{/if}
				</div>
				<div
					class="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400"
				>
					{#if activityLines.length === 0}
						<p class="text-zinc-600">Belum ada aktivitas.</p>
					{:else}
						{#each activityLines as line}
							<p class="break-all">{line}</p>
						{/each}
					{/if}
				</div>
			</section>
		</aside>
	</div>
</div>
