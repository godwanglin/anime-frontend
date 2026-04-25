<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SectionId } from './types';
	import { layout } from './store.svelte';

	let {
		id,
		title,
		icon,
		children,
		collapsed,
		onToggle,
		onDragStart,
		onDragEnd
	}: {
		id: SectionId;
		title: string;
		icon: string;
		children: Snippet;
		collapsed: boolean;
		onToggle: () => void;
		onDragStart: () => void;
		onDragEnd: () => void;
	} = $props();

	let ctxMenu = $state<{ x: number; y: number } | null>(null);

	const currentZone = $derived(layout.zones.left.includes(id) ? 'left' : 'right');
	const zoneDir = $derived(layout.zoneDir[currentZone]);

	function onContextMenu(e: MouseEvent) {
		e.preventDefault();
		ctxMenu = { x: e.clientX, y: e.clientY };
	}

	function onWindowClick(e: MouseEvent) {
		if (!ctxMenu) return;
		if (!(e.target as HTMLElement).closest('.sp-ctx-menu')) ctxMenu = null;
	}

	function handleDragStart(e: DragEvent) {
		e.dataTransfer?.setData('sst/section', id);
		e.dataTransfer!.effectAllowed = 'move';
		onDragStart();
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="sp-shell">
	<header
		class="sp-header"
		role="button"
		tabindex="0"
		draggable="true"
		ondragstart={handleDragStart}
		ondragend={onDragEnd}
		onclick={onToggle}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
		oncontextmenu={onContextMenu}
	>
		<span class="material-symbols-rounded sp-icon">{icon}</span>
		<span class="sp-title">{title}</span>
		<span
			class="material-symbols-rounded sp-chevron"
			style="transform:rotate({collapsed ? '0deg' : '180deg'})"
		>expand_more</span>
	</header>

	{#if !collapsed}
		<div class="sp-body">
			{@render children()}
		</div>
	{/if}
</div>

{#if ctxMenu}
	<div
		class="sp-ctx-menu"
		style="left:{ctxMenu.x}px; top:{ctxMenu.y}px"
		role="menu"
	>
		<p class="sp-ctx-label">Arah zona</p>
		<button
			class="sp-ctx-item {zoneDir === 'column' ? 'is-current' : ''}"
			disabled={zoneDir === 'column'}
			onclick={() => { layout.setZoneDir(currentZone, 'column'); ctxMenu = null; }}
			role="menuitem"
		>
			<span class="material-symbols-rounded">table_rows</span>
			Split atas-bawah
		</button>
		<button
			class="sp-ctx-item {zoneDir === 'row' ? 'is-current' : ''}"
			disabled={zoneDir === 'row'}
			onclick={() => { layout.setZoneDir(currentZone, 'row'); ctxMenu = null; }}
			role="menuitem"
		>
			<span class="material-symbols-rounded">vertical_split</span>
			Split kiri-kanan
		</button>

		<div class="sp-ctx-divider"></div>
		<p class="sp-ctx-label">Pindahkan ke</p>

		<button
			class="sp-ctx-item {currentZone === 'left' ? 'is-current' : ''}"
			disabled={currentZone === 'left'}
			onclick={() => { layout.reorder(id, 'left', null); ctxMenu = null; }}
			role="menuitem"
		>
			<span class="material-symbols-rounded">left_panel_open</span>
			Panel kiri
		</button>
		<button
			class="sp-ctx-item {currentZone === 'right' ? 'is-current' : ''}"
			disabled={currentZone === 'right'}
			onclick={() => { layout.reorder(id, 'right', null); ctxMenu = null; }}
			role="menuitem"
		>
			<span class="material-symbols-rounded">right_panel_open</span>
			Panel kanan
		</button>
	</div>
{/if}
