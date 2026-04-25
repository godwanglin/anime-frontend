<script lang="ts">
	import type { Snippet } from 'svelte';
	import { layout } from './store.svelte';

	type Props = {
		id: string;
		title: string;
		icon: string;
		children: Snippet;
		onClose?: () => void;
		/** If provided, a "Move to →" button appears in the panel header */
		canMoveTo?: 'left' | 'right';
	};

	let { id, title, icon, children, onClose, canMoveTo }: Props = $props();

	let dragOver = $state(false);
	let showMenu = $state(false);

	function onDragStart(e: DragEvent) {
		e.dataTransfer?.setData('text/panel-id', id);
		e.dataTransfer!.effectAllowed = 'move';
	}

	function onDragOver(e: DragEvent) {
		const dragged = e.dataTransfer?.types.includes('text/panel-id');
		if (!dragged) return;
		e.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	function onDrop(e: DragEvent) {
		dragOver = false;
		const draggedId = e.dataTransfer?.getData('text/panel-id') as string | undefined;
		if (!draggedId || draggedId === id || !canMoveTo) return;
		e.preventDefault();
		// Move the dragged panel to whichever zone this panel currently occupies
		layout.moveTo(draggedId as never, canMoveTo);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="sl-panel-shell {dragOver ? 'sl-panel-dragover' : ''}"
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<!-- Panel header — draggable for dock-and-drop -->
	<header class="sl-panel-header" draggable="true" ondragstart={onDragStart}>
		<span class="material-symbols-rounded sl-panel-icon">{icon}</span>
		<span class="sl-panel-title">{title}</span>

		<div class="sl-panel-actions">
			{#if canMoveTo}
				<button
					class="sl-panel-action-btn"
					title="Pindahkan panel ke {canMoveTo === 'left' ? 'kiri' : 'kanan'}"
					onclick={() => layout.moveTo(id as never, canMoveTo!)}
				>
					<span class="material-symbols-rounded" style="font-size:14px;">
						{canMoveTo === 'left' ? 'left_panel_open' : 'right_panel_open'}
					</span>
				</button>
			{/if}
			{#if onClose}
				<button class="sl-panel-action-btn" title="Tutup panel" onclick={onClose}>
					<span class="material-symbols-rounded" style="font-size:14px;">close</span>
				</button>
			{/if}
		</div>
	</header>

	<div class="sl-panel-body">
		{@render children()}
	</div>
</div>
