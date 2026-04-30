<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import type {
		AiInstructionMessage,
		SubtitleAiTextModel,
		SubtitleAiTranscribeModel,
		SubtitleCue,
		SubtitleTrack
	} from '$lib/admin/subtitle-studio';
	import {
		subtitleAiTextModelOptions,
		subtitleAiTranscribeModelOptions,
		subtitleAiUnsupportedTranscribeOptions
	} from '$lib/admin/subtitle-studio';
	import AiModelPicker from './AiModelPicker.svelte';

	type TextPart = { type: 'text' | 'mention'; value: string };
	type AiPendingMode = 'idle' | 'thinking' | 'typing';

	let {
		draft = $bindable(''),
		selectedAiTextModel = $bindable<SubtitleAiTextModel>(''),
		selectedAiTranscribeModel = $bindable<SubtitleAiTranscribeModel>(''),
		messages = [],
		cues = [],
		activeTrack,
		activeServerUrl,
		isAutoGenerating = false,
		isAiRevising = false,
		isAiResponding = false,
		aiPendingMode = 'idle',
		aiPendingStage = '',
		aiTypingPreview = '',
		showPickerRow = true,
		onAutoGenerate,
		onSendAiInstruction,
		onStopGenerating
	}: {
		draft: string;
		selectedAiTextModel: SubtitleAiTextModel;
		selectedAiTranscribeModel: SubtitleAiTranscribeModel;
		messages?: AiInstructionMessage[];
		cues?: SubtitleCue[];
		activeTrack: SubtitleTrack | null;
		activeServerUrl: string;
		isAutoGenerating?: boolean;
		isAiRevising?: boolean;
		isAiResponding?: boolean;
		aiPendingMode?: AiPendingMode;
		aiPendingStage?: string;
		aiTypingPreview?: string;
		showPickerRow?: boolean;
		onAutoGenerate: () => void;
		onSendAiInstruction: () => void;
		onStopGenerating: () => void;
	} = $props();

	const recentMessages = $derived(messages.slice(-4));
	const mention = $derived(findOpenMention(draft));
	const mentionSuggestions = $derived(buildSuggestions(cues, mention?.query ?? '').slice(0, 8));
	const draftParts = $derived(splitMentions(draft));
	const hasDraftMention = $derived(draftParts.some((part) => part.type === 'mention'));
	const canRevise = $derived(Boolean(activeTrack && cues.length > 0));
	const canSend = $derived(
		Boolean(draft.trim()) && !isAutoGenerating && !isAiRevising && !isAiResponding
	);
	const canStop = $derived(isAiResponding || isAiRevising);

	function pad(value: number) {
		return String(value).padStart(2, '0');
	}

	function formatCueTime(seconds: number) {
		const safe = Math.max(0, Math.floor(seconds));
		const hours = Math.floor(safe / 3600);
		const minutes = Math.floor((safe % 3600) / 60);
		const remain = safe % 60;
		return hours > 0
			? `${pad(hours)}:${pad(minutes)}:${pad(remain)}`
			: `${pad(minutes)}:${pad(remain)}`;
	}

	function findOpenMention(value: string) {
		const match = value.match(/(^|\s)@([0-9:.]*)$/);
		if (!match || match.index === undefined) return null;
		return {
			start: match.index + match[1].length,
			query: match[2] ?? ''
		};
	}

	function buildSuggestions(items: SubtitleCue[], query: string) {
		const needle = query.replace('@', '').trim().toLowerCase();
		return [...items]
			.sort((a, b) => a.startTime - b.startTime)
			.map((cue) => ({
				time: formatCueTime(cue.startTime),
				text: cue.text.trim()
			}))
			.filter((item) => !needle || item.time.toLowerCase().startsWith(needle))
			.slice(0, 8);
	}

	function insertMention(time: string) {
		if (!mention) return;
		draft = `${draft.slice(0, mention.start)}@${time} ${draft.slice(mention.start + mention.query.length + 1)}`;
	}

	function splitMentions(value: string): TextPart[] {
		const parts: TextPart[] = [];
		let lastIndex = 0;
		for (const match of value.matchAll(/@\d{1,2}:\d{2}(?::\d{2})?/g)) {
			const index = match.index ?? 0;
			if (index > lastIndex) parts.push({ type: 'text', value: value.slice(lastIndex, index) });
			parts.push({ type: 'mention', value: match[0] });
			lastIndex = index + match[0].length;
		}
		if (lastIndex < value.length) parts.push({ type: 'text', value: value.slice(lastIndex) });
		return parts;
	}
</script>

<div class="sb-ai-chat">
	<div class="mb-3">
		<div class="mb-1">
			<p class="sb-auto-title">Instruksi AI</p>
			<p class="sb-auto-note">Khusus translate, timing, tone, nama, dan revisi subtitle.</p>
		</div>

		{#if showPickerRow}
			<div class="sb-ai-picker-row">
				<AiModelPicker
					bind:value={selectedAiTranscribeModel}
					icon="graphic_eq"
					menuTitle="Model transcribe"
					options={subtitleAiTranscribeModelOptions}
					unsupportedOptions={subtitleAiUnsupportedTranscribeOptions}
					disabled={canStop}
					compact={true}
					placement="bottom"
				/>

				<AiModelPicker
					bind:value={selectedAiTextModel}
					icon="neurology"
					menuTitle="Model revisi / translate"
					options={subtitleAiTextModelOptions}
					disabled={canStop}
					compact={true}
					placement="bottom"
				/>
			</div>
		{/if}
	</div>

	{#if recentMessages.length || aiPendingMode !== 'idle'}
		<div class="sb-ai-log">
			{#each recentMessages as message}
				<div class="sb-ai-message {message.role === 'user' ? 'is-user' : 'is-assistant'}">
					<span>{message.role === 'user' ? 'Bos' : 'AI'}</span>
					<p>
						{#each splitMentions(message.content) as part}
							{#if part.type === 'mention'}
								<mark class="sb-ai-mention">{part.value}</mark>
							{:else}
								{part.value}
							{/if}
						{/each}
					</p>
				</div>
			{/each}

			{#if aiPendingMode === 'thinking'}
				<div class="sb-ai-message is-assistant is-pending">
					<span>Asisten</span>
					<p class="sb-ai-pending-text">
						{aiPendingStage || 'Memikirkan jawaban...'}
						<span class="sb-ai-thinking-dots" aria-hidden="true"></span>
					</p>
				</div>
			{:else if aiPendingMode === 'typing' && aiTypingPreview}
				<div class="sb-ai-message is-assistant is-typing">
					<span>Asisten</span>
					<p>
						{#each splitMentions(aiTypingPreview) as part}
							{#if part.type === 'mention'}
								<mark class="sb-ai-mention">{part.value}</mark>
							{:else}
								{part.value}
							{/if}
						{/each}
						<span class="sb-ai-caret" aria-hidden="true"></span>
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<div class="sb-ai-input-wrap">
		<div class="sb-ai-composer">
			<textarea
				bind:value={draft}
				class="sb-textarea sb-ai-textarea sb-ai-composer-textarea"
				rows="3"
				placeholder="Apa yang bisa aku bantu untuk subtitle ini?"
				onkeydown={(event) => {
					if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
						event.preventDefault();
						onSendAiInstruction();
					}
				}}
			></textarea>

			<div class="sb-ai-composer-foot">
				<div class="sb-ai-composer-left">
					<button
						type="button"
						onclick={onAutoGenerate}
						disabled={isAutoGenerating || isAiRevising || !activeServerUrl}
						class="sb-ai-icon-btn"
						title="Auto generate subtitle"
						aria-label="Auto generate subtitle"
					>
						<AppIcon name="auto_awesome" />
					</button>
				</div>

				<div class="sb-ai-composer-right">
					<button
						type="button"
						onclick={canStop ? onStopGenerating : onSendAiInstruction}
						disabled={!canStop && !canSend}
						class="sb-ai-send-btn"
						title={canStop
							? 'Stop generating'
							: canRevise
								? 'Kirim revisi AI'
								: 'Simpan instruksi AI'}
						aria-label={canStop
							? 'Stop generating'
							: canRevise
								? 'Kirim revisi AI'
								: 'Simpan instruksi AI'}
					>
						<AppIcon name={canStop ? 'stop' : 'arrow_upward'} style="font-size:16px;" />
					</button>
				</div>
			</div>
		</div>

		{#if mention && mentionSuggestions.length}
			<div class="sb-ai-suggest">
				{#each mentionSuggestions as item}
					<button type="button" onclick={() => insertMention(item.time)} class="sb-ai-suggest-item">
						<span>@{item.time}</span>
						<p>{item.text}</p>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if hasDraftMention}
		<p class="sb-ai-preview">
			{#each draftParts as part}
				{#if part.type === 'mention'}
					<mark class="sb-ai-mention">{part.value}</mark>
				{:else}
					{part.value}
				{/if}
			{/each}
		</p>
	{/if}

	<div class="sb-ai-actions">
		<span class="sb-ai-action-note">
			{isAiRevising
				? 'AI sedang merevisi cue terpilih'
				: isAiResponding
					? 'AI sedang menyusun jawaban'
					: canRevise
						? 'Enter + Ctrl untuk kirim revisi'
						: 'Instruksi akan disimpan dulu untuk auto generate'}
		</span>
	</div>
</div>
