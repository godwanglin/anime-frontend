<script lang="ts">
	import {
		subtitleVttUrl,
		type AiInstructionMessage,
		type SubtitleAiTranscribeModel,
		type SubtitleAiTextModel,
		type SubtitleCue,
		type SubtitleTrack
	} from '$lib/admin/subtitle-studio';
	import AiInstructionChat from './AiInstructionChat.svelte';
	import FloatingAiInstructionChat from './FloatingAiInstructionChat.svelte';

	let {
		episodeId,
		activeServerUrl,
		activeServerId,
		tracks,
		cues = [],
		activeTrackId,
		activeTrack,
		open = $bindable(false),
		inline = false,
		newLang = $bindable('id'),
		newLabel = $bindable('Indonesia'),
		aiInstructionDraft = $bindable(''),
		selectedAiTextModel = $bindable<SubtitleAiTextModel>(''),
		selectedAiTranscribeModel = $bindable<SubtitleAiTranscribeModel>(''),
		aiMessages = [],
		isAutoGenerating = false,
		isAiRevising = false,
		isAiResponding = false,
		aiPendingMode = 'idle',
		aiPendingStage = '',
		aiTypingPreview = '',
		autoGenerateStatus = 'idle',
		autoGenerateProgress = 0,
		autoGenerateStage = '',
		autoGenerateMessage = '',
		autoGenerateError = '',
		onSelectTrack,
		onAddTrack,
		onAutoGenerate,
		onSendAiInstruction,
		onStopGenerating,
		onDeleteAllCues = () => null
	}: {
		episodeId: number;
		activeServerUrl: string;
		activeServerId?: number;
		tracks: SubtitleTrack[];
		cues?: SubtitleCue[];
		activeTrackId: number | null;
		activeTrack: SubtitleTrack | null;
		open?: boolean;
		inline?: boolean;
		newLang: string;
		newLabel: string;
		aiInstructionDraft: string;
		selectedAiTextModel: SubtitleAiTextModel;
		selectedAiTranscribeModel: SubtitleAiTranscribeModel;
		aiMessages?: AiInstructionMessage[];
		isAutoGenerating?: boolean;
		isAiRevising?: boolean;
		isAiResponding?: boolean;
		aiPendingMode?: 'idle' | 'thinking' | 'typing';
		aiPendingStage?: string;
		aiTypingPreview?: string;
		autoGenerateStatus?: 'idle' | 'queued' | 'running' | 'completed' | 'failed';
		autoGenerateProgress?: number;
		autoGenerateStage?: string;
		autoGenerateMessage?: string;
		autoGenerateError?: string;
		onSelectTrack: (id: number) => void;
		onAddTrack: () => void;
		onAutoGenerate: () => void;
		onSendAiInstruction: () => void;
		onStopGenerating: () => void;
		onDeleteAllCues?: () => void;
	} = $props();

	let aiChatDetached = $state(false);
</script>

{#snippet trackBody()}
	<div class="sb-track-pills">
		{#each tracks as track}
			<button
				onclick={() => onSelectTrack(track.id)}
				class="sb-pill {activeTrackId === track.id ? 'active' : ''}"
			>
				{track.label}
				<span class="sb-pill-lang">({track.language})</span>
			</button>
		{:else}
			<p class="sb-empty-note">Belum ada track.</p>
		{/each}

		{#if activeTrack}
			<a
				href={subtitleVttUrl(episodeId, activeServerUrl, activeTrack.language, activeServerId)}
				target="_blank"
				rel="noreferrer"
				class="sb-pill sb-pill-export"
				title="Export VTT"
			>
				<span class="material-symbols-rounded" style="font-size:12px;">download</span>
				VTT
			</a>
			{#if cues.length > 0}
				<button
					type="button"
					onclick={onDeleteAllCues}
					class="sb-pill sb-pill-danger"
					title={`Hapus semua ${cues.length} cue di track ${activeTrack.label}`}
				>
					<span class="material-symbols-rounded" style="font-size:12px;">delete_sweep</span>
					Hapus Semua ({cues.length})
				</button>
			{/if}
		{/if}
	</div>

	<div class="sb-track-form">
		<input bind:value={newLang} placeholder="id" class="sb-input sb-input-sm" style="width: 54px;" />
		<input
			bind:value={newLabel}
			placeholder="Indonesia"
			class="sb-input sb-input-sm"
			style="flex: 1; min-width: 80px;"
		/>
		<button onclick={onAddTrack} class="sb-btn-primary sb-btn-sm">
			<span class="material-symbols-rounded" style="font-size:13px;">add</span>
			Buat / update
		</button>
	</div>

	<div class="sb-ai-dock-actions">
		<button
			type="button"
			class="sb-btn-secondary sb-btn-sm"
			onclick={() => (aiChatDetached = !aiChatDetached)}
		>
			<span class="material-symbols-rounded" style="font-size:13px;">
				{aiChatDetached ? 'keyboard_tab_rtl' : 'open_in_new'}
			</span>
			{aiChatDetached ? 'Masukkan chat' : 'Pop out chat'}
		</button>
	</div>

	{#if aiChatDetached}
		<div class="sb-ai-detached-note">Chat AI sedang melayang. Kamu bisa drag dan resize.</div>
	{:else}
		<AiInstructionChat
			{cues}
			{activeTrack}
			{activeServerUrl}
			messages={aiMessages}
			{isAutoGenerating}
			{isAiRevising}
			{isAiResponding}
			{aiPendingMode}
			{aiPendingStage}
			{aiTypingPreview}
			bind:draft={aiInstructionDraft}
			bind:selectedAiTextModel
			bind:selectedAiTranscribeModel
			{onAutoGenerate}
			{onSendAiInstruction}
			{onStopGenerating}
		/>
	{/if}

	{#if autoGenerateStatus !== 'idle'}
		<div class="sb-auto-status {autoGenerateStatus === 'failed' ? 'is-failed' : ''}">
			<div class="sb-auto-status-top">
				<span class="sb-auto-stage">{autoGenerateStage || 'queued'}</span>
				<span class="sb-auto-percent">{Math.round(autoGenerateProgress)}%</span>
			</div>
			<div
				class="sb-auto-progress"
				role="progressbar"
				aria-valuenow={Math.round(autoGenerateProgress)}
				aria-valuemin="0"
				aria-valuemax="100"
			>
				<div
					class="sb-auto-progress-fill"
					style={`width:${Math.max(0, Math.min(100, autoGenerateProgress))}%`}
				></div>
			</div>
			<p class="sb-auto-message">{autoGenerateError || autoGenerateMessage}</p>
		</div>
	{/if}
{/snippet}

{#if inline}
	<!-- Inline mode: content rendered directly, no toggle button -->
	{@render trackBody()}
{:else}
	<!-- Dropdown mode: toggle button + absolute panel -->
	<div class="sb-group sb-group-track">
		<button
			class="sb-section-toggle {open ? 'is-open' : ''}"
			onclick={(event) => {
				event.stopPropagation();
				open = !open;
			}}
			aria-expanded={open}
		>
			<span class="material-symbols-rounded sb-section-icon">subtitles</span>
			<span class="sb-section-label">Language Track</span>
			<span class="material-symbols-rounded sb-chevron">expand_more</span>
		</button>

		{#if open}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="sb-panel"
				role="presentation"
				onclick={(event) => event.stopPropagation()}
				onkeydown={(event) => event.stopPropagation()}
			>
				{@render trackBody()}
			</div>
		{/if}
	</div>
{/if}

{#if aiChatDetached}
	<FloatingAiInstructionChat
		{cues}
		{activeTrack}
		{activeServerUrl}
		messages={aiMessages}
		{isAutoGenerating}
		{isAiRevising}
		{isAiResponding}
		{aiPendingMode}
		{aiPendingStage}
		{aiTypingPreview}
		bind:draft={aiInstructionDraft}
		bind:selectedAiTextModel
		bind:selectedAiTranscribeModel
		{onAutoGenerate}
		{onSendAiInstruction}
		{onStopGenerating}
		onClose={() => (aiChatDetached = false)}
	/>
{/if}
