<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import ResizeHandle from './layout/ResizeHandle.svelte';
	import SectionPanel from './layout/SectionPanel.svelte';
	import { layout } from './layout/store.svelte';
	import type { SectionId } from './layout/types';
	import './css/layout.css';

	type Props = {
		track?: Snippet;
		source?: Snippet;
		importSection?: Snippet;
		cue?: Snippet;
		video: Snippet;
		timeline?: Snippet;
	};

	let { track, source, importSection, cue, video, timeline }: Props = $props();

	type SectionDef = { title: string; icon: string; snippet: Snippet };
	type ZoneSection = { id: SectionId; def: SectionDef };

	function sectionDef(id: SectionId): SectionDef | undefined {
		if (id === 'track' && track) return { title: 'Language Track', icon: 'subtitles', snippet: track };
		if (id === 'source' && source) return { title: 'Subtitle Source', icon: 'fingerprint', snippet: source };
		if (id === 'import' && importSection) return { title: 'Import', icon: 'upload_file', snippet: importSection };
		if (id === 'cue' && cue) return { title: 'Cue Editor', icon: 'edit_note', snippet: cue };
		return undefined;
	}

	const leftSections = $derived(
		layout.zones.left.map(id => ({ id, def: sectionDef(id) })).filter(x => x.def != null) as ZoneSection[]
	);
	const rightSections = $derived(
		layout.zones.right.map(id => ({ id, def: sectionDef(id) })).filter(x => x.def != null) as ZoneSection[]
	);

	// Zone container refs for resize computation
	let leftZoneEl = $state<HTMLElement | null>(null);
	let rightZoneEl = $state<HTMLElement | null>(null);

	// Drag-and-drop state
	let draggingId = $state<SectionId | null>(null);
	/** undefined = no drop in progress; null = append to end; SectionId = insert before that section */
	let dropZone = $state<'left' | 'right' | null>(null);
	let dropInsertBefore = $state<SectionId | null | undefined>(undefined);

	// ── Drag handlers ──────────────────────────────────────────

	function computeDropTarget(e: DragEvent, zone: 'left' | 'right'): SectionId | null {
		const container = zone === 'left' ? leftZoneEl : rightZoneEl;
		if (!container) return null;
		const dir = layout.zoneDir[zone];
		const wrappers = Array.from(container.querySelectorAll<HTMLElement>(':scope > .sl-section-wrap'));
		for (const wrap of wrappers) {
			const rect = wrap.getBoundingClientRect();
			const mid = dir === 'column' ? (rect.top + rect.bottom) / 2 : (rect.left + rect.right) / 2;
			const mouse = dir === 'column' ? e.clientY : e.clientX;
			if (mouse < mid) return (wrap.dataset.sectionId as SectionId) ?? null;
		}
		return null;
	}

	function onZoneDragOver(e: DragEvent, zone: 'left' | 'right') {
		if (!e.dataTransfer?.types.includes('sst/section')) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		dropZone = zone;
		dropInsertBefore = computeDropTarget(e, zone);
	}

	function onZoneDrop(e: DragEvent, zone: 'left' | 'right') {
		e.preventDefault();
		const id = e.dataTransfer?.getData('sst/section') as SectionId | undefined;
		if (!id) return;
		layout.reorder(id, zone, computeDropTarget(e, zone));
		dropZone = null;
		dropInsertBefore = undefined;
		draggingId = null;
	}

	function onZoneDragLeave(e: DragEvent) {
		const related = e.relatedTarget as HTMLElement | null;
		if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
			dropZone = null;
			dropInsertBefore = undefined;
		}
	}

	// ── Section-to-section resize ───────────────────────────────

	function makeSectionResizer(zone: 'left' | 'right', idA: SectionId, idB: SectionId) {
		return function (e: PointerEvent) {
			e.preventDefault();
			const container = zone === 'left' ? leftZoneEl : rightZoneEl;
			const dir = layout.zoneDir[zone];
			const startPos = dir === 'column' ? e.clientY : e.clientX;
			const startFlexA = layout.sectionFlex[idA] ?? 1;
			const startFlexB = layout.sectionFlex[idB] ?? 1;

			const containerSize = container
				? (dir === 'column' ? container.offsetHeight : container.offsetWidth)
				: 400;
			const openSections = layout.zones[zone].filter(id => !(layout.sectionCollapsed[id] ?? false));
			const totalFlex = openSections.reduce((sum, id) => sum + (layout.sectionFlex[id] ?? 1), 0);
			const pxPerFlex = containerSize / Math.max(totalFlex, 0.01);

			function onMove(ev: PointerEvent) {
				const pos = dir === 'column' ? ev.clientY : ev.clientX;
				const deltaFlex = (pos - startPos) / pxPerFlex;
				layout.resizeSections(idA, startFlexA + deltaFlex, idB, startFlexB - deltaFlex);
			}
			function onUp() { window.removeEventListener('pointermove', onMove); }
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUp, { once: true });
		};
	}

	// ── Keyboard shortcuts ──────────────────────────────────────

	function onKeyDown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
		if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') { e.preventDefault(); layout.reset(); return; }
		if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); layout.toggleLeft(); return; }
		if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); layout.toggleRight(); }
	}

	onMount(() => {
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	});
</script>

{#snippet zoneContent(zone: 'left' | 'right', sections: ZoneSection[])}
	{@const dir = layout.zoneDir[zone]}
	{#each sections as { id, def }, i}
		{#if dropZone === zone && dropInsertBefore === id}
			<div class="sl-drop-line sl-drop-line-{dir === 'row' ? 'x' : 'y'}"></div>
		{/if}
		{#if i > 0 && !(layout.sectionCollapsed[sections[i - 1].id] ?? false) && !(layout.sectionCollapsed[id] ?? false)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="sl-sec-resize sl-sec-resize-{dir === 'column' ? 'y' : 'x'}"
				onpointerdown={makeSectionResizer(zone, sections[i - 1].id, id)}
			></div>
		{/if}
		<div
			class="sl-section-wrap {draggingId === id ? 'sl-section-dragging' : ''}"
			style="flex: {(layout.sectionCollapsed[id] ?? false) ? '0 0 auto' : `${layout.sectionFlex[id] ?? 1} 1 0`}; min-height: 0; min-width: 0; overflow: hidden;"
			data-section-id={id}
		>
			<SectionPanel
				{id}
				title={def.title}
				icon={def.icon}
				collapsed={layout.sectionCollapsed[id] ?? false}
				onToggle={() => layout.toggleSection(id)}
				onDragStart={() => { draggingId = id; }}
				onDragEnd={() => { draggingId = null; dropZone = null; dropInsertBefore = undefined; }}
			>
				{@render def.snippet()}
			</SectionPanel>
		</div>
	{/each}
	{#if dropZone === zone && dropInsertBefore === null}
		<div class="sl-drop-line sl-drop-line-{dir === 'row' ? 'x' : 'y'}"></div>
	{/if}
{/snippet}

<div
	class="sl-root"
	style:--sl-left-w="{layout.sizes.leftWidth}px"
	style:--sl-right-w="{layout.sizes.rightWidth}px"
	style:--sl-bottom-h="{layout.sizes.bottomHeight}px"
>
	<div class="sl-workspace">
		<!-- LEFT sidebar -->
		{#if leftSections.length > 0 && layout.visible.left}
			<div class="sl-sidebar sl-left">
				<div
					class="sl-zone-sections {layout.zoneDir.left === 'row' ? 'sl-zone-row' : ''} {dropZone === 'left' ? 'sl-zone-dropping' : ''}"
					bind:this={leftZoneEl}
					ondragover={(e) => onZoneDragOver(e, 'left')}
					ondrop={(e) => onZoneDrop(e, 'left')}
					ondragleave={onZoneDragLeave}
					role="region"
					aria-label="Left panel"
				>
					{@render zoneContent('left', leftSections)}
				</div>
			</div>
			<ResizeHandle axis="x" getSize={() => layout.sizes.leftWidth} onResize={layout.resizeLeft} />
		{/if}

		<!-- CENTER — always visible -->
		<div class="sl-center">
			{@render video()}
		</div>

		<!-- RIGHT sidebar -->
		{#if rightSections.length > 0 && layout.visible.right}
			<ResizeHandle axis="x" invert getSize={() => layout.sizes.rightWidth} onResize={layout.resizeRight} />
			<div class="sl-sidebar sl-right">
				<div
					class="sl-zone-sections {layout.zoneDir.right === 'row' ? 'sl-zone-row' : ''} {dropZone === 'right' ? 'sl-zone-dropping' : ''}"
					bind:this={rightZoneEl}
					ondragover={(e) => onZoneDragOver(e, 'right')}
					ondrop={(e) => onZoneDrop(e, 'right')}
					ondragleave={onZoneDragLeave}
					role="region"
					aria-label="Right panel"
				>
					{@render zoneContent('right', rightSections)}
				</div>
			</div>
		{/if}
	</div>

	{#if timeline}
		<ResizeHandle axis="y" invert getSize={() => layout.sizes.bottomHeight} onResize={layout.resizeBottom} />
		<div class="sl-bottom">
			{@render timeline()}
		</div>
	{/if}
</div>
