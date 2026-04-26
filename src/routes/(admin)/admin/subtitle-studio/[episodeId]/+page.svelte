<script lang="ts">
	import '$lib/components/admin/subtitle-studio/css/sr.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import {
		getAutoGenerateTrackJob,
		createTrack,
		deleteCue,
		generateSubtitleSelection,
		getEditorTracks,
		getEpisode,
		getServers,
		importTrackSubtitle,
		openReviseSubtitleTrackStream,
		saveTrackCues,
		startAutoGenerateTrack,
		translateSubtitleCueText,
		type AiRevisionResult,
		type AiRevisionStreamEvent,
		type AiInstructionContext,
		type AiInstructionMessage,
		type AutoGenerateJob,
		type EpisodeSummary,
		type SubtitleAiRangeGenerateResult,
		type SubtitleAiTextTranslateResult,
		type SubtitleAiTranscribeModel,
		type SubtitleAiTextModel,
		type SubtitleCue,
		type SubtitleTrack,
		type VideoServer
	} from '$lib/admin/subtitle-studio';
	import {
		AI_INSTRUCTION_REJECT_MESSAGE,
		compactAiInstructionMessages,
		isSubtitleAiInstruction
	} from '$lib/admin/subtitle-ai-instructions';
	import StudioLayout from '$lib/components/admin/subtitle-studio/StudioLayout.svelte';
	import LanguageTrackPanel from '$lib/components/admin/subtitle-studio/LanguageTrackPanel.svelte';
	import TimelineEditor from '$lib/components/admin/subtitle-studio/TimelineEditor.svelte';
	import '$lib/components/admin/subtitle-studio/css/sb.css';
	import VideoPlayer from '$lib/components/video-player/v2/VideoPlayer.svelte';
	import { layout } from '$lib/components/admin/subtitle-studio/layout/store.svelte';
	import {
		createVideoPlayerState,
		type PlayerConfig
	} from '$lib/components/video-player/v2/stores/vpstate.svelte';
	import { formatProxyUrl } from '$lib/format-proxy-urls';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type AiPendingMode = 'idle' | 'thinking' | 'typing';
	type CueSourceKind = 'manual' | 'ai_transcribe' | 'ai_translate';
	type ImportMode = 'file' | 'url' | 'text';
	type StudioPlayerApi = ReturnType<typeof createVideoPlayerState>;

	const importModeOptions: Array<{ id: ImportMode; icon: string; label: string }> = [
		{ id: 'file', icon: 'upload_file', label: 'File' },
		{ id: 'url', icon: 'link', label: 'URL' },
		{ id: 'text', icon: 'content_paste', label: 'Paste' }
	];

	const episodeId = $derived(Number(page.params.episodeId));
	let episode = $state<EpisodeSummary | null>(null);
	let servers = $state<VideoServer[]>([]);
	let tracks = $state<SubtitleTrack[]>([]);
	let activeServerUrl = $state('');
	let activeTrackId = $state<number | null>(null);
	let cues = $state<SubtitleCue[]>([]);
	let selectedCueId = $state<number | null>(null);
	let currentTime = $state(0);
	let duration = $state(0);
	let isPlaying = $state(false);
	let isLoading = $state(true);
	let loadingStage = $state('Preparing studio...');
	let loadingDetail = $state('Menyusun workspace editor dan sinkronisasi state awal.');
	let loadingProgress = $state(0.08);
	let playerVideoEl = $state<HTMLVideoElement | undefined>(undefined);
	let isSaving = $state(false);
	let dirty = $state(false);
	let isAutoGenerating = $state(false);
	let autoGenerateStatus = $state<'idle' | 'queued' | 'running' | 'completed' | 'failed'>('idle');
	let autoGenerateJobId = $state('');
	let autoGenerateProgress = $state(0);
	let autoGenerateStage = $state('');
	let autoGenerateMessage = $state('');
	let autoGenerateError = $state('');
	let aiInstructionDraft = $state('');
	let aiMessages = $state<AiInstructionMessage[]>([]);
	let selectedAiTextModel = $state<SubtitleAiTextModel>('');
	let selectedAiTranscribeModel = $state<SubtitleAiTranscribeModel>('');
	let aiPendingMode = $state<AiPendingMode>('idle');
	let aiPendingStage = $state('');
	let aiTypingPreview = $state('');
	let isAiRevising = $state(false);
	let newLang = $state('id');
	let newLabel = $state('Indonesia');
	let importMode = $state<ImportMode>('file');
	let importFile = $state<File | null>(null);
	let importUrl = $state('');
	let importText = $state('');
	let isImporting = $state(false);
	let cueSourceMap = $state<Record<string, CueSourceKind>>({});
	let trackSourceMap = $state<Record<number, CueSourceKind>>({});
	let playerApi = $state<StudioPlayerApi | undefined>(undefined);
	// Panel visibility managed by layout store — layout.visible.right replaces sidebarOpen
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	let autoGeneratePollTimer: ReturnType<typeof setTimeout> | null = null;
	let aiThinkingTimer: ReturnType<typeof setInterval> | null = null;
	let aiTypingQueue = Promise.resolve();
	let aiStreamController: AbortController | null = null;
	let autoGeneratePollFailures = $state(0);

	const activeServer = $derived(servers.find((s) => s.value === activeServerUrl));
	const activeTrack = $derived(tracks.find((t) => t.id === activeTrackId) ?? null);
	const playerSrc = $derived(activeServer ? formatProxyUrl(activeServer) : null);
	const loadingPercent = $derived(Math.round(Math.min(100, Math.max(0, loadingProgress * 100))));
	const showStudioBootOverlay = $derived(
		isLoading || (playerSrc ? loadingProgress < 0.34 : loadingProgress < 0.3)
	);
	const activeCue = $derived(cues.find((c) => c.id === selectedCueId) ?? null);
	const isAiResponding = $derived(aiPendingMode !== 'idle');
	const activeCueSourceLabel = $derived(
		activeCue ? sourceKindLabel(resolveCueSource(activeCue, activeTrackId)) : 'Import / Manual'
	);
	const trackSourceSummary = $derived(buildTrackSourceSummary(cues, activeTrackId));
	const playerOverlayLines = $derived.by(() =>
		cues
			.filter((cue) => currentTime >= cue.startTime && currentTime <= cue.endTime)
			.sort((a, b) => {
				if (a.startTime !== b.startTime) return a.startTime - b.startTime;
				return a.endTime - b.endTime;
			})
			.flatMap((cue) =>
				cue.text
					.split(/\r?\n/g)
					.map((line) => line.trim())
					.filter(Boolean)
			)
	);
	const playerConfig = $derived.by(() => {
		return {
			subtitle: {
				color: '#fff',
				fontSize: '1rem',
				fontWeight: 700,
				background: 'rgba(0,0,0,0.52)',
				borderRadius: '6px',
				padding: '3px 10px',
				bottomOffset: '7%',
				textShadow: '0 2px 6px rgba(0,0,0,1)'
			},
			theme: {
				primaryColor: '#ffffff',
				accentColor: '#7c3aed',
				controlTextColor: '#ffffff',
				controlBackground: 'rgba(255,255,255,.14)'
			},
			ambient: {
				enabled: true,
				intensity: 1.3,
				opacity: 0.42,
				blur: 32,
				saturation: 1.65,
				contrast: 1.6
			},
			controls: {
				enabled: true,
				position: 'bottom',
				showPlay: true,
				showSeek: true,
				showSkip: true,
				showVolume: true,
				showTime: true,
				showSettings: true,
				showFullscreen: true,
				showSourceBadge: true,
				showThumbnailPreview: false,
				showStats: false,
				preloadAudioWaveform: false,
				waveformEnable: false
			},
			playback: {
				speeds: [0.25, 0.5, 1, 1.5, 2],
				skipSeconds: 5,
				persistProgress: false
			},
			fullscreen: {
				showTopBar: true,
				showBackButton: false,
				showTitle: true
			},
			skipIntro: {
				enabled: false
			}
		} satisfies PlayerConfig;
	});

	function setLoadingState(stage: string, progress: number, detail: string) {
		loadingStage = stage;
		loadingProgress = Math.max(loadingProgress, progress);
		loadingDetail = detail;
	}

	function cueSourceKey(trackId: number | null, cue: SubtitleCue) {
		return `${trackId ?? 0}:${cue.id ?? `${cue.startTime.toFixed(3)}:${cue.endTime.toFixed(3)}:${cue.text.trim()}`}`;
	}

	function sourceKindLabel(source: CueSourceKind) {
		if (source === 'ai_transcribe') return 'AI Transcribe';
		if (source === 'ai_translate') return 'AI Translate';
		return 'Import / Manual';
	}

	function resolveCueSource(cue: SubtitleCue, trackId: number | null) {
		return (
			cueSourceMap[cueSourceKey(trackId, cue)] ??
			(trackId ? trackSourceMap[trackId] : undefined) ??
			'manual'
		);
	}

	function registerCueSources(
		trackId: number | null,
		source: CueSourceKind,
		targetCues: SubtitleCue[]
	) {
		if (!trackId || targetCues.length === 0) return;
		const nextMap = { ...cueSourceMap };
		for (const cue of targetCues) {
			nextMap[cueSourceKey(trackId, cue)] = source;
		}
		cueSourceMap = nextMap;
		trackSourceMap = { ...trackSourceMap, [trackId]: source };
	}

	function seedTrackSources(trackList: SubtitleTrack[]) {
		const nextTrackMap = { ...trackSourceMap };
		const nextCueMap = { ...cueSourceMap };
		for (const track of trackList) {
			nextTrackMap[track.id] ??= 'manual';
			for (const cue of track.cues ?? []) {
				nextCueMap[cueSourceKey(track.id, cue)] ??= nextTrackMap[track.id];
			}
		}
		trackSourceMap = nextTrackMap;
		cueSourceMap = nextCueMap;
	}

	function buildTrackSourceSummary(trackCues: SubtitleCue[], trackId: number | null) {
		const counts = { manual: 0, aiTranscribe: 0, aiTranslate: 0 };
		for (const cue of trackCues) {
			const source = resolveCueSource(cue, trackId);
			if (source === 'ai_transcribe') counts.aiTranscribe += 1;
			else if (source === 'ai_translate') counts.aiTranslate += 1;
			else counts.manual += 1;
		}

		const activeKinds = [
			counts.manual > 0 ? 'manual' : null,
			counts.aiTranscribe > 0 ? 'ai_transcribe' : null,
			counts.aiTranslate > 0 ? 'ai_translate' : null
		].filter(Boolean) as CueSourceKind[];

		return {
			label:
				activeKinds.length <= 1
					? sourceKindLabel(activeKinds[0] ?? 'manual')
					: `Mixed (${activeKinds.length})`,
			counts
		};
	}

	function cueFingerprint(cue: SubtitleCue) {
		return `${cue.startTime.toFixed(3)}|${cue.endTime.toFixed(3)}|${cue.text.trim()}`;
	}

	function remapCueSources(trackId: number, previousCues: SubtitleCue[], nextCues: SubtitleCue[]) {
		const byId = new Map<number, CueSourceKind>();
		const byFingerprint = new Map<string, CueSourceKind>();

		for (const cue of previousCues) {
			const source = resolveCueSource(cue, trackId);
			if (cue.id) byId.set(cue.id, source);
			byFingerprint.set(cueFingerprint(cue), source);
		}

		const nextMap = { ...cueSourceMap };
		for (const cue of nextCues) {
			const source =
				(cue.id ? byId.get(cue.id) : undefined) ??
				byFingerprint.get(cueFingerprint(cue)) ??
				trackSourceMap[trackId] ??
				'manual';
			nextMap[cueSourceKey(trackId, cue)] = source;
		}
		cueSourceMap = nextMap;
	}

	async function loadBase() {
		isLoading = true;
		loadingProgress = 0.08;
		setLoadingState(
			'Preparing studio...',
			0.08,
			'Menyusun workspace editor dan sinkronisasi state awal.'
		);
		try {
			setLoadingState(
				'Loading episode data...',
				0.18,
				'Mengambil info episode dan daftar server video.'
			);
			const [episodeResult, serverResult] = await Promise.all([
				getEpisode(episodeId),
				getServers(episodeId)
			]);
			episode = episodeResult.data;
			servers = serverResult.data;
			activeServerUrl ||= servers[0]?.value ?? '';
			setLoadingState(
				'Loading cue track...',
				0.36,
				'Menyiapkan language track, cue, dan source metadata editor.'
			);
			await loadTracks();
			setLoadingState(
				playerSrc ? 'Rendering video...' : 'Preparing studio...',
				playerSrc ? 0.24 : 0.34,
				playerSrc
					? 'Menunggu player kebentuk dan surface video siap dipakai.'
					: 'Studio siap, menunggu komponen final dipasang.'
			);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat studio');
			setLoadingState(
				'Studio gagal dimuat',
				0.6,
				error instanceof Error ? error.message : 'Terjadi kendala saat memuat studio.'
			);
		} finally {
			isLoading = false;
		}
	}

	async function loadTracks() {
		if (!activeServerUrl) return;
		const result = await getEditorTracks(episodeId, activeServerUrl);
		tracks = result.tracks;
		seedTrackSources(result.tracks);
		activeTrackId = tracks[0]?.id ?? null;
		cues = tracks[0]?.cues ?? [];
		selectedCueId = null;
		dirty = false;
	}

	function selectTrack(id: number) {
		if (dirty && !confirm('Perubahan belum disimpan. Pindah track?')) return;
		activeTrackId = id;
		cues = tracks.find((t) => t.id === id)?.cues ?? [];
		selectedCueId = null;
		dirty = false;
	}

	async function selectServer(serverUrl: string) {
		if (dirty && !confirm('Perubahan belum disimpan. Pindah server?')) return;
		activeServerUrl = serverUrl;
		await loadTracks();
	}

	async function addTrack() {
		try {
			const track = await createTrack({
				episodeId,
				serverUrl: activeServerUrl,
				language: newLang,
				label: newLabel
			});
			tracks = [...tracks.filter((t) => t.id !== track.id), { ...track, cues: track.cues ?? [] }];
			seedTrackSources([{ ...track, cues: track.cues ?? [] }]);
			selectTrack(track.id);
			adminToast.success('Track subtitle dibuat');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal membuat track');
		}
	}

	async function saveNow() {
		if (!activeTrack) return;
		isSaving = true;
		try {
			const previousCues = cues;
			const saved = await saveTrackCues(activeTrack.id, cues);
			tracks = tracks.map((t) => (t.id === saved.id ? saved : t));
			cues = saved.cues;
			remapCueSources(saved.id, previousCues, saved.cues);
			dirty = false;
			adminToast.success('Subtitle tersimpan');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal menyimpan subtitle');
		} finally {
			isSaving = false;
		}
	}

	function markDirty() {
		dirty = true;
		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => saveNow(), 1800);
	}

	function canImportSubtitle() {
		if (!activeServerUrl || isImporting) return false;
		if (importMode === 'file') return Boolean(importFile);
		if (importMode === 'url') return importUrl.trim().length > 0;
		return importText.trim().length > 0;
	}

	function seek(time: number) {
		playerApi?.seek(time);
		currentTime = time;
	}

	function syncPlaybackState(state: { currentTime: number; duration: number; isPlaying: boolean }) {
		currentTime = state.currentTime;
		duration = state.duration || duration;
		isPlaying = state.isPlaying;
	}

	$effect(() => {
		if (!playerSrc || !playerVideoEl) return;
		const readyState = playerVideoEl.readyState ?? 0;
		const hasFrames = playerVideoEl.videoWidth > 0 && playerVideoEl.videoHeight > 0;
		const bufferedReady =
			playerVideoEl.buffered.length > 0 &&
			playerVideoEl.buffered.end(playerVideoEl.buffered.length - 1) > 0.15;
		const readinessScore =
			(readyState / 4) * 0.72 + (hasFrames ? 0.16 : 0) + (bufferedReady ? 0.12 : 0);
		const nextProgress = 0.24 + Math.min(0.36, readinessScore * 0.36);

		if (readinessScore < 0.2) {
			setLoadingState(
				'Rendering video...',
				nextProgress,
				'Player sedang membangun surface video dan metadata stream.'
			);
		} else if (readinessScore < 0.6) {
			setLoadingState(
				'Rendering video...',
				nextProgress,
				'Surface video sudah kebentuk, menyusun frame awal dan sinkron timeline.'
			);
		} else {
			setLoadingState(
				'Syncing subtitle overlay...',
				nextProgress,
				'Video hampir siap. Menyambungkan cue editor ke overlay subtitle realtime.'
			);
		}
	});

	async function togglePlayback() {
		if (!playerApi) return;
		try {
			await playerApi.togglePlay();
		} catch {
			adminToast.error('Video gagal diputar');
		}
	}

	function updateCue(patch: Partial<SubtitleCue>) {
		if (!activeCue) return;
		cues = cues.map((c) => (c.id === activeCue.id ? { ...c, ...patch } : c));
		markDirty();
	}

	async function removeCue(cue: SubtitleCue) {
		if (cue.id && cue.id > 0) await deleteCue(cue.id).catch(() => null);
	}

	async function removeAllCuesInActiveTrack() {
		if (!activeTrack || cues.length === 0) return;
		const trackLabel = activeTrack.label || activeTrack.language;
		const total = cues.length;
		if (
			!confirm(
				`Hapus ${total} cue di track "${trackLabel}"? Aksi ini permanen dan tidak bisa dibatalkan.`
			)
		)
			return;
		const persisted = cues.filter((cue) => cue.id && cue.id > 0).map((cue) => cue.id as number);
		try {
			if (persisted.length > 0) {
				await Promise.all(persisted.map((id) => deleteCue(id).catch(() => null)));
			}
			cues = [];
			selectedCueId = null;
			markDirty();
			adminToast.success(`Berhasil menghapus ${total} cue`);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal menghapus cue');
		}
	}

	async function importSubtitleNow() {
		if (!canImportSubtitle()) return;
		isImporting = true;
		try {
			const track = await importTrackSubtitle({
				episodeId,
				serverUrl: activeServerUrl,
				language: newLang,
				label: newLabel,
				file: importMode === 'file' ? importFile : null,
				sourceUrl: importMode === 'url' ? importUrl : undefined,
				content: importMode === 'text' ? importText : undefined
			});
			tracks = [...tracks.filter((t) => t.id !== track.id), track];
			registerCueSources(track.id, 'manual', track.cues ?? []);
			selectTrack(track.id);
			importFile = null;
			importUrl = '';
			importText = '';
			adminToast.success('Subtitle diimport ke timeline');
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal import subtitle');
		} finally {
			isImporting = false;
		}
	}

	function buildAiContext(
		targetLanguage = newLang.trim().toLowerCase(),
		targetLabel = newLabel.trim()
	) {
		return {
			animeTitle: episode?.anime?.title,
			episodeTitle: episode?.title,
			episodeNumber: episode?.number ?? episodeId,
			targetLanguage,
			targetLabel: targetLabel || targetLanguage.toUpperCase(),
			currentTime
		} satisfies AiInstructionContext;
	}

	function withDraftMessage() {
		const content = aiInstructionDraft.trim();
		const previousMessages = compactAiInstructionMessages(aiMessages, content ? 5 : 6);
		const nextMessages = content
			? [
					...aiMessages,
					{
						role: 'user',
						content,
						createdAt: new Date().toISOString()
					} satisfies AiInstructionMessage
				]
			: aiMessages;
		if (content) {
			aiMessages = nextMessages.slice(-12);
			aiInstructionDraft = '';
		}
		return {
			instruction: content,
			messages: previousMessages
		};
	}

	function pushAiAssistantMessage(content: string) {
		const message: AiInstructionMessage = {
			role: 'assistant',
			content,
			createdAt: new Date().toISOString()
		};
		aiMessages = [...aiMessages, message].slice(-12);
	}

	function resetAiPending() {
		stopAiThinking();
		aiPendingMode = 'idle';
		aiPendingStage = '';
		aiTypingPreview = '';
	}

	function beginAiStreaming() {
		stopAiThinking();
		aiPendingMode = 'typing';
		aiPendingStage = '';
		aiTypingPreview = '';
	}

	function applyAiStreamDelta(delta: string, fullText?: string) {
		beginAiStreaming();
		aiTypingPreview = fullText ?? `${aiTypingPreview}${delta}`;
	}

	function parseSseEvents(chunk: string) {
		return chunk
			.split('\n\n')
			.map((rawEvent) => rawEvent.trim())
			.filter(Boolean)
			.map((rawEvent) => {
				const lines = rawEvent.split('\n');
				const event = lines
					.filter((line) => line.startsWith('event:'))
					.map((line) => line.slice(6).trim())
					.at(-1);
				const dataText = lines
					.filter((line) => line.startsWith('data:'))
					.map((line) => line.slice(5).trim())
					.join('\n');
				if (!event || !dataText) return null;
				try {
					return { event, data: JSON.parse(dataText) } as AiRevisionStreamEvent;
				} catch {
					return null;
				}
			})
			.filter(Boolean) as AiRevisionStreamEvent[];
	}

	function handleAiStreamDone(result: AiRevisionResult) {
		applyTrackFromAi(result.track);
		const audioNote = result.target?.audioSegmentCount
			? ` Audio @${formatMentionTime(result.target.audioStartTime)}-@${formatMentionTime(result.target.audioEndTime)} ikut dicek.`
			: '';
		const finalMessage = `${result.message || `AI merevisi ${result.changedCount} cue subtitle.`}${audioNote}`;
		aiTypingPreview = finalMessage;
		pushAiAssistantMessage(finalMessage);
		resetAiPending();
		adminToast.success(`AI merevisi ${result.changedCount} cue subtitle`);
	}

	async function consumeAiRevisionStream(response: Response) {
		if (!response.body) throw new Error('Stream revisi AI kosong');
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() ?? '';
			for (const event of parseSseEvents(parts.join('\n\n'))) {
				if (event.event === 'stage') {
					aiPendingMode = 'thinking';
					aiPendingStage = event.data.message || event.data.stage;
					continue;
				}
				if (event.event === 'delta') {
					applyAiStreamDelta(event.data.text, event.data.fullText);
					continue;
				}
				if (event.event === 'done') {
					handleAiStreamDone(event.data);
					return;
				}
				if (event.event === 'aborted') {
					resetAiPending();
					pushAiAssistantMessage(event.data.message || 'Generasi AI dihentikan.');
					return;
				}
				if (event.event === 'error') {
					throw new Error(event.data.message || 'Gagal stream revisi AI');
				}
			}
		}

		if (buffer.trim()) {
			for (const event of parseSseEvents(buffer)) {
				if (event.event === 'done') {
					handleAiStreamDone(event.data);
					return;
				}
			}
		}

		throw new Error('Stream revisi AI berakhir tanpa hasil');
	}

	function stopGenerating() {
		if (!aiStreamController) return;
		aiStreamController.abort();
		aiStreamController = null;
		isAiRevising = false;
		resetAiPending();
		pushAiAssistantMessage('Generasi AI dihentikan.');
	}

	function clearAiThinking() {
		if (aiThinkingTimer) clearInterval(aiThinkingTimer);
		aiThinkingTimer = null;
	}

	function startAiThinking(stages: string[]) {
		clearAiThinking();
		const steps = stages.filter(Boolean);
		aiPendingMode = 'thinking';
		aiTypingPreview = '';
		aiPendingStage = steps[0] || 'Memikirkan jawaban...';
		if (steps.length < 2) return;
		let stepIndex = 0;
		aiThinkingTimer = setInterval(() => {
			stepIndex = (stepIndex + 1) % steps.length;
			aiPendingStage = steps[stepIndex] || aiPendingStage;
		}, 1100);
	}

	function stopAiThinking() {
		clearAiThinking();
		if (aiPendingMode === 'thinking') aiPendingMode = 'idle';
		aiPendingStage = '';
	}

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function queueAiAssistantMessage(content: string) {
		const nextContent = content.trim();
		if (!nextContent) return aiTypingQueue;

		aiTypingQueue = aiTypingQueue.then(async () => {
			stopAiThinking();
			aiPendingMode = 'typing';
			aiPendingStage = '';
			aiTypingPreview = '';
			const chars = Array.from(nextContent);
			for (let index = 1; index <= chars.length; index += 1) {
				aiTypingPreview = chars.slice(0, index).join('');
				await wait(chars.length > 180 ? 7 : 14);
			}
			pushAiAssistantMessage(nextContent);
			aiPendingMode = 'idle';
			aiTypingPreview = '';
		});

		return aiTypingQueue;
	}

	function formatMentionTime(seconds?: number) {
		if (seconds === undefined || !Number.isFinite(seconds)) return '';
		const safe = Math.max(0, Math.floor(seconds));
		const hours = Math.floor(safe / 3600);
		const minutes = Math.floor((safe % 3600) / 60);
		const remain = safe % 60;
		if (hours > 0) {
			return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
		}
		return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
	}

	function mentionCueTime(cue: SubtitleCue) {
		const mention = `@${formatMentionTime(cue.startTime)}`;
		if (aiInstructionDraft.includes(mention)) return;
		const draft = aiInstructionDraft.trimEnd();
		aiInstructionDraft = draft ? `${draft} ${mention} ` : `${mention} `;
	}

	function applyTrackFromAi(track: SubtitleTrack) {
		const nextTrack = { ...track, cues: track.cues ?? [] };
		tracks = [...tracks.filter((item) => item.id !== nextTrack.id), nextTrack];
		registerCueSources(nextTrack.id, 'ai_translate', nextTrack.cues);
		activeTrackId = nextTrack.id;
		cues = nextTrack.cues;
		const currentCue = nextTrack.cues.find(
			(cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
		);
		selectedCueId = currentCue?.id ?? nextTrack.cues[0]?.id ?? null;
		dirty = false;
	}

	function mergeTrackSnapshot(track: SubtitleTrack) {
		const nextTrack = { ...track, cues: track.cues ?? [] };
		tracks = [...tracks.filter((item) => item.id !== nextTrack.id), nextTrack];
		registerCueSources(
			nextTrack.id,
			trackSourceMap[nextTrack.id] ?? 'ai_translate',
			nextTrack.cues
		);
		if (!activeTrackId || activeTrackId === nextTrack.id) {
			activeTrackId = nextTrack.id;
			cues = nextTrack.cues;
			dirty = false;
		}
	}

	async function generateSelectionWithAi(payload: {
		rangeStart: number;
		rangeEnd: number;
		translate: boolean;
	}) {
		if (!activeServerUrl) {
			adminToast.error('Server video belum dipilih');
			return [];
		}

		const targetLanguage = (activeTrack?.language || newLang).trim().toLowerCase();
		const targetLabel = (activeTrack?.label || newLabel).trim() || targetLanguage.toUpperCase();

		try {
			const result: SubtitleAiRangeGenerateResult = await generateSubtitleSelection({
				episodeId,
				serverUrl: activeServerUrl,
				rangeStart: payload.rangeStart,
				rangeEnd: payload.rangeEnd,
				language: targetLanguage || 'id',
				label: targetLabel || 'Indonesia',
				sourceLanguage: 'zh',
				transcribeModel: selectedAiTranscribeModel || undefined,
				textModel: selectedAiTextModel || undefined,
				context: buildAiContext(targetLanguage || 'id', targetLabel || 'Indonesia'),
				translate: payload.translate
			});
			if (!result.cues.length) {
				adminToast.info(result.message || 'AI tidak menemukan subtitle pada range ini');
				return [];
			}
			adminToast.success(result.message || `AI menghasilkan ${result.cues.length} cue`);
			return result.cues;
		} catch (error) {
			adminToast.error(
				error instanceof Error ? error.message : 'Gagal generate subtitle dari selection'
			);
			return [];
		}
	}

	async function translateCueTextWithAi(cue: SubtitleCue) {
		const targetLanguage = (activeTrack?.language || newLang).trim().toLowerCase();
		const targetLabel = (activeTrack?.label || newLabel).trim() || targetLanguage.toUpperCase();

		try {
			const result: SubtitleAiTextTranslateResult = await translateSubtitleCueText({
				language: targetLanguage || 'id',
				label: targetLabel || 'Indonesia',
				textModel: selectedAiTextModel || undefined,
				context: buildAiContext(targetLanguage || 'id', targetLabel || 'Indonesia'),
				cues: [cue]
			});
			if (!result.cues.length) {
				adminToast.info(result.message || 'AI tidak menemukan hasil translate untuk cue ini');
				return null;
			}
			if (activeTrackId) registerCueSources(activeTrackId, 'ai_translate', result.cues);
			adminToast.success(result.message || 'Cue berhasil diterjemahkan');
			return result.cues[0] ?? null;
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal translate cue dari teks');
			return null;
		}
	}

	function clearAutoGeneratePoll() {
		if (!autoGeneratePollTimer) return;
		clearTimeout(autoGeneratePollTimer);
		autoGeneratePollTimer = null;
	}

	function applyAutoGenerateJob(job: AutoGenerateJob) {
		autoGenerateJobId = job.id;
		autoGenerateStatus = job.status;
		autoGenerateProgress = Math.max(0, Math.min(100, Math.round(job.progress || 0)));
		autoGenerateStage = job.stage || '';
		autoGenerateMessage = job.message || '';
		autoGenerateError = job.error || '';
		isAutoGenerating = job.status === 'queued' || job.status === 'running';
	}

	async function handleAutoGenerateCompleted(job: AutoGenerateJob, jobServerUrl: string) {
		if (!job.track) {
			adminToast.error('Job selesai tapi track subtitle tidak ditemukan');
			return;
		}

		if (activeServerUrl !== jobServerUrl) {
			adminToast.success(`Subtitle ${job.track.label} selesai dibuat untuk server sebelumnya`);
			return;
		}

		applyTrackFromAi(job.track);
		await queueAiAssistantMessage(`Subtitle ${job.track.label} selesai digenerate.`);
		adminToast.success(`Subtitle ${job.track.label} berhasil digenerate`);
	}

	async function pollAutoGenerateJob(jobId: string, jobServerUrl: string) {
		clearAutoGeneratePoll();
		try {
			const job = await getAutoGenerateTrackJob(jobId);
			autoGeneratePollFailures = 0;
			applyAutoGenerateJob(job);
			if (job.track && activeServerUrl === jobServerUrl && !dirty) {
				mergeTrackSnapshot(job.track);
			}

			if (job.status === 'completed') {
				await handleAutoGenerateCompleted(job, jobServerUrl);
				return;
			}

			if (job.status === 'failed') {
				void queueAiAssistantMessage(job.error || job.message || 'Gagal auto generate subtitle');
				adminToast.error(job.error || job.message || 'Gagal auto generate subtitle');
				return;
			}

			autoGeneratePollTimer = setTimeout(() => {
				void pollAutoGenerateJob(jobId, jobServerUrl);
			}, 1200);
		} catch (error) {
			autoGeneratePollFailures += 1;
			if (autoGeneratePollFailures < 3) {
				autoGenerateMessage = 'Koneksi progress terputus, mencoba lagi...';
				autoGeneratePollTimer = setTimeout(() => {
					void pollAutoGenerateJob(jobId, jobServerUrl);
				}, 1500);
				return;
			}

			autoGenerateStatus = 'failed';
			autoGenerateError =
				error instanceof Error ? error.message : 'Gagal membaca progress auto subtitle';
			isAutoGenerating = false;
			adminToast.error(autoGenerateError);
		}
	}

	async function sendAiInstruction() {
		const draft = aiInstructionDraft.trim();
		if (!draft) return;
		if (!isSubtitleAiInstruction(draft)) {
			aiInstructionDraft = '';
			void queueAiAssistantMessage(AI_INSTRUCTION_REJECT_MESSAGE);
			return;
		}

		const instructionBundle = withDraftMessage();
		if (!activeTrack || cues.length === 0) {
			void queueAiAssistantMessage(
				'Instruksi disimpan. Nanti dipakai saat Auto Generate dijalankan.'
			);
			return;
		}

		isAiRevising = true;
		aiStreamController?.abort();
		aiStreamController = new AbortController();
		startAiThinking(['Memahami instruksi...', 'Mencari cue target...', 'Menyiapkan stream AI...']);
		try {
			const response = await openReviseSubtitleTrackStream(
				{
					trackId: activeTrack.id,
					instruction: instructionBundle.instruction,
					messages: instructionBundle.messages,
					currentTime,
					selectedCueId,
					sourceLanguage: 'zh',
					textModel: selectedAiTextModel || undefined,
					context: buildAiContext(activeTrack.language, activeTrack.label)
				},
				aiStreamController.signal
			);
			await consumeAiRevisionStream(response);
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			const message = error instanceof Error ? error.message : 'Gagal menjalankan instruksi AI';
			await queueAiAssistantMessage(message);
			adminToast.error(message);
		} finally {
			aiStreamController = null;
			resetAiPending();
			isAiRevising = false;
		}
	}

	async function autoGenerateNow() {
		if (!activeServerUrl) return;
		const targetLanguage = newLang.trim().toLowerCase();
		const targetLabel = newLabel.trim() || targetLanguage.toUpperCase();
		if (!targetLanguage) {
			adminToast.error('Language target wajib diisi');
			return;
		}
		if (
			dirty &&
			!confirm('Perubahan yang belum disimpan bisa tertimpa. Lanjut generate subtitle?')
		) {
			return;
		}

		const existingTrack = tracks.find((track) => track.language === targetLanguage);
		if (
			existingTrack &&
			!confirm(
				`Track ${existingTrack.label} (${existingTrack.language}) sudah ada. Auto Generate akan lanjut dari chunk yang belum punya cue dan mempertahankan cue lama. Lanjut?`
			)
		) {
			return;
		}

		const draft = aiInstructionDraft.trim();
		if (draft && !isSubtitleAiInstruction(draft)) {
			aiInstructionDraft = '';
			void queueAiAssistantMessage(AI_INSTRUCTION_REJECT_MESSAGE);
			return;
		}

		isAutoGenerating = true;
		autoGenerateStatus = 'queued';
		autoGenerateProgress = 0;
		autoGenerateStage = 'queued';
		autoGenerateMessage = 'Menyiapkan job auto subtitle...';
		autoGenerateError = '';
		autoGeneratePollFailures = 0;
		clearAutoGeneratePoll();

		const instructionBundle = withDraftMessage();

		try {
			const job = await startAutoGenerateTrack({
				episodeId,
				serverUrl: activeServerUrl,
				language: targetLanguage,
				label: targetLabel,
				sourceLanguage: 'zh',
				transcribeModel: selectedAiTranscribeModel || undefined,
				textModel: selectedAiTextModel || undefined,
				instructions: instructionBundle.instruction,
				instructionMessages: instructionBundle.messages,
				context: buildAiContext(targetLanguage, targetLabel)
			});
			applyAutoGenerateJob(job);
			adminToast.info('Auto generate subtitle dimulai');
			await pollAutoGenerateJob(job.id, activeServerUrl);
		} catch (error) {
			autoGenerateStatus = 'failed';
			autoGenerateError = error instanceof Error ? error.message : 'Gagal auto generate subtitle';
			autoGenerateMessage = autoGenerateError;
			void queueAiAssistantMessage(autoGenerateError);
			adminToast.error(error instanceof Error ? error.message : 'Gagal auto generate subtitle');
			isAutoGenerating = false;
		}
	}

	onMount(loadBase);
	onDestroy(() => {
		aiStreamController?.abort();
		clearAutoGeneratePoll();
		clearAiThinking();
		if (autosaveTimer) clearTimeout(autosaveTimer);
	});
</script>

<div class="studio-root" oncontextmenu={(e) => e.preventDefault()}>
	<!-- ══════════════════════════════════════════
         TOPBAR
    ══════════════════════════════════════════ -->
	<header class="studio-topbar">
		<div class="studio-topbar-left">
			<button
				onclick={() => goto('/admin/subtitle-studio')}
				class="studio-back-btn"
				aria-label="Kembali ke daftar studio"
			>
				<span class="material-symbols-rounded" style="font-size:16px;">arrow_back</span>
				Studio
			</button>

			<div class="studio-topbar-sep"></div>

			<div class="studio-episode-info">
				{#if episode?.anime?.title}
					<span class="studio-anime-title">{episode.anime.title}</span>
					<span class="studio-sep">·</span>
				{/if}
				<span class="studio-ep-label">
					Ep {episode?.number ?? episodeId}
					{#if episode?.title}
						<span class="studio-ep-title">— {episode.title}</span>
					{/if}
				</span>
			</div>
		</div>

		<div class="studio-topbar-right">
			{#if dirty}
				<div class="studio-dirty-pill">
					<span class="studio-dirty-dot"></span>
					Belum disimpan
				</div>
			{:else if !isLoading}
				<div class="studio-saved-pill">
					<span class="material-symbols-rounded" style="font-size:13px;">cloud_done</span>
					Tersimpan
				</div>
			{/if}

			<button
				onclick={saveNow}
				disabled={!dirty || isSaving || !activeTrack}
				class="studio-save-btn {isSaving ? 'is-saving' : ''}"
				aria-label="Simpan subtitle"
			>
				{#if isSaving}
					<span class="studio-spinner"></span>
					Menyimpan...
				{:else}
					<span class="material-symbols-rounded" style="font-size:15px;">save</span>
					Simpan
				{/if}
			</button>

			<!-- Panel toggles — only shown when that zone has content -->
			{#if layout.zones.left.length > 0}
				<button
					onclick={() => layout.toggleLeft()}
					class="studio-icon-btn {layout.visible.left ? 'active' : ''}"
					title="Toggle panel kiri (Ctrl+B)"
				>
					<span class="material-symbols-rounded" style="font-size:18px;">left_panel_open</span>
				</button>
			{/if}
			{#if layout.zones.right.length > 0}
				<button
					onclick={() => layout.toggleRight()}
					class="studio-icon-btn {layout.visible.right ? 'active' : ''}"
					title="Toggle panel kanan (Ctrl+Alt+T)"
				>
					<span class="material-symbols-rounded" style="font-size:18px;">
						{layout.visible.right ? 'right_panel_close' : 'right_panel_open'}
					</span>
				</button>
			{/if}
		</div>
	</header>

	<!-- ══════════════════════════════════════════
         EDITOR BODY
    ══════════════════════════════════════════ -->
	{#if !isLoading && !servers.length}
		<div class="studio-empty">
			<span class="material-symbols-rounded studio-empty-icon">videocam_off</span>
			<p class="studio-empty-title">Tidak ada server video</p>
			<p class="studio-empty-desc">Episode ini belum memiliki server video yang terdaftar.</p>
			<button onclick={() => goto('/admin/subtitle-studio')} class="studio-empty-back">
				Kembali
			</button>
		</div>
	{:else if servers.length > 0}
		<!-- ── STUDIO LAYOUT ENGINE ── -->
		<StudioLayout>
			<!-- Track & AI section -->
			{#snippet track()}
				<div class="sb-pm-server">
					<label class="sb-label" for="studio-server-select">Server</label>
					<select
						id="studio-server-select"
						value={activeServerUrl}
						onchange={(e) => selectServer(e.currentTarget.value)}
						class="sb-select"
					>
						{#each servers as server}
							<option value={server.value}>{server.label}</option>
						{/each}
					</select>
				</div>
				<LanguageTrackPanel
					{episodeId}
					{activeServerUrl}
					activeServerId={activeServer?.id}
					{tracks}
					{cues}
					{activeTrackId}
					{activeTrack}
					inline={true}
					bind:newLang
					bind:newLabel
					bind:aiInstructionDraft
					bind:selectedAiTextModel
					bind:selectedAiTranscribeModel
					{aiMessages}
					{isAutoGenerating}
					{isAiRevising}
					{isAiResponding}
					{aiPendingMode}
					{aiPendingStage}
					{aiTypingPreview}
					{autoGenerateStatus}
					{autoGenerateProgress}
					{autoGenerateStage}
					{autoGenerateMessage}
					{autoGenerateError}
					onSelectTrack={selectTrack}
					onAddTrack={addTrack}
					onAutoGenerate={autoGenerateNow}
					onSendAiInstruction={sendAiInstruction}
					onStopGenerating={stopGenerating}
					onDeleteAllCues={removeAllCuesInActiveTrack}
				/>
			{/snippet}

			<!-- Subtitle Source section -->
			{#snippet source()}
				<div class="sb-source-panel">
					<div class="sb-source-grid">
						<div class="sb-source-card">
							<small>Track</small>
							<strong>{trackSourceSummary.label}</strong>
						</div>
						<div class="sb-source-card">
							<small>Active Cue</small>
							<strong>{activeCueSourceLabel}</strong>
						</div>
					</div>
					<div class="sb-source-stats">
						<span class="sb-source-chip">Manual {trackSourceSummary.counts.manual}</span>
						<span class="sb-source-chip">Transcribe {trackSourceSummary.counts.aiTranscribe}</span>
						<span class="sb-source-chip">Translate {trackSourceSummary.counts.aiTranslate}</span>
					</div>
				</div>
			{/snippet}

			<!-- Import section -->
			{#snippet importSection()}
				<div class="sb-import-panel">
					<div class="sb-import-tabs" role="tablist" aria-label="Import source">
						{#each importModeOptions as item}
							<button
								type="button"
								role="tab"
								aria-selected={importMode === item.id}
								class="sb-import-tab {importMode === item.id ? 'is-active' : ''}"
								onclick={() => (importMode = item.id)}
							>
								<span class="material-symbols-rounded">{item.icon}</span>
								{item.label}
							</button>
						{/each}
					</div>

					{#if importMode === 'file'}
						<div class="sb-import-row">
							<label class="sb-dropzone">
								<span class="material-symbols-rounded" style="font-size:16px; color: var(--sb-accent);">
									{importFile ? 'task' : 'upload_file'}
								</span>
								<span class="sb-dropzone-label">{importFile?.name ?? 'Pilih SRT/VTT'}</span>
								<input
									type="file"
									accept=".srt,.vtt,text/vtt"
									class="sb-file-input"
									onchange={(e) => (importFile = e.currentTarget.files?.[0] ?? null)}
								/>
							</label>
						</div>
					{:else if importMode === 'url'}
						<label class="sb-import-field">
							<span class="sb-field-label">Subtitle URL</span>
							<input
								class="sb-input"
								type="url"
								placeholder="https://example.com/subtitle.vtt"
								bind:value={importUrl}
							/>
						</label>
					{:else}
						<label class="sb-import-field">
							<span class="sb-field-label">Subtitle Text</span>
							<textarea
								class="sb-textarea sb-import-textarea"
								rows="7"
								placeholder="WEBVTT&#10;&#10;00:00:01.000 --> 00:00:03.000&#10;Teks subtitle..."
								bind:value={importText}
							></textarea>
						</label>
					{/if}

					<div class="sb-import-actions">
						<button
							type="button"
							onclick={importSubtitleNow}
							disabled={!canImportSubtitle()}
							class="sb-btn-primary sb-btn-sm"
						>
							{isImporting ? 'Importing...' : 'Import'}
						</button>
					</div>
				</div>
			{/snippet}

			<!-- Cue Editor section -->
			{#snippet cue()}
				{#if activeCue}
					<div class="sb-cue-form">
						<div class="sb-timing-row">
							<label class="sb-field">
								<span class="sb-field-label">Start (s)</span>
								<input
									value={activeCue.startTime}
									type="number"
									step="0.05"
									oninput={(e) => updateCue({ startTime: Number(e.currentTarget.value) })}
									class="sb-input sb-input-mono"
									style="width: 96px;"
								/>
							</label>
							<span class="sb-timing-arrow">→</span>
							<label class="sb-field">
								<span class="sb-field-label">End (s)</span>
								<input
									value={activeCue.endTime}
									type="number"
									step="0.05"
									oninput={(e) => updateCue({ endTime: Number(e.currentTarget.value) })}
									class="sb-input sb-input-mono"
									style="width: 96px;"
								/>
							</label>
							<label class="sb-field">
								<span class="sb-field-label">Durasi</span>
								<div class="sb-duration-chip">
									{(activeCue.endTime - activeCue.startTime).toFixed(2)}s
								</div>
							</label>
						</div>
						<textarea
							value={activeCue.text}
							oninput={(e) => updateCue({ text: e.currentTarget.value })}
							class="sb-textarea"
							placeholder="Teks subtitle..."
							rows="2"
						></textarea>
						<div class="sb-cue-origin">
							<span class="material-symbols-rounded">info</span>
							<span>Sumber: {activeCueSourceLabel}</span>
						</div>
					</div>
				{:else}
					<p class="sb-empty-note">Klik cue di timeline untuk edit timing dan teks.</p>
				{/if}
			{/snippet}

			<!-- Video / Center -->
			{#snippet video()}
				<div class="sl-video-area">
					{#if playerSrc}
						<div class="studio-player-shell">
							<VideoPlayer
								src={playerSrc}
								poster=""
								title={episode?.title || episode?.anime?.title || 'Subtitle Studio Preview'}
								autoPlay={false}
								forceHls
								config={playerConfig}
								bind:playerApi
								bind:videoElement={playerVideoEl}
								externalSubtitleLines={playerOverlayLines}
								preferExternalSubtitles={true}
								onStateChange={syncPlaybackState}
							/>
						</div>
					{:else}
						<div class="studio-player-empty">
							<span class="material-symbols-rounded">videocam_off</span>
							<p>Server video belum siap</p>
						</div>
					{/if}
				</div>
			{/snippet}

			<!-- Timeline / Bottom -->
			{#snippet timeline()}
				<TimelineEditor
					bind:cues
					{duration}
					{currentTime}
					{isPlaying}
					aiBusy={isAutoGenerating || isAiRevising}
					bind:selectedCueId
					onSeek={seek}
					onTogglePlayback={togglePlayback}
					onDirty={markDirty}
					onRemoveCue={removeCue}
					onCueSelect={mentionCueTime}
					onRequestAiGenerate={generateSelectionWithAi}
					onRequestCueTextTranslate={translateCueTextWithAi}
					onRegisterCueSource={({ cues: nextCues, source }) =>
						registerCueSources(activeTrackId, source, nextCues)}
				/>
			{/snippet}
		</StudioLayout>
	{/if}

	{#if showStudioBootOverlay}
		<div class="studio-loading">
			<div class="studio-loading-shell">
				<div class="studio-loading-spinner"></div>
				<div class="studio-loading-copy">
					<p class="studio-loading-stage">{loadingStage}</p>
					<p class="studio-loading-detail">{loadingDetail}</p>
				</div>
				<div class="studio-loading-meter" aria-hidden="true">
					<div class="studio-loading-meter-fill" style:width={`${loadingPercent}%`}></div>
				</div>
				<div class="studio-loading-meta">
					<span>{loadingPercent}%</span>
					<span>{playerSrc ? 'Player warmup' : 'Studio boot'}</span>
				</div>
			</div>
		</div>
	{/if}
</div>
