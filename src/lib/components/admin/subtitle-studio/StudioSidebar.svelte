<script lang="ts">
	import './css/sb.css';
	import type {
		AiInstructionMessage,
		SubtitleAiTranscribeModel,
		SubtitleAiTextModel,
		SubtitleCue,
		SubtitleTrack,
		VideoServer
	} from '$lib/admin/subtitle-studio';
	import LanguageTrackPanel from './LanguageTrackPanel.svelte';
	import { layout } from './layout/store.svelte';

	type TabId = 'track' | 'source' | 'import' | 'cue';

	let {
		episodeId,
		servers,
		activeServerUrl,
		tracks,
		cues = [],
		activeTrackId,
		activeTrack,
		activeCue,
		panelMode = false,
		panelId = undefined as string | undefined,
		trackSourceLabel = 'Import / Manual',
		trackSourceCounts = { manual: 0, aiTranscribe: 0, aiTranslate: 0 },
		activeCueSourceLabel = 'Import / Manual',
		newLang = $bindable('id'),
		newLabel = $bindable('Indonesia'),
		aiInstructionDraft = $bindable(''),
		selectedAiTextModel = $bindable<SubtitleAiTextModel>(''),
		selectedAiTranscribeModel = $bindable<SubtitleAiTranscribeModel>(''),
		importFile = $bindable<File | null>(null),
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
		onSelectServer,
		onSelectTrack,
		onAddTrack,
		onAutoGenerate,
		onSendAiInstruction,
		onStopGenerating,
		onImport,
		onUpdateCue
	}: {
		episodeId: number;
		servers: VideoServer[];
		activeServerUrl: string;
		tracks: SubtitleTrack[];
		cues?: SubtitleCue[];
		activeTrackId: number | null;
		activeTrack: SubtitleTrack | null;
		activeCue: SubtitleCue | null;
		panelMode?: boolean;
		panelId?: string;
		trackSourceLabel?: string;
		trackSourceCounts?: { manual: number; aiTranscribe: number; aiTranslate: number };
		activeCueSourceLabel?: string;
		newLang: string;
		newLabel: string;
		aiInstructionDraft: string;
		selectedAiTextModel: SubtitleAiTextModel;
		selectedAiTranscribeModel: SubtitleAiTranscribeModel;
		importFile: File | null;
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
		onSelectServer: (serverUrl: string) => void;
		onSelectTrack: (id: number) => void;
		onAddTrack: () => void;
		onAutoGenerate: () => void;
		onSendAiInstruction: () => void;
		onStopGenerating: () => void;
		onImport: () => void;
		onUpdateCue: (patch: Partial<SubtitleCue>) => void;
	} = $props();

	// Dropdown mode state
	let openTrack = $state(false);
	let openSource = $state(false);
	let openImport = $state(false);
	let openCue = $state(false);

	// Panel mode state
	let activeTab = $state<TabId>('track');

	function handleOutsideClick(e: MouseEvent) {
		// Close context menu if click is outside it
		if (ctxMenu) {
			const target = e.target as HTMLElement;
			if (!target.closest('.sb-ctx-menu')) ctxMenu = null;
		}

		if (panelMode) return;
		const target = e.target as HTMLElement;
		if (!target.closest('.sb-group')) {
			openTrack = false;
			openSource = false;
			openImport = false;
			openCue = false;
		}
	}

	function toggleTab(id: TabId) {
		activeTab = activeTab === id ? activeTab : id;
	}

	// ── Context menu ──────────────────────────────────────────
	type CtxPos = { x: number; y: number };
	let ctxMenu = $state<CtxPos | null>(null);

	function openCtxMenu(e: MouseEvent) {
		if (!panelId) return;
		e.preventDefault();
		ctxMenu = { x: e.clientX, y: e.clientY };
	}

	function closeCtxMenu() {
		ctxMenu = null;
	}

	function ctxMoveTo(_zone: 'left' | 'right') {
		closeCtxMenu();
	}

	// Derive which zone this panel is currently in
	const currentZone = $derived(
		panelId
			? layout.zones.left.includes(panelId as never)
				? 'left'
				: layout.zones.right.includes(panelId as never)
					? 'right'
					: null
			: null
	);
</script>

<svelte:window onclick={handleOutsideClick} />

{#if panelMode}
	<!-- ── Panel mode: vertical column with tab bar ── -->
	<div class="sb-root sb-root-panel">
		<!-- Server row always visible at top -->
		<div class="sb-pm-server">
			<label class="sb-label">Server</label>
			<select
				value={activeServerUrl}
				onchange={(e) => onSelectServer(e.currentTarget.value)}
				class="sb-select"
			>
				{#each servers as server}
					<option value={server.value}>{server.label}</option>
				{/each}
			</select>
		</div>

		<!-- Scrollable tab bar (right-click = move panel) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sb-tab-bar" oncontextmenu={openCtxMenu}>
			<button
				class="sb-tab-btn {activeTab === 'track' ? 'is-active' : ''}"
				onclick={() => toggleTab('track')}
				title="Language Track"
			>
				<span class="material-symbols-rounded">subtitles</span>
				Track
			</button>
			<button
				class="sb-tab-btn {activeTab === 'source' ? 'is-active' : ''}"
				onclick={() => toggleTab('source')}
				title="Subtitle Source"
			>
				<span class="material-symbols-rounded">fingerprint</span>
				Source
			</button>
			<button
				class="sb-tab-btn {activeTab === 'import' ? 'is-active' : ''}"
				onclick={() => toggleTab('import')}
				title="Import"
			>
				<span class="material-symbols-rounded">upload_file</span>
				Import
				{#if importFile}<span class="sb-tab-dot"></span>{/if}
			</button>
			<button
				class="sb-tab-btn {activeTab === 'cue' ? 'is-active' : ''}"
				onclick={() => toggleTab('cue')}
				title="Cue Editor"
			>
				<span class="material-symbols-rounded">edit_note</span>
				Cue
				{#if activeCue}<span class="sb-tab-dot"></span>{/if}
			</button>
		</div>

		<!-- Tab content area -->
		<div class="sb-panel-content">
			{#if activeTab === 'track'}
				<LanguageTrackPanel
					{episodeId}
					{activeServerUrl}
					{tracks}
					{cues}
					{activeTrackId}
					{activeTrack}
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
					inline={true}
					bind:newLang
					bind:newLabel
					bind:aiInstructionDraft
					bind:selectedAiTextModel
					bind:selectedAiTranscribeModel
					{onSelectTrack}
					{onAddTrack}
					{onAutoGenerate}
					{onSendAiInstruction}
					{onStopGenerating}
				/>
			{:else if activeTab === 'source'}
				<div class="sb-source-panel">
					<div class="sb-source-grid">
						<div class="sb-source-card">
							<small>Track</small>
							<strong>{trackSourceLabel}</strong>
						</div>
						<div class="sb-source-card">
							<small>Active Cue</small>
							<strong>{activeCueSourceLabel}</strong>
						</div>
					</div>
					<div class="sb-source-stats">
						<span class="sb-source-chip">Manual {trackSourceCounts.manual}</span>
						<span class="sb-source-chip">Transcribe {trackSourceCounts.aiTranscribe}</span>
						<span class="sb-source-chip">Translate {trackSourceCounts.aiTranslate}</span>
					</div>
				</div>
			{:else if activeTab === 'import'}
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
					<button onclick={onImport} disabled={!importFile} class="sb-btn-primary sb-btn-sm">
						Import
					</button>
				</div>
			{:else if activeTab === 'cue'}
				{#if activeCue}
					<div class="sb-cue-form">
						<div class="sb-timing-row">
							<label class="sb-field">
								<span class="sb-field-label">Start (s)</span>
								<input
									value={activeCue.startTime}
									type="number"
									step="0.05"
									oninput={(e) => onUpdateCue({ startTime: Number(e.currentTarget.value) })}
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
									oninput={(e) => onUpdateCue({ endTime: Number(e.currentTarget.value) })}
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
							oninput={(e) => onUpdateCue({ text: e.currentTarget.value })}
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
					<p class="sb-empty-note">Klik cue di timeline untuk edit.</p>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Context menu overlay -->
	{#if ctxMenu && panelId}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="sb-ctx-menu"
			style="left:{ctxMenu.x}px; top:{ctxMenu.y}px"
			oncontextmenu={(e) => e.preventDefault()}
		>
			<button
				class="sb-ctx-item {currentZone === 'left' ? 'is-current' : ''}"
				onclick={() => ctxMoveTo('left')}
				disabled={currentZone === 'left'}
			>
				<span class="material-symbols-rounded">left_panel_open</span>
				Pindah ke panel kiri
			</button>
			<button
				class="sb-ctx-item {currentZone === 'right' ? 'is-current' : ''}"
				onclick={() => ctxMoveTo('right')}
				disabled={currentZone === 'right'}
			>
				<span class="material-symbols-rounded">right_panel_open</span>
				Pindah ke panel kanan
			</button>
		</div>
	{/if}
{:else}
	<!-- ── Dropdown mode: horizontal bar (original) ── -->
	<div class="sb-root">
		<!-- SERVER -->
		<div class="sb-group sb-group-server">
			<label class="sb-label">Server</label>
			<select
				value={activeServerUrl}
				onchange={(e) => onSelectServer(e.currentTarget.value)}
				class="sb-select"
			>
				{#each servers as server}
					<option value={server.value}>{server.label}</option>
				{/each}
			</select>
		</div>

		<div class="sb-divider"></div>

		<LanguageTrackPanel
			{episodeId}
			{activeServerUrl}
			{tracks}
			{cues}
			{activeTrackId}
			{activeTrack}
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
			bind:open={openTrack}
			bind:newLang
			bind:newLabel
			bind:aiInstructionDraft
			bind:selectedAiTextModel
			bind:selectedAiTranscribeModel
			{onSelectTrack}
			{onAddTrack}
			{onAutoGenerate}
			{onSendAiInstruction}
			{onStopGenerating}
		/>

		<div class="sb-divider"></div>

		<div class="sb-group sb-group-source">
			<button
				class="sb-section-toggle {openSource ? 'is-open' : ''}"
				onclick={(e) => {
					e.stopPropagation();
					openSource = !openSource;
				}}
				aria-expanded={openSource}
			>
				<span class="material-symbols-rounded sb-section-icon">fingerprint</span>
				<span class="sb-section-label">Subtitle Source</span>
				<span class="material-symbols-rounded sb-chevron">expand_more</span>
			</button>

			{#if openSource}
				<div class="sb-panel sb-source-dropdown" onclick={(e) => e.stopPropagation()}>
					<div class="sb-source-panel">
						<div class="sb-source-grid">
							<div class="sb-source-card">
								<small>Track</small>
								<strong>{trackSourceLabel}</strong>
							</div>
							<div class="sb-source-card">
								<small>Active Cue</small>
								<strong>{activeCueSourceLabel}</strong>
							</div>
						</div>
						<div class="sb-source-stats">
							<span class="sb-source-chip">Import / Manual {trackSourceCounts.manual}</span>
							<span class="sb-source-chip">AI Transcribe {trackSourceCounts.aiTranscribe}</span>
							<span class="sb-source-chip">AI Translate {trackSourceCounts.aiTranslate}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="sb-divider"></div>

		<!-- IMPORT -->
		<div class="sb-group">
			<button
				class="sb-section-toggle {openImport ? 'is-open' : ''}"
				onclick={(e) => {
					e.stopPropagation();
					openImport = !openImport;
				}}
				aria-expanded={openImport}
			>
				<span class="material-symbols-rounded sb-section-icon">upload_file</span>
				<span class="sb-section-label">Import</span>
				{#if importFile}
					<span class="sb-import-badge">{importFile.name}</span>
				{/if}
				<span class="material-symbols-rounded sb-chevron">expand_more</span>
			</button>

			{#if openImport}
				<div class="sb-panel" onclick={(e) => e.stopPropagation()}>
					<div class="sb-import-row">
						<label class="sb-dropzone">
							<span class="material-symbols-rounded" style="font-size:16px; color: var(--sb-accent);">
								{importFile ? 'task' : 'upload_file'}
							</span>
							<span class="sb-dropzone-label">
								{importFile?.name ?? 'Pilih SRT/VTT'}
							</span>
							<input
								type="file"
								accept=".srt,.vtt,text/vtt"
								class="sb-file-input"
								onchange={(e) => (importFile = e.currentTarget.files?.[0] ?? null)}
							/>
						</label>
						<button onclick={onImport} disabled={!importFile} class="sb-btn-primary sb-btn-sm">
							Import
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="sb-divider"></div>

		<!-- CUE EDITOR -->
		<div class="sb-group sb-group-cue">
			<button
				class="sb-section-toggle {openCue ? 'is-open' : ''}"
				onclick={(e) => {
					e.stopPropagation();
					openCue = !openCue;
				}}
				aria-expanded={openCue}
			>
				<span class="material-symbols-rounded sb-section-icon">edit_note</span>
				<span class="sb-section-label">Cue Editor</span>
				{#if activeCue}
					<span class="sb-cue-preview">
						{activeCue.text?.slice(0, 28)}{(activeCue.text?.length ?? 0) > 28 ? '…' : ''}
					</span>
				{:else}
					<span class="sb-empty-note" style="margin:0">—</span>
				{/if}
				<span class="material-symbols-rounded sb-chevron">expand_more</span>
			</button>

			{#if openCue}
				<div class="sb-panel" onclick={(e) => e.stopPropagation()}>
					{#if activeCue}
						<div class="sb-cue-form">
							<div class="sb-timing-row">
								<label class="sb-field">
									<span class="sb-field-label">Start (s)</span>
									<input
										value={activeCue.startTime}
										type="number"
										step="0.05"
										oninput={(e) => onUpdateCue({ startTime: Number(e.currentTarget.value) })}
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
										oninput={(e) => onUpdateCue({ endTime: Number(e.currentTarget.value) })}
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
								oninput={(e) => onUpdateCue({ text: e.currentTarget.value })}
								class="sb-textarea"
								placeholder="Teks subtitle..."
								rows="2"
							></textarea>
							<div class="sb-cue-origin">
								<span class="material-symbols-rounded">info</span>
								<span>Sumber cue: {activeCueSourceLabel}</span>
							</div>
						</div>
					{:else}
						<p class="sb-empty-note">Klik cue di timeline untuk edit timing dan teks.</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
