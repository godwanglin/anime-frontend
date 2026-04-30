<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { tick } from 'svelte';
	import type { SubtitleCue } from '$lib/admin/subtitle-studio';

	let {
		cue,
		duration,
		row = 0,
		minWidthPx = 56,
		selected,
		overlap,
		editing,
		aiBusy = false,
		onSelect,
		onDelete,
		onEditStart,
		onEditCommit,
		onEditCancel,
		onPointerStart,
		onContextMenu
	} = $props<{
		cue: SubtitleCue;
		duration: number;
		row?: number;
		minWidthPx?: number;
		selected: boolean;
		overlap: boolean;
		editing: boolean;
		aiBusy?: boolean;
		onSelect: () => void;
		onDelete: () => void;
		onEditStart: () => void;
		onEditCommit: (text: string) => void;
		onEditCancel: () => void;
		onPointerStart: (mode: 'move' | 'left' | 'right', event: PointerEvent) => void;
		onContextMenu: (event: MouseEvent) => void;
	}>();

	let textareaEl = $state<HTMLTextAreaElement>();
	let localText = $state('');

	const left = $derived(`${Math.max(0, (cue.startTime / duration) * 100)}%`);
	const width = $derived(`${Math.max(0.4, ((cue.endTime - cue.startTime) / duration) * 100)}%`);

	$effect(() => {
		if (!editing) return;
		localText = cue.text ?? '';
		tick().then(() => {
			textareaEl?.focus();
			textareaEl?.select();
		});
	});

	function commitEdit() {
		onEditCommit(localText);
	}

	function formatSeconds(s: number) {
		const m = Math.floor(s / 60);
		const ss = (s % 60).toFixed(1).padStart(4, '0');
		return `${m}:${ss}`;
	}

	const startLabel = $derived(formatSeconds(cue.startTime));
	const endLabel = $derived(formatSeconds(cue.endTime));
	const durLabel = $derived((cue.endTime - cue.startTime).toFixed(1) + 's');
</script>

<!--
    ═══════════════════════════════════════════════════
    CUE BLOCK
    Three visual states:
      1. normal   — violet, compact, shows text + time
      2. selected — brighter violet, slightly taller
      3. overlap  — red warning
      4. editing  — expanded editor popover-style
    ═══════════════════════════════════════════════════
-->
<div
	data-cue-block
	role="button"
	tabindex="0"
	class="cb-root {editing
		? 'is-editing'
		: selected
			? 'is-selected'
			: overlap
				? 'is-overlap'
				: 'is-normal'}"
	style="--row: {row}"
	style:--cb-min-width={`${minWidthPx}px`}
	style:left
	style:width
	onclick={(e) => {
		e.stopPropagation();
		if (e.detail >= 2) {
			onEditStart();
			return;
		}
		onSelect();
	}}
	ondblclick={(e) => {
		e.preventDefault();
		e.stopPropagation();
		onEditStart();
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			onEditStart();
		}
		if (e.key === ' ') onSelect();
	}}
	onpointerdown={(e) => {
		e.stopPropagation();
		if (e.detail >= 2) return;
		if (!editing) onPointerStart('move', e);
	}}
	oncontextmenu={(e) => {
		e.preventDefault();
		e.stopPropagation();
		onContextMenu(e);
	}}
	title={editing ? undefined : cue.text}
>
	{#if aiBusy}
		<div class="cb-ai-overlay" aria-hidden="true">
			<span class="cb-ai-glow"></span>
			<span class="cb-ai-noise"></span>
			<span class="cb-ai-pill">
				<AppIcon name="auto_awesome" class="cb-ai-pill-icon" />
				AI generating
			</span>
		</div>
	{/if}

	{#if editing}
		<!-- ── EDITING STATE ─────────────────── -->
		<!--
            Resize handle — left
            (still needed even in editing so width can be adjusted without exiting)
        -->
		<button
			type="button"
			aria-label="Resize start"
			class="cb-handle cb-handle-left"
			onpointerdown={(e) => onPointerStart('left', e)}
		></button>

		<!-- Header row -->
		<div class="cb-edit-header">
			<AppIcon name="edit" class="cb-icon-edit" />
			<span class="cb-edit-times">{startLabel} → {endLabel}</span>
			<span class="cb-edit-dur">{durLabel}</span>
			<button
				type="button"
				class="cb-edit-cancel"
				aria-label="Batalkan edit"
				onclick={(e) => {
					e.stopPropagation();
					onEditCancel();
				}}
				onpointerdown={(e) => e.stopPropagation()}
			>
				<AppIcon name="close" style="font-size:13px;" />
			</button>
		</div>

		<!-- Textarea -->
		<textarea
			bind:this={textareaEl}
			bind:value={localText}
			class="cb-textarea select-text"
			aria-label="Edit subtitle text"
			placeholder="Teks subtitle..."
			onclick={(e) => e.stopPropagation()}
			ondblclick={(e) => e.stopPropagation()}
			onpointerdown={(e) => e.stopPropagation()}
			onblur={commitEdit}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					onEditCancel();
				}
				if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					commitEdit();
				}
			}}
		></textarea>

		<!-- Footer hint -->
		<p class="cb-edit-hint">Ctrl+Enter simpan · Esc batal</p>

		<!-- Resize handle — right -->
		<button
			type="button"
			aria-label="Resize end"
			class="cb-handle cb-handle-right"
			onpointerdown={(e) => onPointerStart('right', e)}
		></button>
	{:else}
		<!-- ── NORMAL / SELECTED / OVERLAP STATE ── -->

		<!-- Resize handle — left -->
		<button
			type="button"
			aria-label="Resize start"
			class="cb-handle cb-handle-left"
			onpointerdown={(e) => onPointerStart('left', e)}
		></button>

		<!-- Content -->
		<div class="cb-content">
			<!-- Top row: time range -->
			<div class="cb-time-row">
				<span class="cb-time">{startLabel}</span>
				<span class="cb-time-sep">→</span>
				<span class="cb-time">{endLabel}</span>
				<span class="cb-dur">{durLabel}</span>
			</div>
			<!-- Text preview -->
			<p class="cb-text">{cue.text || 'Empty subtitle'}</p>
		</div>

		<!-- Delete button — top right -->
		<button
			type="button"
			aria-label="Hapus cue"
			class="cb-delete"
			onclick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
			onpointerdown={(e) => e.stopPropagation()}
		>
			<AppIcon name="delete" style="font-size:12px;" />
		</button>

		<!-- Resize handle — right -->
		<button
			type="button"
			aria-label="Resize end"
			class="cb-handle cb-handle-right"
			onpointerdown={(e) => onPointerStart('right', e)}
		></button>
	{/if}
</div>

<style>
	/* ══════════════════════════════════════════════
       CUE BLOCK TOKENS
    ══════════════════════════════════════════════ */
	.cb-root {
		/* Layout */
		position: absolute;
		top: calc(12px + var(--row, 0) * (var(--cb-row-height, 2.4rem) + var(--cb-row-gap, 0.3rem)));
		height: var(--cb-row-height, 2.4rem);
		min-height: var(--cb-row-height, 2.4rem);
		min-width: var(--cb-min-width, 56px);
		overflow: visible;
		border-radius: 5px;
		user-select: none;
		text-align: left;
		transition:
			top 120ms cubic-bezier(0.16, 1, 0.3, 1),
			height 120ms cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 120ms ease,
			border-color 120ms ease;
		cursor: pointer;
		isolation: isolate;

		/* Default (normal) colours — overridden per state below */
		--cb-bg: oklch(0.42 0.19 278); /* violet-700 ish */
		--cb-bg-hover: oklch(0.5 0.21 278);
		--cb-border: oklch(0.65 0.2 278 / 0.6);
		--cb-text: #fff;
		--cb-time-col: oklch(1 0 0 / 0.55);
		--cb-shadow: 0 2px 8px oklch(0 0 0 / 0.35);

		background: var(--cb-bg);
		border: 1px solid var(--cb-border);
		color: var(--cb-text);
		box-shadow: var(--cb-shadow);
	}

	/* ── Normal ── */
	.cb-root.is-normal {
		height: var(--cb-row-height, 2.4rem);
	}
	.cb-root.is-normal:hover {
		background: var(--cb-bg-hover);
		box-shadow: 0 4px 14px oklch(0 0 0 / 0.45);
	}

	/* ── Selected ── */
	.cb-root.is-selected {
		--cb-bg: oklch(0.52 0.22 278);
		--cb-border: oklch(0.75 0.2 278);
		--cb-shadow: 0 0 0 2px oklch(0.75 0.2 278 / 0.35), 0 4px 14px oklch(0 0 0 / 0.4);
		height: var(--cb-row-height, 2.4rem);
		z-index: 10;
	}

	/* ── Overlap warning ── */
	.cb-root.is-overlap {
		--cb-bg: oklch(0.44 0.2 20); /* red */
		--cb-bg-hover: oklch(0.5 0.21 20);
		--cb-border: oklch(0.65 0.22 20 / 0.7);
		--cb-shadow: 0 0 0 1px oklch(0.65 0.22 20 / 0.4), 0 2px 8px oklch(0 0 0 / 0.35);
		height: var(--cb-row-height, 2.4rem);
	}

	/* ── Editing ── */
	.cb-root.is-editing {
		--cb-bg: #0d0d10;
		--cb-border: oklch(0.68 0.2 278);
		--cb-shadow: 0 0 0 2px oklch(0.68 0.2 278 / 0.4), 0 8px 24px oklch(0 0 0 / 0.6);
		height: 7.5rem; /* taller to fit textarea */
		min-width: 280px;
		z-index: 120;
		cursor: default;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.cb-ai-overlay {
		position: absolute;
		inset: 0;
		z-index: 4;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;
		background:
			linear-gradient(180deg, oklch(1 0 0 / 0.08), transparent 45%),
			linear-gradient(135deg, oklch(0.8 0.16 284 / 0.16), oklch(0.7 0.1 270 / 0.08));
		backdrop-filter: blur(8px) saturate(135%);
	}

	.cb-ai-glow {
		position: absolute;
		inset: -20%;
		background:
			linear-gradient(110deg, transparent 24%, oklch(0.86 0.16 286 / 0.42) 48%, transparent 72%),
			radial-gradient(circle at 20% 30%, oklch(0.86 0.14 286 / 0.18), transparent 42%);
		filter: blur(7px);
		animation: cb-ai-glitch 1.7s ease-in-out infinite;
	}

	.cb-ai-noise {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(180deg, oklch(1 0 0 / 0.09) 0 1px, transparent 1px 4px),
			linear-gradient(90deg, transparent, oklch(0.84 0.14 286 / 0.14), transparent);
		mix-blend-mode: screen;
		opacity: 0.72;
		animation: cb-ai-scan 1.45s linear infinite;
	}

	.cb-ai-pill {
		position: absolute;
		left: 0.45rem;
		bottom: 0.32rem;
		display: inline-flex;
		align-items: center;
		gap: 0.24rem;
		padding: 0.14rem 0.42rem;
		border-radius: 999px;
		border: 1px solid oklch(1 0 0 / 0.12);
		background: oklch(0.12 0.01 286 / 0.76);
		box-shadow:
			inset 0 1px 0 oklch(1 0 0 / 0.1),
			0 6px 16px oklch(0 0 0 / 0.2);
		font-size: 0.56rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #f5f3ff;
	}

	:global(.cb-ai-pill-icon) {
		font-size: 0.72rem;
		animation: cb-ai-spin 1.2s linear infinite;
	}

	.cb-root:focus-visible {
		outline: 2px solid oklch(0.75 0.2 278);
		outline-offset: 2px;
	}

	/* ══════════════════════════════════════════════
       RESIZE HANDLES
    ══════════════════════════════════════════════ */
	.cb-handle {
		position: absolute;
		top: 0;
		height: 100%;
		width: 6px;
		cursor: ew-resize;
		background: transparent;
		border: none;
		padding: 0;
		z-index: 5;
		transition: background 120ms;
	}
	.cb-handle::after {
		content: '';
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 2px;
		height: 14px;
		border-radius: 9999px;
		background: oklch(1 0 0 / 0.25);
		transition:
			background 120ms,
			height 120ms;
	}
	.cb-handle:hover::after,
	.cb-handle:active::after {
		background: oklch(1 0 0 / 0.7);
		height: 20px;
	}
	.cb-handle-left {
		left: 0;
	}
	.cb-handle-left::after {
		left: 1px;
	}
	.cb-handle-right {
		right: 0;
	}
	.cb-handle-right::after {
		right: 1px;
	}

	/* ══════════════════════════════════════════════
       NORMAL/SELECTED CONTENT
    ══════════════════════════════════════════════ */
	.cb-content {
		display: flex;
		flex-direction: column;
		justify-content: center;
		height: 100%;
		padding: 3px 22px 3px 10px; /* right leaves room for delete btn */
		gap: 2px;
		pointer-events: none;
	}

	.cb-time-row {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.cb-time {
		font-size: 9px;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		color: var(--cb-time-col);
		letter-spacing: 0.02em;
		white-space: nowrap;
	}
	.cb-time-sep {
		font-size: 8px;
		color: oklch(1 0 0 / 0.3);
	}
	.cb-dur {
		margin-left: auto;
		font-size: 9px;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		color: oklch(1 0 0 / 0.35);
		white-space: nowrap;
	}
	.cb-text {
		font-size: 11px;
		font-weight: 700;
		color: var(--cb-text);
		line-height: 1.3;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	/* Delete button */
	.cb-delete {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: transparent;
		color: oklch(1 0 0 / 0.4);
		border: none;
		cursor: pointer;
		padding: 0;
		transition:
			background 120ms,
			color 120ms;
		z-index: 6;
	}
	.cb-delete:hover {
		background: oklch(0.44 0.2 20 / 0.7);
		color: #fff;
	}
	.cb-delete:active {
		transform: scale(0.88);
	}

	/* ══════════════════════════════════════════════
       EDITING STATE CONTENT
    ══════════════════════════════════════════════ */
	.cb-edit-header {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 8px 4px;
		border-bottom: 1px solid oklch(1 0 0 / 0.07);
		flex-shrink: 0;
	}
	:global(.cb-icon-edit) {
		font-size: 12px;
		color: oklch(0.72 0.18 278);
	}
	.cb-edit-times {
		font-size: 10px;
		font-weight: 700;
		font-family: ui-monospace, monospace;
		color: oklch(0.72 0.18 278);
		letter-spacing: 0.01em;
		white-space: nowrap;
	}
	.cb-edit-dur {
		font-size: 9px;
		font-weight: 600;
		font-family: ui-monospace, monospace;
		color: oklch(1 0 0 / 0.3);
		margin-left: 2px;
	}
	.cb-edit-cancel {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 4px;
		background: transparent;
		color: oklch(1 0 0 / 0.35);
		border: none;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition:
			background 120ms,
			color 120ms;
	}
	.cb-edit-cancel:hover {
		background: oklch(0.44 0.2 20 / 0.5);
		color: #fff;
	}

	.cb-textarea {
		flex: 1;
		width: 100%;
		resize: none;
		background: transparent;
		border: none;
		outline: none;
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 600;
		color: #e4e4e7;
		line-height: 1.5;
		caret-color: oklch(0.75 0.2 278);
	}
	.cb-textarea::placeholder {
		color: oklch(1 0 0 / 0.2);
	}
	.cb-textarea:focus {
		background: oklch(1 0 0 / 0.03);
	}

	.cb-edit-hint {
		padding: 3px 10px 5px;
		font-size: 9px;
		font-weight: 600;
		color: oklch(1 0 0 / 0.2);
		border-top: 1px solid oklch(1 0 0 / 0.05);
		flex-shrink: 0;
		white-space: nowrap;
	}

	@keyframes cb-ai-glitch {
		0%,
		100% {
			transform: translate3d(-9%, 0, 0);
			opacity: 0.38;
		}
		30% {
			transform: translate3d(6%, -3%, 0);
			opacity: 0.74;
		}
		56% {
			transform: translate3d(-2%, 4%, 0);
			opacity: 0.42;
		}
		84% {
			transform: translate3d(8%, 1%, 0);
			opacity: 0.68;
		}
	}

	@keyframes cb-ai-scan {
		0% {
			transform: translateY(-100%);
		}
		100% {
			transform: translateY(100%);
		}
	}

	@keyframes cb-ai-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
