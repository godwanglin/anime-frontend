import { adminApi, toQuery } from '$lib/admin/api';
import config from '$lib/config';
import { auth } from '$lib/stores/auth.svelte';
import type { StudioSubtitle } from '$lib/subtitle-studio';

export type EpisodeSummary = {
	id: number;
	animeId?: number;
	number?: number;
	title: string;
	slug?: string;
	status?: string;
	views?: number;
	createdAt?: string;
	updatedAt?: string;
	anime?: { id: number; title: string };
	_count?: { servers?: number; subtitles?: number; subtitleTracks?: number };
};

export type EpisodeListParams = {
	page?: number;
	limit?: number;
	search?: string;
	animeId?: string;
	episodeNumber?: string;
	numberFrom?: string;
	numberTo?: string;
	status?: string;
	hasVideo?: string;
	hasSubtitle?: string;
	sortBy?: string;
};

export type VideoServer = {
	id: number;
	label: string;
	value: string;
	isPrimary: boolean;
};

export type SubtitleDraft = {
	episodeId: number;
	serverUrl: string;
	language: string;
	label: string;
	fileUrl?: string;
	file?: File | null;
};

export type SubtitleCue = {
	id?: number;
	startTime: number;
	endTime: number;
	text: string;
	orderIndex?: number;
};

export type SubtitleTrack = {
	id: number;
	episodeId: number;
	serverUrl: string;
	language: string;
	label: string;
	cues: SubtitleCue[];
	createdAt?: string;
	updatedAt?: string;
};

export type SubtitleAiTextModel = '' | 'gpt-5.4-mini' | 'gpt-5.4' | 'gpt-4o-mini';
export type SubtitleAiTranscribeModel = '' | 'whisper-1' | 'gpt-4o-transcribe-diarize';

export const subtitleAiTextModelOptions: Array<{
	value: SubtitleAiTextModel;
	label: string;
	description?: string;
	meta?: string;
	features?: string[];
}> = [
	{
		value: '',
		label: 'Auto model',
		description: 'Ikuti default backend untuk subtitle AI.',
		meta: 'Default',
		features: [
			'Cocok kalau mau cepat jalan',
			'Ikut setting global server',
			'Tanpa pilih model manual'
		]
	},
	{
		value: 'gpt-5.4-mini',
		label: 'GPT-5.4 Mini',
		description: 'Cepat dan hemat untuk translate/revisi harian.',
		meta: 'Balanced',
		features: ['Cepat untuk cue pendek', 'Hemat token', 'Pas untuk revisi rutin']
	},
	{
		value: 'gpt-5.4',
		label: 'GPT-5.4',
		description: 'Lebih kuat untuk arahan subtitle yang kompleks.',
		meta: 'Best',
		features: [
			'Lebih stabil untuk instruksi rumit',
			'Tone dan naming lebih konsisten',
			'Bagus untuk cue ambigu'
		]
	},
	{
		value: 'gpt-4o-mini',
		label: 'GPT-4o Mini',
		description: 'Ringan untuk tugas subtitle yang fokus.',
		meta: 'Fastest',
		features: ['Respon ringan', 'Cocok untuk perubahan kecil', 'Biaya lebih irit']
	}
];

export const subtitleAiTranscribeModelOptions: Array<{
	value: SubtitleAiTranscribeModel;
	label: string;
	description?: string;
	meta?: string;
	features?: string[];
}> = [
	{
		value: '',
		label: 'Auto transcribe',
		description: 'Pilih mode paling aman untuk cue bertimestamp.',
		meta: 'Recommended',
		features: ['Ikut mode aman backend', 'Fokus ke cue timeline', 'Minim error format']
	},
	{
		value: 'whisper-1',
		label: 'Whisper-1',
		description: 'Support segment timestamps paling stabil untuk subtitle.',
		meta: 'Stable',
		features: [
			'Paling aman untuk subtitle cue',
			'Format timestamp matang',
			'Bagus untuk episode panjang'
		]
	},
	{
		value: 'gpt-4o-transcribe-diarize',
		label: 'GPT-4o Diarize',
		description: 'Ada speaker segment + timestamp, cocok untuk dialog multi pembicara.',
		meta: 'Speaker-aware',
		features: ['Ada segment pembicara', 'Enak untuk dialog ramai', 'Masih aman untuk timeline']
	}
];

export const subtitleAiUnsupportedTranscribeOptions = [
	{
		label: 'GPT-4o Transcribe',
		description:
			'Belum dipakai di editor ini karena output HTTP resminya tidak memberi segment timestamps.'
	},
	{
		label: 'GPT-4o Mini Transcribe',
		description:
			'Sama seperti GPT-4o Transcribe, bagus untuk teks mentah tapi belum pas untuk cue timeline.'
	}
];

export type AutoGenerateJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AiInstructionMessage = {
	role: 'user' | 'assistant';
	content: string;
	createdAt?: string;
};

export type AiInstructionContext = {
	animeTitle?: string;
	episodeTitle?: string;
	episodeNumber?: number | string;
	targetLanguage?: string;
	targetLabel?: string;
	currentTime?: number;
};

export type AutoGenerateJob = {
	id: string;
	status: AutoGenerateJobStatus;
	progress: number;
	stage: string;
	message: string;
	episodeId: number | null;
	serverUrl: string;
	language: string;
	label: string;
	totalChunks: number;
	processedChunks: number;
	track: SubtitleTrack | null;
	error: string | null;
	createdAt: string;
	updatedAt: string;
	finishedAt: string | null;
};

export type AiRevisionResult = {
	track: SubtitleTrack;
	message: string;
	changedCount: number;
	target?: {
		matchedBy?: string;
		startTime?: number;
		endTime?: number;
		cueCount?: number;
		audioStartTime?: number;
		audioEndTime?: number;
		audioSegmentCount?: number;
	};
};

export type SubtitleAiRangeGenerateResult = {
	episodeId: number;
	serverUrl: string;
	rangeStart: number;
	rangeEnd: number;
	durationSeconds: number;
	translated: boolean;
	segmentCount: number;
	message: string;
	cues: SubtitleCue[];
};

export type SubtitleAiTextTranslateResult = {
	translated: boolean;
	cueCount: number;
	message: string;
	cues: SubtitleCue[];
};

export type AiRevisionStreamStage =
	| 'preparing'
	| 'audio'
	| 'thinking'
	| 'streaming'
	| 'applying'
	| 'completed'
	| 'aborted'
	| 'error';

export type AiRevisionStreamEvent =
	| { event: 'stage'; data: { stage: AiRevisionStreamStage; message: string } }
	| { event: 'delta'; data: { text: string; fullText?: string } }
	| { event: 'done'; data: AiRevisionResult }
	| { event: 'aborted'; data: { message: string } }
	| { event: 'error'; data: { message: string } };

async function apiEnvelope<T>(path: string, init: RequestInit = {}) {
	if (!auth.accessToken) await auth.refreshToken();
	const response = await auth.authFetch(`/api${path}`, init);
	const payload = (await response.json().catch(() => null)) as {
		data?: T;
		message?: string | null;
	} | null;
	if (!response.ok) throw new Error(payload?.message ?? 'Request subtitle gagal');
	return (payload?.data ?? payload) as T;
}

export async function listEpisodes(params: EpisodeListParams = {}) {
	return adminApi<EpisodeSummary[]>(
		`/episodes${toQuery({ page: 1, limit: 20, hasVideo: true, ...params })}`
	);
}

export async function getEpisode(episodeId: number) {
	return adminApi<EpisodeSummary>(`/episodes/${episodeId}`);
}

export async function getServers(episodeId: number) {
	return adminApi<VideoServer[]>(`/episodes/${episodeId}/servers`);
}

export async function getSubtitles(episodeId: number) {
	return adminApi<StudioSubtitle[]>(`/subtitles${toQuery({ episodeId })}`);
}

export async function createSubtitle(draft: SubtitleDraft) {
	const form = new FormData();
	form.set('episodeId', String(draft.episodeId));
	form.set('serverUrl', draft.serverUrl);
	form.set('language', draft.language.trim().toLowerCase());
	form.set('label', draft.label.trim());
	if (draft.file) form.set('file', draft.file);
	if (draft.fileUrl) form.set('fileUrl', draft.fileUrl.trim());

	return adminApi<StudioSubtitle>('/subtitles', {
		method: 'POST',
		body: form
	});
}

export async function updateSubtitle(id: number, payload: Partial<StudioSubtitle>) {
	return adminApi<StudioSubtitle>(`/subtitles/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function deleteSubtitle(id: number) {
	return adminApi(`/subtitles/${id}`, { method: 'DELETE' });
}

export async function importSubtitle(payload: {
	episodeId: number;
	fromServerUrl: string;
	toServerUrl: string;
	language: string;
}) {
	return adminApi<StudioSubtitle>('/subtitles/import', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function getEditorTracks(episodeId: number, serverUrl: string) {
	return apiEnvelope<{ tracks: SubtitleTrack[] }>(
		`/subtitles/${episodeId}/${encodeURIComponent(serverUrl)}`
	);
}

export async function createTrack(payload: {
	episodeId: number;
	serverUrl: string;
	language: string;
	label: string;
}) {
	return apiEnvelope<SubtitleTrack>('/subtitles/track', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function saveTrackCues(trackId: number, cues: SubtitleCue[]) {
	return apiEnvelope<SubtitleTrack>('/subtitles/save', {
		method: 'POST',
		body: JSON.stringify({ trackId, cues })
	});
}

export async function deleteCue(cueId: number) {
	return apiEnvelope('/subtitles/cue/' + cueId, { method: 'DELETE' });
}

export async function importTrackFile(payload: {
	episodeId: number;
	serverUrl: string;
	language: string;
	label: string;
	file: File;
}) {
	const form = new FormData();
	form.set('episodeId', String(payload.episodeId));
	form.set('serverUrl', payload.serverUrl);
	form.set('language', payload.language);
	form.set('label', payload.label);
	form.set('file', payload.file);
	return apiEnvelope<SubtitleTrack>('/subtitles/import', { method: 'POST', body: form });
}

export async function startAutoGenerateTrack(payload: {
	episodeId: number;
	serverUrl: string;
	language: string;
	label: string;
	sourceLanguage?: string;
	transcribeModel?: SubtitleAiTranscribeModel;
	textModel?: SubtitleAiTextModel;
	instructions?: string;
	instructionMessages?: AiInstructionMessage[];
	context?: AiInstructionContext;
}) {
	return apiEnvelope<AutoGenerateJob>('/subtitles/auto-generate', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function getAutoGenerateTrackJob(jobId: string) {
	return apiEnvelope<AutoGenerateJob>(`/subtitles/auto-generate/${jobId}`);
}

export async function reviseSubtitleTrack(payload: {
	trackId: number;
	instruction: string;
	messages?: AiInstructionMessage[];
	currentTime?: number;
	selectedCueId?: number | null;
	sourceLanguage?: string;
	textModel?: SubtitleAiTextModel;
	context?: AiInstructionContext;
}) {
	return apiEnvelope<AiRevisionResult>('/subtitles/ai-revise', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function generateSubtitleSelection(payload: {
	episodeId: number;
	serverUrl: string;
	rangeStart: number;
	rangeEnd: number;
	language?: string;
	label?: string;
	sourceLanguage?: string;
	transcribeModel?: SubtitleAiTranscribeModel;
	textModel?: SubtitleAiTextModel;
	instructions?: string;
	context?: AiInstructionContext;
	translate?: boolean;
}) {
	return apiEnvelope<SubtitleAiRangeGenerateResult>('/subtitle/ai/generate', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function translateSubtitleCueText(payload: {
	language?: string;
	label?: string;
	textModel?: SubtitleAiTextModel;
	instructions?: string;
	context?: AiInstructionContext;
	cues: SubtitleCue[];
}) {
	return apiEnvelope<SubtitleAiTextTranslateResult>('/subtitle/ai/translate-text', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function openReviseSubtitleTrackStream(
	payload: {
		trackId: number;
		instruction: string;
		messages?: AiInstructionMessage[];
		currentTime?: number;
		selectedCueId?: number | null;
		sourceLanguage?: string;
		textModel?: SubtitleAiTextModel;
		context?: AiInstructionContext;
	},
	signal?: AbortSignal
) {
	if (!auth.accessToken) await auth.refreshToken();
	const response = await auth.authFetch('/api/subtitles/ai-revise-stream', {
		method: 'POST',
		body: JSON.stringify(payload),
		signal
	});
	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as { message?: string | null } | null;
		throw new Error(payload?.message ?? 'Request stream subtitle gagal');
	}
	return response;
}

export function subtitleVttUrl(episodeId: number, serverUrl: string, language: string) {
	return `${config.API_BASE_URL}/api/subtitle/${episodeId}/${encodeURIComponent(serverUrl)}/${language}.vtt`;
}
