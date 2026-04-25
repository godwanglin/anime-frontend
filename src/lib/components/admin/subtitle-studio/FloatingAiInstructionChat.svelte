<script lang="ts">
	import type {
		AiInstructionMessage,
		SubtitleAiTranscribeModel,
		SubtitleAiTextModel,
		SubtitleCue,
		SubtitleTrack
	} from '$lib/admin/subtitle-studio';
	import {
		subtitleAiTextModelOptions,
		subtitleAiTranscribeModelOptions,
		subtitleAiUnsupportedTranscribeOptions
	} from '$lib/admin/subtitle-studio';
	import AiModelPicker from './AiModelPicker.svelte';
	import AiInstructionChat from './AiInstructionChat.svelte';

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
		onAutoGenerate,
		onSendAiInstruction,
		onStopGenerating,
		onClose
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
		aiPendingMode?: 'idle' | 'thinking' | 'typing';
		aiPendingStage?: string;
		aiTypingPreview?: string;
		onAutoGenerate: () => void;
		onSendAiInstruction: () => void;
		onStopGenerating: () => void;
		onClose: () => void;
	} = $props();

	let position = $state({ x: 32, y: 84 });
	let size = $state<{ width: number; height: number } | null>(null);
	let drag = $state<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(
		null
	);
	let floatingEl: HTMLDivElement | null = $state(null);

	function portalToBody(node: HTMLDivElement) {
		if (typeof document === 'undefined') return;

		const parent = node.parentNode;
		const marker = document.createComment('floating-ai-instruction-chat');
		parent?.insertBefore(marker, node);
		document.body.appendChild(node);

		let resizeFrame = 0;
		const observer = new ResizeObserver(() => {
			const rect = node.getBoundingClientRect();
			const width = rect.width;
			const height = rect.height;
			cancelAnimationFrame(resizeFrame);
			resizeFrame = requestAnimationFrame(() => {
				size = {
					width: Math.round(width),
					height: Math.round(height)
				};
				position = clampPosition(position.x, position.y, {
					width,
					height
				});
			});
		});
		observer.observe(node);

		return {
			destroy() {
				cancelAnimationFrame(resizeFrame);
				observer.disconnect();
				node.remove();
				marker.remove();
			}
		};
	}

	function isInteractiveTarget(target: EventTarget | null) {
		return target instanceof HTMLElement && Boolean(target.closest('button, a, input, textarea, select'));
	}

	function clampPosition(x: number, y: number, measuredSize?: { width: number; height: number }) {
		const rect = floatingEl?.getBoundingClientRect();
		const width = measuredSize?.width ?? rect?.width ?? size?.width ?? 320;
		const height = measuredSize?.height ?? rect?.height ?? size?.height ?? 240;
		const maxX = Math.max(0, window.innerWidth - width - 8);
		const maxY = Math.max(0, window.innerHeight - height - 8);

		return {
			x: Math.min(maxX, Math.max(8, x)),
			y: Math.min(maxY, Math.max(8, y))
		};
	}

	function startDrag(event: PointerEvent) {
		if (event.button !== 0) return;
		if (isInteractiveTarget(event.target)) return;
		event.preventDefault();
		drag = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			x: position.x,
			y: position.y
		};
		(event.currentTarget as HTMLDivElement | null)?.setPointerCapture(event.pointerId);
	}

	function moveDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		position = clampPosition(
			drag.x + event.clientX - drag.startX,
			drag.y + event.clientY - drag.startY
		);
	}

	function stopDrag(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		drag = null;
	}

	function closeFloating(event: MouseEvent) {
		event.stopPropagation();
		drag = null;
		onClose();
	}
</script>

<div
	bind:this={floatingEl}
	use:portalToBody
	class="sb-ai-floating"
	style={`left:${position.x}px; top:${position.y}px;${size ? ` width:${size.width}px; height:${size.height}px;` : ''}`}
>
	<div
		class="sb-ai-floating-bar"
		role="toolbar"
		tabindex="0"
		aria-label="Drag AI chat"
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={stopDrag}
		onpointercancel={stopDrag}
	>
		<span class="material-symbols-rounded">drag_indicator</span>
		<strong>Instruksi AI</strong>
		<div
			class="sb-ai-floating-bar-controls"
			role="group"
			aria-label="AI model controls"
			onpointerdown={(event) => event.stopPropagation()}
		>
			<AiModelPicker
				bind:value={selectedAiTranscribeModel}
				icon="graphic_eq"
				menuTitle="Model transcribe"
				options={subtitleAiTranscribeModelOptions}
				unsupportedOptions={subtitleAiUnsupportedTranscribeOptions}
				disabled={isAiResponding || isAiRevising}
				compact={true}
				placement="bottom"
			/>

			<AiModelPicker
				bind:value={selectedAiTextModel}
				icon="neurology"
				menuTitle="Model revisi / translate"
				options={subtitleAiTextModelOptions}
				disabled={isAiResponding || isAiRevising}
				compact={true}
				placement="bottom"
			/>

			<button
				type="button"
				onpointerdown={(event) => event.stopPropagation()}
				onclick={closeFloating}
				aria-label="Kembalikan chat"
			>
				<span class="material-symbols-rounded">close</span>
			</button>
		</div>
	</div>
	<div class="sb-ai-floating-body">
		<AiInstructionChat
			{cues}
			{activeTrack}
			{activeServerUrl}
			{messages}
			{isAutoGenerating}
			{isAiRevising}
			{isAiResponding}
			{aiPendingMode}
			{aiPendingStage}
			{aiTypingPreview}
			bind:draft
			bind:selectedAiTextModel
			bind:selectedAiTranscribeModel
			showPickerRow={false}
			{onAutoGenerate}
			{onSendAiInstruction}
			{onStopGenerating}
		/>
	</div>
</div>
