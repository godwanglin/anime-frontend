<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import './css/tl.css';
	import type { SubtitleCue } from '$lib/admin/subtitle-studio';
	import CueBlock from './CueBlock.svelte';
	import TimelineContextMenu from './TimelineContextMenu.svelte';

	type SelectionRange = {
		startTime: number;
		endTime: number;
	};

	type ContextMenuTarget =
		| { type: 'timeline'; x: number; y: number; time: number }
		| { type: 'cue'; x: number; y: number; time: number; cueId: number }
		| { type: 'selection'; x: number; y: number; time: number };

	type SelectionDragState = {
		pointerId: number;
		startTime: number;
		currentTime: number;
	};

	type HeightResizeState = {
		pointerId: number;
		startY: number;
		startHeight: number;
	};

	type MenuItem = {
		key: string;
		label: string;
		icon: string;
		shortcut?: string;
		danger?: boolean;
		disabled?: boolean;
	};

	let {
		cues = $bindable<SubtitleCue[]>([]),
		duration,
		currentTime,
		isPlaying = false,
		selectedCueId = $bindable<number | null>(null),
		aiBusy = false,
		onSeek,
		onTogglePlayback = () => null,
		onDirty,
		onRemoveCue = () => null,
		onCueSelect = () => null,
		onRequestAiGenerate = async () => [],
		onRequestCueTextTranslate = async () => null,
		onRegisterCueSource = () => null,
		height = 'clamp(9rem, 24vh, 12rem)'
	}: {
		cues: SubtitleCue[];
		duration: number;
		currentTime: number;
		isPlaying?: boolean;
		selectedCueId: number | null;
		aiBusy?: boolean;
		onSeek: (time: number) => void;
		onTogglePlayback?: () => void;
		onDirty: () => void;
		onRemoveCue?: (cue: SubtitleCue) => void;
		onCueSelect?: (cue: SubtitleCue) => void;
		onRequestAiGenerate?: (payload: {
			rangeStart: number;
			rangeEnd: number;
			translate: boolean;
		}) => Promise<SubtitleCue[] | null | undefined>;
		onRequestCueTextTranslate?: (cue: SubtitleCue) => Promise<SubtitleCue | null | undefined>;
		onRegisterCueSource?: (
			payload: { cues: SubtitleCue[]; source: 'manual' | 'ai_transcribe' | 'ai_translate' }
		) => void;
		height?: string;
	} = $props();

	let timelineEl = $state<HTMLDivElement>();
	let scrollEl = $state<HTMLDivElement>();
	let drag = $state<{
		id: number;
		mode: 'move' | 'left' | 'right';
		startX: number;
		startCue: SubtitleCue;
		moved: boolean;
	} | null>(null);
	let pan = $state<{
		pointerId: number;
		startX: number;
		startY: number;
		startScrollLeft: number;
		startScrollTop: number;
		moved: boolean;
	} | null>(null);
	let scrub = $state<{ pointerId: number } | null>(null);
	let selectionDrag = $state<SelectionDragState | null>(null);
	let followPlayhead = $state(true);
	let suppressSeekClick = $state(false);
	let editingCueId = $state<number | null>(null);
	let cueRowMap = $state<Record<number, number>>({});
	let cueMinWidthMap = $state<Record<number, number>>({});
	let rowCount = $state(1);
	let zoom = $state(1);
	let trackHeightPx = $state(140);
	let contextMenu = $state<ContextMenuTarget | null>(null);
	let loadingMenuKey = $state('');
	let selectionMode = $state(false);
	let selection = $state<SelectionRange | null>(null);
	let selectionAiBusy = $state(false);
	let aiProcessingRange = $state<SelectionRange | null>(null);
	let heightResize = $state<HeightResizeState | null>(null);
	let timelineScrollRaf = 0;
	let pendingScrollLeft: number | null = null;
	let pendingScrollTop: number | null = null;
	const rowHeight = 2.4;
	const rowGap = 0.3;
	const visualLaneGapPx = 6;
	const minCueVisualWidthPx = 56;
	const minCueDuration = 0.12;
	const minTrackHeightPx = 96;
	const maxTrackHeightPx = 360;

	const safeDuration = $derived(Math.max(Number.isFinite(duration) ? duration : 0, 30));
	const playheadRatio = $derived(Math.min(1, Math.max(0, currentTime / safeDuration)));
	const playheadLeft = $derived(`${playheadRatio * 100}%`);
	const basePixelsPerSecond = 2.8;
	const pixelsPerSecond = $derived(basePixelsPerSecond * zoom);
	const timelineWidth = $derived(Math.max(980, safeDuration * pixelsPerSecond));
	const tickInterval = $derived(
		pixelsPerSecond >= 32 ? 5 : pixelsPerSecond >= 14 ? 10 : pixelsPerSecond >= 7 ? 30 : 60
	);
	const ticks = $derived(
		Array.from({ length: Math.ceil(safeDuration / tickInterval) + 1 }, (_, i) => i * tickInterval)
	);
	const selectionDuration = $derived(
		selection ? Math.max(0, selection.endTime - selection.startTime) : 0
	);
	const selectionLeft = $derived(
		selection ? `${Math.max(0, (selection.startTime / safeDuration) * 100)}%` : '0%'
	);
	const selectionWidth = $derived(
		selection ? `${Math.max(0.12, ((selection.endTime - selection.startTime) / safeDuration) * 100)}%` : '0%'
	);
	const selectionCueCount = $derived(
		selection
			? cues.filter(
					(item) => item.endTime > selection!.startTime && item.startTime < selection!.endTime
				).length
			: 0
	);
	const loadingMenuText = $derived(
		loadingMenuKey === 'selection:translate'
			? 'AI sedang translate selection...'
			: loadingMenuKey === 'cue:regenerate'
				? 'AI sedang regenerate cue...'
				: loadingMenuKey === 'cue:translate-text'
					? 'AI sedang translate teks cue...'
				: 'AI sedang generate subtitle...'
	);
	const activeCue = $derived(cues.find((cue) => cueId(cue) === selectedCueId) ?? null);

	function cueId(cue: SubtitleCue) {
		if (!cue.id) cue.id = -Date.now() - Math.floor(Math.random() * 1000);
		return cue.id;
	}

	function sortCues(list: SubtitleCue[]) {
		return [...list].sort((a, b) => {
			if (a.startTime !== b.startTime) return a.startTime - b.startTime;
			return a.endTime - b.endTime;
		});
	}

	function clampTime(value: number) {
		return Math.min(safeDuration, Math.max(0, value));
	}

	function normalizeRange(startTime: number, endTime: number): SelectionRange {
		return {
			startTime: clampTime(Math.min(startTime, endTime)),
			endTime: clampTime(Math.max(startTime, endTime))
		};
	}

	function secondsFromEvent(e: MouseEvent | PointerEvent) {
		const rect = timelineEl?.getBoundingClientRect();
		if (!rect) return 0;
		return clampTime(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * safeDuration);
	}

	function cancelTimelineScrollFrame() {
		if (!timelineScrollRaf) return;
		cancelAnimationFrame(timelineScrollRaf);
		timelineScrollRaf = 0;
	}

	function flushTimelineScroll() {
		timelineScrollRaf = 0;
		if (!scrollEl) return;
		if (pendingScrollLeft !== null) {
			scrollEl.scrollLeft = pendingScrollLeft;
			pendingScrollLeft = null;
		}
		if (pendingScrollTop !== null) {
			scrollEl.scrollTop = pendingScrollTop;
			pendingScrollTop = null;
		}
	}

	function scheduleTimelineScroll(next: { left?: number; top?: number }, immediate = false) {
		if (!scrollEl) return;
		if (typeof next.left === 'number') {
			const maxLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
			pendingScrollLeft = Math.min(maxLeft, Math.max(0, next.left));
		}
		if (typeof next.top === 'number') {
			const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
			pendingScrollTop = Math.min(maxTop, Math.max(0, next.top));
		}
		if (immediate) {
			cancelTimelineScrollFrame();
			flushTimelineScroll();
			return;
		}
		if (timelineScrollRaf) return;
		timelineScrollRaf = requestAnimationFrame(flushTimelineScroll);
	}

	function widthFor(z: number) {
		return Math.max(980, safeDuration * basePixelsPerSecond * z);
	}

	function heightToPixels(value: string) {
		const trimmed = value.trim().toLowerCase();
		if (trimmed.endsWith('px')) {
			const parsed = Number(trimmed.slice(0, -2));
			if (Number.isFinite(parsed) && parsed > 0) return parsed;
		}
		return 140;
	}

	function format(t: number) {
		return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
	}

	function formatTimecode(t: number) {
		const s = Math.max(0, Number.isFinite(t) ? t : 0);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = Math.floor(s % 60);
		const f = Math.floor((s % 1) * 100);
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
	}

	function formatSelectionDuration(seconds: number) {
		if (seconds >= 10) return `${seconds.toFixed(1)}s`;
		return `${seconds.toFixed(2)}s`;
	}

	function snapThreshold() {
		return Math.max(0.15, 14 / Math.max(1, pixelsPerSecond));
	}

	function snapTime(value: number, ignoreCueId?: number | null) {
		const threshold = snapThreshold();
		const candidates = [0, safeDuration, currentTime];
		for (const cue of cues) {
			if (ignoreCueId && cueId(cue) === ignoreCueId) continue;
			candidates.push(cue.startTime, cue.endTime);
		}

		let best = value;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const candidate of candidates) {
			const distance = Math.abs(candidate - value);
			if (distance <= threshold && distance < bestDistance) {
				best = candidate;
				bestDistance = distance;
			}
		}
		return clampTime(best);
	}

	function closeContextMenu() {
		contextMenu = null;
		loadingMenuKey = '';
	}

	function clearSelection() {
		selection = null;
		selectionMode = false;
	}

	function openContextMenu(target: ContextMenuTarget) {
		contextMenu = target;
	}

	function canPanFrom(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return true;
		return !target.closest(
			'button,a,input,textarea,select,[data-cue-block],[data-playhead],[data-selection-block],[data-context-menu]'
		);
	}

	function canSelectFrom(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return true;
		return !target.closest(
			'button,a,input,textarea,select,[data-cue-block],[data-playhead],[data-selection-block],[data-context-menu]'
		);
	}

	function seekBy(delta: number) {
		followPlayhead = true;
		onSeek(Math.min(safeDuration, Math.max(0, currentTime + delta)));
	}

	function handleTimelineWheel(e: WheelEvent) {
		if (!scrollEl) return;
		if (!e.shiftKey) {
			const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
			if (delta === 0) return;
			e.preventDefault();
			followPlayhead = false;
			scheduleTimelineScroll({ left: scrollEl.scrollLeft + delta }, true);
			return;
		}
		const rect = scrollEl.getBoundingClientRect();
		const cursorX = e.clientX - rect.left;
		const oldWidth = widthFor(zoom);
		const anchorRatio = Math.min(1, Math.max(0, (scrollEl.scrollLeft + cursorX) / oldWidth));
		const dir = e.deltaY < 0 ? 1 : -1;
		const nextZoom = Math.min(8, Math.max(0.45, zoom * (dir > 0 ? 1.18 : 0.85)));
		zoom = nextZoom;
		requestAnimationFrame(() => {
			if (scrollEl) {
				scheduleTimelineScroll({ left: anchorRatio * widthFor(nextZoom) - cursorX }, true);
			}
		});
	}

	function startPan(e: PointerEvent) {
		if (!scrollEl || selectionMode || e.button !== 0 || !canPanFrom(e.target)) return;
		pan = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			startScrollLeft: scrollEl.scrollLeft,
			startScrollTop: scrollEl.scrollTop,
			moved: false
		};
		scrollEl.setPointerCapture(e.pointerId);
	}

	function movePan(e: PointerEvent) {
		if (!pan || !scrollEl || e.pointerId !== pan.pointerId) return;
		const deltaX = e.clientX - pan.startX;
		const deltaY = e.clientY - pan.startY;
		if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
			pan.moved = true;
			followPlayhead = false;
		}
		if (!pan.moved) return;
		e.preventDefault();
		scheduleTimelineScroll(
			{
				left: pan.startScrollLeft - deltaX,
				top: pan.startScrollTop - deltaY
			},
			true
		);
	}

	function stopPan(e: PointerEvent) {
		if (!pan || e.pointerId !== pan.pointerId) return;
		suppressSeekClick = pan.moved;
		pan = null;
		requestAnimationFrame(() => {
			suppressSeekClick = false;
		});
	}

	function scrubTo(e: PointerEvent | MouseEvent) {
		followPlayhead = true;
		onSeek(secondsFromEvent(e));
	}

	function startScrub(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		closeContextMenu();
		scrub = { pointerId: e.pointerId };
		scrubTo(e);
		window.addEventListener('pointermove', moveScrub);
		window.addEventListener('pointerup', stopScrub, { once: true });
	}

	function moveScrub(e: PointerEvent) {
		if (!scrub || e.pointerId !== scrub.pointerId) return;
		scrubTo(e);
	}

	function stopScrub() {
		scrub = null;
		window.removeEventListener('pointermove', moveScrub);
	}

	function updateCueDraft(id: number, next: Partial<SubtitleCue>) {
		cues = cues.map((c) => (cueId(c) === id ? { ...c, ...next } : c));
	}

	function gapForTime(time: number, ignoreCueId?: number | null) {
		const others = sortCues(cues.filter((cue) => cueId(cue) !== ignoreCueId));
		let gapStart = 0;
		let gapEnd = safeDuration;

		for (const cue of others) {
			if (time < cue.startTime) {
				gapEnd = cue.startTime;
				break;
			}
			gapStart = Math.max(gapStart, cue.endTime);
		}

		return {
			startTime: clampTime(gapStart),
			endTime: clampTime(Math.max(gapStart, gapEnd))
		};
	}

	function fitCueInGap(time: number, preferredDuration = 2.5, ignoreCueId?: number | null) {
		const gap = gapForTime(time, ignoreCueId);
		if (gap.endTime - gap.startTime < minCueDuration) return null;
		const anchor = clampTime(Math.max(time, gap.startTime));
		let startTime = Math.min(anchor, Math.max(gap.startTime, gap.endTime - minCueDuration));
		let endTime = Math.min(gap.endTime, startTime + preferredDuration);
		if (endTime - startTime < minCueDuration) {
			startTime = gap.startTime;
			endTime = Math.min(gap.endTime, startTime + Math.max(preferredDuration, minCueDuration));
		}
		if (endTime - startTime < minCueDuration) return null;
		return { startTime, endTime };
	}

	function addCueAt(time: number, text = 'New subtitle') {
		const fit = fitCueInGap(snapTime(time), 2.5);
		if (!fit) return;
		const cue = {
			id: -Date.now() - Math.floor(Math.random() * 1000),
			startTime: fit.startTime,
			endTime: fit.endTime,
			text
		};
		cues = sortCues([...cues, cue]);
		selectedCueId = cue.id ?? null;
		followPlayhead = true;
		onSeek(cue.startTime);
		onDirty();
	}

	function removeCue(cue: SubtitleCue) {
		onRemoveCue(cue);
		cues = cues.filter((item) => cueId(item) !== cueId(cue));
		if (selectedCueId === cueId(cue)) selectedCueId = null;
		if (editingCueId === cueId(cue)) editingCueId = null;
		onDirty();
	}

	function removeCuesInRange(range: SelectionRange) {
		const overlapping = cues.filter(
			(item) => item.endTime > range.startTime && item.startTime < range.endTime
		);
		if (overlapping.length === 0) return;
		const ids = new Set(overlapping.map((item) => cueId(item)));
		for (const cue of overlapping) onRemoveCue(cue);
		cues = cues.filter((item) => !ids.has(cueId(item)));
		if (selectedCueId !== null && ids.has(selectedCueId)) selectedCueId = null;
		if (editingCueId !== null && ids.has(editingCueId)) editingCueId = null;
		onDirty();
	}

	function startEditCue(cue: SubtitleCue) {
		const id = cueId(cue);
		selectedCueId = id;
		editingCueId = id;
		followPlayhead = true;
		onSeek(cue.startTime);
	}

	function commitCueText(id: number, text: string) {
		const cue = cues.find((item) => cueId(item) === id);
		editingCueId = null;
		if (!cue || cue.text === text) return;
		cues = cues.map((item) => (cueId(item) === id ? { ...item, text } : item));
		onDirty();
	}

	function startDrag(cue: SubtitleCue, mode: 'move' | 'left' | 'right', e: PointerEvent) {
		e.stopPropagation();
		closeContextMenu();
		selectedCueId = cueId(cue);
		drag = { id: cueId(cue), mode, startX: e.clientX, startCue: { ...cue }, moved: false };
		window.addEventListener('pointermove', moveDrag);
		window.addEventListener('pointerup', stopDrag, { once: true });
	}

	function moveDrag(e: PointerEvent) {
		if (!drag || !timelineEl) return;
		const rect = timelineEl.getBoundingClientRect();
		if (Math.abs(e.clientX - drag.startX) < 2) return;
		drag.moved = true;
		const delta = ((e.clientX - drag.startX) / rect.width) * safeDuration;
		const cue = drag.startCue;
		const len = cue.endTime - cue.startTime;
		if (drag.mode === 'move') {
			const fit = fitCueInGap(snapTime(cue.startTime + delta, drag.id), len, drag.id);
			if (fit) updateCueDraft(drag.id, fit);
			return;
		}
		if (drag.mode === 'left') {
			updateCueDraft(drag.id, {
				startTime: Math.min(
					Math.max(0, snapTime(cue.startTime + delta, drag.id)),
					cue.endTime - minCueDuration
				)
			});
			return;
		}
		updateCueDraft(drag.id, {
			endTime: Math.max(
				cue.startTime + minCueDuration,
				Math.min(safeDuration, snapTime(cue.endTime + delta, drag.id))
			)
		});
	}

	function stopDrag() {
		if (drag?.moved) {
			cues = sortCues(cues);
			onDirty();
		}
		drag = null;
		window.removeEventListener('pointermove', moveDrag);
	}

	function hasOverlap(cue: SubtitleCue) {
		return cues.some(
			(item) =>
				cueId(item) !== cueId(cue) &&
				Math.max(item.startTime, cue.startTime) < Math.min(item.endTime, cue.endTime)
		);
	}

	function intersectsRange(cue: SubtitleCue, range: SelectionRange | null) {
		if (!range) return false;
		return Math.max(cue.startTime, range.startTime) < Math.min(cue.endTime, range.endTime);
	}

	function beginSelectionDrag(e: PointerEvent) {
		if (!selectionMode || e.button !== 0 || !canSelectFrom(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		closeContextMenu();
		const startTime = snapTime(secondsFromEvent(e));
		selectionDrag = {
			pointerId: e.pointerId,
			startTime,
			currentTime: startTime
		};
		selection = normalizeRange(startTime, startTime);
		window.addEventListener('pointermove', moveSelectionDrag);
		window.addEventListener('pointerup', endSelectionDrag, { once: true });
	}

	function moveSelectionDrag(e: PointerEvent) {
		if (!selectionDrag || e.pointerId !== selectionDrag.pointerId) return;
		e.preventDefault();
		const current = snapTime(secondsFromEvent(e));
		selectionDrag.currentTime = current;
		selection = normalizeRange(selectionDrag.startTime, current);
	}

	function endSelectionDrag(e: PointerEvent) {
		if (!selectionDrag || e.pointerId !== selectionDrag.pointerId) return;
		window.removeEventListener('pointermove', moveSelectionDrag);
		selection = normalizeRange(selectionDrag.startTime, selectionDrag.currentTime);
		if (!selection || selection.endTime - selection.startTime < minCueDuration) {
			selection = null;
		} else {
			onSeek(selection.startTime);
		}
		selectionMode = false;
		selectionDrag = null;
	}

	function splitCue(targetCue: SubtitleCue, splitTime?: number) {
		const id = cueId(targetCue);
		const at = clampTime(splitTime ?? currentTime);
		if (at <= targetCue.startTime + minCueDuration || at >= targetCue.endTime - minCueDuration) return;
		const leftCue = { ...targetCue, startTime: targetCue.startTime, endTime: at };
		const rightCue = {
			...targetCue,
			id: -Date.now() - Math.floor(Math.random() * 1000),
			startTime: at,
			endTime: targetCue.endTime
		};
		cues = sortCues(cues.flatMap((cue) => (cueId(cue) === id ? [leftCue, rightCue] : [cue])));
		selectedCueId = cueId(rightCue);
		onDirty();
	}

	function duplicateCue(targetCue: SubtitleCue) {
		const fit = fitCueInGap(targetCue.endTime + 0.05, targetCue.endTime - targetCue.startTime);
		if (!fit) return;
		const duplicated = {
			id: -Date.now() - Math.floor(Math.random() * 1000),
			startTime: fit.startTime,
			endTime: fit.endTime,
			text: targetCue.text
		};
		cues = sortCues([...cues, duplicated]);
		selectedCueId = cueId(duplicated);
		onDirty();
	}

	function snapCueToPlayhead(targetCue: SubtitleCue) {
		const fit = fitCueInGap(currentTime, targetCue.endTime - targetCue.startTime, cueId(targetCue));
		if (!fit) return;
		updateCueDraft(cueId(targetCue), fit);
		cues = sortCues(cues);
		onDirty();
	}

	function autoAdjustCue(targetCue: SubtitleCue) {
		const others = sortCues(cues.filter((cue) => cueId(cue) !== cueId(targetCue)));
		let startTime = targetCue.startTime;
		let endTime = targetCue.endTime;

		for (const cue of others) {
			if (cue.endTime <= startTime) continue;
			if (cue.startTime >= endTime) {
				endTime = Math.min(endTime, cue.startTime);
				break;
			}
			if (cue.startTime <= startTime && cue.endTime > startTime) {
				startTime = cue.endTime;
				continue;
			}
			if (cue.startTime < endTime) {
				endTime = cue.startTime;
				break;
			}
		}

		if (endTime - startTime < minCueDuration) {
			const fit = fitCueInGap(targetCue.startTime, Math.max(0.8, targetCue.endTime - targetCue.startTime), cueId(targetCue));
			if (!fit) return;
			startTime = fit.startTime;
			endTime = fit.endTime;
		}

		updateCueDraft(cueId(targetCue), { startTime, endTime });
		cues = sortCues(cues);
		onDirty();
	}

	function addCueFromSelection() {
		if (!selection) return;
		const range = selection;
		const cue = {
			id: -Date.now() - Math.floor(Math.random() * 1000),
			startTime: range.startTime,
			endTime: range.endTime,
			text: 'New subtitle'
		};
		cues = sortCues([
			...cues.filter((item) => item.endTime <= range.startTime || item.startTime >= range.endTime),
			cue
		]);
		selectedCueId = cue.id ?? null;
		onSeek(cue.startTime);
		onDirty();
	}

	function splitSelectionIntoMultipleCues() {
		if (!selection) return;
		const range = selection;
		const totalDuration = range.endTime - range.startTime;
		if (totalDuration < 1.2) {
			addCueFromSelection();
			return;
		}
		const parts = Math.max(2, Math.ceil(totalDuration / 2.8));
		const step = totalDuration / parts;
		const generated = Array.from({ length: parts }, (_, index) => {
			const startTime = range.startTime + index * step;
			const endTime = index === parts - 1 ? range.endTime : range.startTime + (index + 1) * step;
			return {
				id: -Date.now() - index - Math.floor(Math.random() * 1000),
				startTime,
				endTime,
				text: `Cue ${index + 1}`
			};
		});
		cues = sortCues([
			...cues.filter((item) => item.endTime <= range.startTime || item.startTime >= range.endTime),
			...generated
		]);
		selectedCueId = cueId(generated[0]);
		onDirty();
	}

	function normalizeGeneratedSelectionCues(items: SubtitleCue[], range: SelectionRange) {
		const next: SubtitleCue[] = [];
		for (const item of sortCues(items)) {
			const text = item.text?.trim() ?? '';
			if (!text) continue;
			const startTime = clampTime(Math.max(range.startTime, item.startTime));
			const endTime = clampTime(Math.min(range.endTime, item.endTime));
			if (endTime - startTime < minCueDuration) continue;
			const previous = next[next.length - 1];
			const normalized = {
				id: item.id ?? -Date.now() - next.length - Math.floor(Math.random() * 1000),
				startTime,
				endTime,
				text
			};
			if (previous && normalized.startTime < previous.endTime) {
				normalized.startTime = previous.endTime;
			}
			if (normalized.endTime - normalized.startTime < minCueDuration) continue;
			next.push(normalized);
		}
		return next;
	}

	async function requestAiForRange(range: SelectionRange, loadingKey: string, translate: boolean) {
		if (aiBusy) return;
		loadingMenuKey = loadingKey;
		selectionAiBusy = true;
		aiProcessingRange = range;
		try {
			const generated = await onRequestAiGenerate({
				rangeStart: range.startTime,
				rangeEnd: range.endTime,
				translate
			});
			if (!generated || generated.length === 0) {
				loadingMenuKey = '';
				return;
			}
			const normalized = normalizeGeneratedSelectionCues(generated, range);
			if (normalized.length === 0) {
				loadingMenuKey = '';
				return;
			}
			for (const cue of normalized) cueId(cue);
			cues = sortCues([
				...cues.filter((item) => item.endTime <= range.startTime || item.startTime >= range.endTime),
				...normalized
			]);
			onRegisterCueSource({
				cues: normalized,
				source: translate ? 'ai_translate' : 'ai_transcribe'
			});
			selectedCueId = cueId(normalized[0]);
			onDirty();
			closeContextMenu();
		} finally {
			selectionAiBusy = false;
			aiProcessingRange = null;
		}
	}

	async function requestAiForSelection(translate: boolean) {
		if (!selection || aiBusy) return;
		await requestAiForRange(selection, translate ? 'selection:translate' : 'selection:generate', translate);
	}

	async function requestAiForCue(targetCue: SubtitleCue) {
		await requestAiForRange(
			normalizeRange(targetCue.startTime, targetCue.endTime),
			'cue:regenerate',
			false
		);
	}

	async function requestTextTranslateForCue(targetCue: SubtitleCue) {
		if (aiBusy) return;
		loadingMenuKey = 'cue:translate-text';
		selectionAiBusy = true;
		aiProcessingRange = normalizeRange(targetCue.startTime, targetCue.endTime);
		try {
			const translatedCue = await onRequestCueTextTranslate(targetCue);
			if (!translatedCue?.text?.trim()) {
				loadingMenuKey = '';
				return;
			}
			const targetId = cueId(targetCue);
			cues = cues.map((item) =>
				cueId(item) === targetId
					? {
							...item,
							text: translatedCue.text,
							startTime: translatedCue.startTime ?? item.startTime,
							endTime: translatedCue.endTime ?? item.endTime
						}
					: item
			);
			selectedCueId = targetId;
			onDirty();
			closeContextMenu();
		} finally {
			selectionAiBusy = false;
			aiProcessingRange = null;
		}
	}

	function enterSelectionMode() {
		closeContextMenu();
		selection = null;
		selectionMode = true;
	}

	function selectionMenuItems(): MenuItem[] {
		return [
			{ key: 'selection:add', label: 'Add Cue From Selection', icon: 'ink_pen' },
			{
				key: 'selection:generate',
				label: 'Generate Subtitle (AI)',
				icon: 'auto_awesome',
				disabled: aiBusy
			},
			{
				key: 'selection:translate',
				label: 'Translate Selection',
				icon: 'translate',
				disabled: aiBusy
			},
			{ key: 'selection:split-multi', label: 'Split Into Multiple Cues', icon: 'splitscreen' },
			{
				key: 'selection:delete-cues',
				label: `Delete Cues in Selection${selectionCueCount ? ` (${selectionCueCount})` : ''}`,
				icon: 'delete_sweep',
				danger: true,
				disabled: selectionCueCount === 0
			},
			{ key: 'selection:clear', label: 'Clear Selection', icon: 'layers_clear', danger: true }
		];
	}

	function timelineMenuItems(): MenuItem[] {
		return [
			{ key: 'timeline:add', label: 'Add Cue Here', icon: 'add_circle' },
			{
				key: 'timeline:select-mode',
				label: selectionMode ? 'Exit Range Mode' : 'Select Range Mode',
				icon: 'select_all',
				shortcut: 'S'
			},
			{
				key: 'timeline:send-selection',
				label: 'Send Selection to AI',
				icon: 'smart_toy',
				disabled: !selection || aiBusy
			},
			{
				key: 'timeline:snap-playhead',
				label: 'Snap to Playhead',
				icon: 'my_location',
				disabled: !activeCue && !selection
			},
			{
				key: 'timeline:auto-adjust',
				label: 'Auto Adjust Timing',
				icon: 'schedule',
				disabled: !activeCue
			}
		];
	}

	function cueMenuItems(): MenuItem[] {
		return [
			{ key: 'cue:add-here', label: 'Add Cue Here', icon: 'add_circle' },
			{ key: 'cue:select-mode', label: 'Select Range Mode', icon: 'select_all', shortcut: 'S' },
			{
				key: 'cue:send-selection',
				label: 'Send Selection to AI',
				icon: 'smart_toy',
				disabled: !selection || aiBusy
			},
			{
				key: 'cue:regenerate',
				label: 'Re-Generate Cue',
				icon: 'auto_awesome',
				disabled: aiBusy
			},
			{
				key: 'cue:translate-text',
				label: 'Translate Text Only',
				icon: 'translate',
				disabled: aiBusy
			},
			{ key: 'cue:split', label: 'Split Cue', icon: 'content_cut' },
			{ key: 'cue:delete', label: 'Delete Cue', icon: 'delete', danger: true, shortcut: 'Del' },
			{ key: 'cue:duplicate', label: 'Duplicate Cue', icon: 'content_copy' },
			{ key: 'cue:snap-playhead', label: 'Snap to Playhead', icon: 'my_location' },
			{ key: 'cue:auto-adjust', label: 'Auto Adjust Timing', icon: 'schedule' }
		];
	}

	function currentMenuItems() {
		if (!contextMenu) return [];
		if (contextMenu.type === 'selection') return selectionMenuItems();
		if (contextMenu.type === 'cue') return cueMenuItems();
		return timelineMenuItems();
	}

	function handleMenuAction(key: string) {
		const menu = contextMenu;
		const cue =
			menu && menu.type === 'cue' ? cues.find((item) => cueId(item) === menu.cueId) ?? null : activeCue;

		if (key === 'timeline:add' && contextMenu) addCueAt(contextMenu.time);
		if (key === 'cue:add-here' && contextMenu) addCueAt(contextMenu.time);
		if (key === 'timeline:select-mode' || key === 'cue:select-mode') {
			selectionMode = !selectionMode;
			if (!selectionMode) selectionDrag = null;
		}
		if (key === 'timeline:send-selection' || key === 'cue:send-selection') {
			void requestAiForSelection(false);
		}
		if (key === 'timeline:snap-playhead') {
			if (selection) {
				const duration = selection.endTime - selection.startTime;
				const startTime = clampTime(currentTime);
				selection = normalizeRange(startTime, Math.min(safeDuration, startTime + duration));
			} else if (activeCue) {
				snapCueToPlayhead(activeCue);
			}
		}
		if (key === 'timeline:auto-adjust' && activeCue) autoAdjustCue(activeCue);
		if (key === 'cue:regenerate' && cue) void requestAiForCue(cue);
		if (key === 'cue:translate-text' && cue) void requestTextTranslateForCue(cue);
		if (key === 'cue:split' && cue) splitCue(cue, contextMenu?.time);
		if (key === 'cue:delete' && cue) removeCue(cue);
		if (key === 'cue:duplicate' && cue) duplicateCue(cue);
		if (key === 'cue:snap-playhead' && cue) snapCueToPlayhead(cue);
		if (key === 'cue:auto-adjust' && cue) autoAdjustCue(cue);
		if (key === 'selection:add') addCueFromSelection();
		if (key === 'selection:generate') void requestAiForSelection(false);
		if (key === 'selection:translate') void requestAiForSelection(true);
		if (key === 'selection:split-multi') splitSelectionIntoMultipleCues();
		if (key === 'selection:delete-cues' && selection) removeCuesInRange(selection);
		if (key === 'selection:clear') clearSelection();
		if (
			key === 'selection:generate' ||
			key === 'selection:translate' ||
			key === 'cue:regenerate' ||
			key === 'cue:translate-text'
		)
			return;
		closeContextMenu();
	}

	function handleTrackClick(e: MouseEvent) {
		if (suppressSeekClick) return;
		closeContextMenu();
		followPlayhead = true;
		onSeek(secondsFromEvent(e));
	}

	function handleTimelineContextMenu(e: MouseEvent) {
		e.preventDefault();
		closeContextMenu();
		const time = snapTime(secondsFromEvent(e));
		openContextMenu({
			type: 'timeline',
			x: e.clientX,
			y: e.clientY,
			time
		});
	}

	function handleCueContextMenu(cue: SubtitleCue, e: MouseEvent) {
		selectedCueId = cueId(cue);
		openContextMenu({
			type: 'cue',
			x: e.clientX,
			y: e.clientY,
			time: snapTime(secondsFromEvent(e), cueId(cue)),
			cueId: cueId(cue)
		});
	}

	function handleSelectionBlockClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!selection) return;
		openContextMenu({
			type: 'selection',
			x: e.clientX,
			y: e.clientY,
			time: secondsFromEvent(e)
		});
	}

	function isTypingTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLElement &&
			Boolean(target.closest('input,textarea,select,[contenteditable="true"]'))
		);
	}

	function onWindowPointerDown(e: PointerEvent) {
		const target = e.target;
		if (target instanceof HTMLElement && target.closest('[data-context-menu]')) return;
		if (target instanceof HTMLElement && timelineEl?.contains(target)) return;
		closeContextMenu();
		if (selection) clearSelection();
	}

	function startHeightResize(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		heightResize = {
			pointerId: e.pointerId,
			startY: e.clientY,
			startHeight: trackHeightPx
		};
		window.addEventListener('pointermove', moveHeightResize);
		window.addEventListener('pointerup', stopHeightResize, { once: true });
	}

	function moveHeightResize(e: PointerEvent) {
		if (!heightResize || e.pointerId !== heightResize.pointerId) return;
		const delta = e.clientY - heightResize.startY;
		trackHeightPx = Math.max(
			minTrackHeightPx,
			Math.min(maxTrackHeightPx, Math.round(heightResize.startHeight + delta))
		);
	}

	function stopHeightResize() {
		heightResize = null;
		window.removeEventListener('pointermove', moveHeightResize);
	}

	function onWindowKeyDown(e: KeyboardEvent) {
		if (isTypingTarget(e.target)) return;
		if (e.key === 'Escape') {
			closeContextMenu();
			if (selectionDrag) {
				window.removeEventListener('pointermove', moveSelectionDrag);
				selectionDrag = null;
			}
			if (editingCueId !== null) editingCueId = null;
			if (selectionMode || selection) {
				clearSelection();
			}
			return;
		}
		if (e.key.toLowerCase() === 's') {
			e.preventDefault();
			selectionMode = !selectionMode;
			if (!selectionMode) selectionDrag = null;
			return;
		}
		if (e.key.toLowerCase() === 'a') {
			e.preventDefault();
			addCueAt(currentTime);
			return;
		}
		if ((e.key === 'Delete' || e.key === 'Backspace') && activeCue) {
			e.preventDefault();
			removeCue(activeCue);
			return;
		}
		if (e.key === 'Enter' && activeCue && editingCueId === null) {
			e.preventDefault();
			startEditCue(activeCue);
		}
	}

	$effect(() => {
		if (!scrollEl || !followPlayhead || pan || drag || scrub || selectionDrag) return;
		const viewport = scrollEl.clientWidth;
		if (viewport <= 0) return;
		const playheadX = playheadRatio * timelineWidth;
		const currentScroll = scrollEl.scrollLeft;
		const maxScroll = Math.max(0, timelineWidth - viewport);
		const target = Math.min(maxScroll, Math.max(0, playheadX - viewport * 0.42));
		const edgePadding = viewport * 0.18;
		const isOutsideView =
			playheadX < currentScroll + edgePadding || playheadX > currentScroll + viewport - edgePadding;
		if (!isPlaying && !isOutsideView) return;
		scheduleTimelineScroll(
			{
				left: isPlaying ? currentScroll + (target - currentScroll) * 0.18 : target
			},
			!isPlaying
		);
	});

	$effect(() => {
		const laneEnds: number[] = [];
		const nextMap: Record<number, number> = {};
		const nextMinWidthMap: Record<number, number> = {};
		for (const cue of sortCues(cues)) {
			const id = cueId(cue);
			const startPx = (cue.startTime / safeDuration) * timelineWidth;
			const durationWidthPx =
				(Math.max(0, cue.endTime - cue.startTime) / safeDuration) * timelineWidth;
			const visualWidthPx = Math.max(minCueVisualWidthPx, durationWidthPx);
			let assigned = -1;
			for (let i = 0; i < laneEnds.length; i += 1) {
				if (laneEnds[i] <= startPx) {
					laneEnds[i] = startPx + visualWidthPx + visualLaneGapPx;
					assigned = i;
					break;
				}
			}
			if (assigned === -1) {
				laneEnds.push(startPx + visualWidthPx + visualLaneGapPx);
				assigned = laneEnds.length - 1;
			}
			nextMap[id] = assigned;
			nextMinWidthMap[id] = visualWidthPx;
		}
		rowCount = Math.max(1, laneEnds.length);
		cueRowMap = nextMap;
		cueMinWidthMap = nextMinWidthMap;
	});

	onMount(() => {
		trackHeightPx = heightToPixels(height);
		window.addEventListener('pointerdown', onWindowPointerDown);
		window.addEventListener('keydown', onWindowKeyDown);
	});

	onDestroy(() => {
		cancelTimelineScrollFrame();
		window.removeEventListener('pointerdown', onWindowPointerDown);
		window.removeEventListener('keydown', onWindowKeyDown);
		window.removeEventListener('pointermove', moveScrub);
		window.removeEventListener('pointermove', moveDrag);
		window.removeEventListener('pointermove', moveSelectionDrag);
		window.removeEventListener('pointermove', moveHeightResize);
	});
</script>

<section
	class="tl-root w-full min-w-0 select-none flex flex-col gap-0 overflow-visible"
	style="
        --tl-track-h: {trackHeightPx}px;
        --tl-track-rows: {rowCount};
        --tl-track-row-height: {rowHeight}rem;
        --tl-track-row-gap: {rowGap}rem;
        background: var(--tl-bg);
        border: 1px solid var(--tl-border);
        border-radius: var(--tl-radius);
    "
>
	<div
		class="tl-toolbar flex items-center gap-2 px-4 py-2.5 flex-wrap"
		style="
            background: var(--tl-surface);
            border-bottom: 1px solid var(--tl-border);
        "
	>
		<div class="flex items-center gap-1 shrink-0">
			<button
				type="button"
				onclick={onTogglePlayback}
				class="tl-btn-primary"
				aria-label={isPlaying ? 'Pause' : 'Play'}
				title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
			>
				<span class="material-symbols-rounded" style="font-size:18px;">
					{isPlaying ? 'pause' : 'play_arrow'}
				</span>
			</button>

			<button
				type="button"
				onclick={() => seekBy(-5)}
				class="tl-btn-ghost"
				aria-label="Mundur 5 detik"
				title="Mundur 5 detik"
			>
				<span class="material-symbols-rounded" style="font-size:17px;">replay_5</span>
			</button>

			<button
				type="button"
				onclick={() => seekBy(5)}
				class="tl-btn-ghost"
				aria-label="Maju 5 detik"
				title="Maju 5 detik"
			>
				<span class="material-symbols-rounded" style="font-size:17px;">forward_5</span>
			</button>
		</div>

		<div class="tl-divider"></div>

		<div class="tl-timecode shrink-0 tabular-nums" style="font-variant-numeric: tabular-nums;">
			<span style="color: var(--tl-text-primary);">{formatTimecode(currentTime)}</span>
			<span style="color: var(--tl-text-faint);">&nbsp;/&nbsp;{formatTimecode(duration)}</span>
		</div>

		<div class="tl-divider"></div>

		<button
			type="button"
			onclick={() => (followPlayhead = !followPlayhead)}
			class="tl-btn-toggle shrink-0 {followPlayhead ? 'active' : ''}"
			title="Follow playhead"
			aria-pressed={followPlayhead}
		>
			<span class="material-symbols-rounded" style="font-size:15px;">my_location</span>
			Follow
		</button>

		<div class="tl-divider"></div>

		<button
			type="button"
			onclick={() => (selectionMode = !selectionMode)}
			class="tl-btn-toggle shrink-0 {selectionMode ? 'active' : ''}"
			title="Select range mode (S)"
			aria-pressed={selectionMode}
		>
			<span class="material-symbols-rounded" style="font-size:15px;">select_all</span>
			Range
		</button>

		{#if selection}
			<div class="tl-badge shrink-0">
				<span class="material-symbols-rounded" style="font-size:13px;">timeline</span>
				{formatTimecode(selection.startTime)} - {formatTimecode(selection.endTime)}
			</div>
			<div class="tl-badge shrink-0">
				<span class="material-symbols-rounded" style="font-size:13px;">straighten</span>
				{formatSelectionDuration(selectionDuration)}
			</div>
		{/if}

		<div class="tl-divider"></div>

		<div class="flex items-center gap-1 shrink-0">
			<button
				type="button"
				onclick={() => (zoom = Math.max(0.45, zoom * 0.85))}
				class="tl-btn-ghost"
				aria-label="Zoom out"
				title="Zoom out (Shift+Scroll)"
			>
				<span class="material-symbols-rounded" style="font-size:16px;">zoom_out</span>
			</button>
			<span class="tl-zoom-label">{Math.round(zoom * 100)}%</span>
			<button
				type="button"
				onclick={() => (zoom = Math.min(8, zoom * 1.18))}
				class="tl-btn-ghost"
				aria-label="Zoom in"
				title="Zoom in (Shift+Scroll)"
			>
				<span class="material-symbols-rounded" style="font-size:16px;">zoom_in</span>
			</button>
		</div>

		<div class="tl-divider"></div>

		<div class="tl-badge shrink-0">
			<span class="material-symbols-rounded" style="font-size:13px;">subtitles</span>
			{cues.length} cues
		</div>

		<p class="tl-hint ml-auto shrink-0 hidden lg:block">
			Right click timeline → menu &nbsp;·&nbsp; S → range mode &nbsp;·&nbsp; A → add cue
		</p>
	</div>

	<div
		bind:this={scrollEl}
		class="tl-scroll {pan?.moved ? 'cursor-grabbing' : selectionMode ? 'cursor-crosshair' : 'cursor-grab'}"
		role="region"
		aria-label="Scrollable subtitle timeline"
		onwheel={handleTimelineWheel}
		onpointerdown={startPan}
		onpointermove={movePan}
		onpointerup={stopPan}
		onpointercancel={stopPan}
	>
		<div class="shrink-0 px-0 pt-2" style:width={`${timelineWidth}px`}>
			<div class="tl-ruler relative h-5 mb-1.5">
				{#each ticks as tick}
					<span class="tl-tick-label absolute top-0" style:left={`${(tick / safeDuration) * 100}%`}>
						{format(tick)}
					</span>
				{/each}
			</div>

			<div
				bind:this={timelineEl}
				class="tl-track relative"
				role="button"
				aria-label="Subtitle timeline"
				tabindex="0"
				oncontextmenu={handleTimelineContextMenu}
				onclick={handleTrackClick}
				onpointerdown={beginSelectionDrag}
				onkeydown={(e) => {
					if (e.key === 'Enter') onSeek(currentTime);
				}}
			>
				{#each ticks as tick}
					<span
						class="tl-grid-line absolute top-0 h-full w-px pointer-events-none"
						style:left={`${(tick / safeDuration) * 100}%`}
					></span>
				{/each}

				{#if selection}
					<button
						type="button"
						data-selection-block
						class="tl-selection-block absolute {selectionAiBusy && aiProcessingRange && selection.startTime === aiProcessingRange.startTime && selection.endTime === aiProcessingRange.endTime ? 'is-busy' : ''}"
						style:left={selectionLeft}
						style:width={selectionWidth}
						onclick={handleSelectionBlockClick}
						oncontextmenu={(e) => {
							e.preventDefault();
							handleSelectionBlockClick(e);
						}}
					>
						<span class="tl-selection-chip">
							{formatSelectionDuration(selectionDuration)}
						</span>
						{#if selectionAiBusy && aiProcessingRange && selection.startTime === aiProcessingRange.startTime && selection.endTime === aiProcessingRange.endTime}
							<span class="tl-selection-loading" aria-hidden="true">
								<span class="material-symbols-rounded tl-selection-loading-icon">auto_awesome</span>
								<span>Generating...</span>
							</span>
						{/if}
					</button>
				{/if}

				<span
					class="tl-playhead-line pointer-events-none absolute top-0 z-20 h-full w-0.5 -translate-x-1/2"
					style:left={playheadLeft}
				></span>

				<div
					data-playhead
					role="slider"
					tabindex="0"
					aria-label="Playhead"
					aria-valuemin="0"
					aria-valuemax={safeDuration}
					aria-valuenow={currentTime}
					aria-valuetext={formatTimecode(currentTime)}
					class="tl-playhead-handle absolute z-30 -translate-x-1/2 cursor-ew-resize touch-none outline-none"
					style:left={playheadLeft}
					onclick={(e) => e.stopPropagation()}
					onpointerdown={startScrub}
					onkeydown={(e) => {
						if (e.key === 'ArrowLeft') seekBy(e.shiftKey ? -5 : -0.5);
						if (e.key === 'ArrowRight') seekBy(e.shiftKey ? 5 : 0.5);
					}}
				>
					<span class="tl-playhead-diamond"></span>
				</div>

				{#each cues as cue (cueId(cue))}
					<CueBlock
						{cue}
						duration={safeDuration}
						row={cueRowMap[cueId(cue)]}
						minWidthPx={cueMinWidthMap[cueId(cue)] ?? minCueVisualWidthPx}
						selected={selectedCueId === cueId(cue)}
						overlap={hasOverlap(cue)}
						editing={editingCueId === cueId(cue)}
						aiBusy={
							selectionAiBusy
								? intersectsRange(cue, aiProcessingRange) || cueId(cue) === selectedCueId
								: aiBusy && cueId(cue) === selectedCueId
						}
						onSelect={() => {
							selectedCueId = cueId(cue);
							followPlayhead = true;
							onSeek(cue.startTime);
							onCueSelect(cue);
						}}
						onDelete={() => removeCue(cue)}
						onEditStart={() => startEditCue(cue)}
						onEditCommit={(text) => commitCueText(cueId(cue), text)}
						onEditCancel={() => {
							editingCueId = null;
						}}
						onPointerStart={(mode, event) => startDrag(cue, mode, event)}
						onContextMenu={(event) => handleCueContextMenu(cue, event)}
					/>
				{/each}
			</div>

		</div>
	</div>

	<button
		type="button"
		class="tl-height-resizer"
		title="Geser atas bawah untuk ubah tinggi track"
		aria-label="Resize tinggi timeline"
		onpointerdown={startHeightResize}
	>
		<span class="material-symbols-rounded" style="font-size:14px;">drag_handle</span>
	</button>
</section>

{#if contextMenu}
	<div data-context-menu>
		<TimelineContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			items={currentMenuItems()}
			loadingKey={loadingMenuKey}
			loadingText={loadingMenuText}
			onSelect={handleMenuAction}
		/>
	</div>
{/if}
