<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AnimeCard from './AnimeCard.svelte';

	type AnimeGridItem = {
		id?: number | string;
		slug?: string;
		title: string;
		thumbnail: string;
		genre?: string[];
		genres?: string[];
		status?: string;
		rank?: number;
		href?: string;
		rating?: number | string | null;
	};

	type Columns = {
		base?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};

	type Props = {
		items: AnimeGridItem[];
		columns?: Columns;
		gap?: number;
		mdGap?: number;
		overscanRows?: number;
		showRank?: boolean;
		mobileLimit?: number;
		ariaLabel?: string;
	};

	let {
		items,
		columns = { base: 3, sm: 4, md: 5, lg: 6 },
		gap = 12,
		mdGap = 16,
		overscanRows = 2,
		showRank = false,
		mobileLimit,
		ariaLabel = 'Daftar anime'
	}: Props = $props();

	let container: HTMLDivElement | undefined = $state();
	let viewportHeight = $state(900);
	let viewportWidth = $state(390);
	let containerTop = $state(0);
	let containerWidth = $state(0);
	let scrollY = $state(0);
	let active = $state(true);
	let frame = 0;
	let resizeObserver: ResizeObserver | undefined;
	let intersectionObserver: IntersectionObserver | undefined;

	const activeGap = $derived(viewportWidth >= 768 ? mdGap : gap);
	const columnCount = $derived(resolveColumns(viewportWidth));
	const effectiveItems = $derived(
		mobileLimit && viewportWidth < 768 ? items.slice(0, mobileLimit) : items
	);
	const rowCount = $derived(Math.ceil(effectiveItems.length / columnCount));
	const cardWidth = $derived(
		containerWidth > 0
			? (containerWidth - activeGap * Math.max(0, columnCount - 1)) / columnCount
			: 120
	);
	const rowHeight = $derived(Math.max(170, Math.ceil(cardWidth * 1.5 + 54 + activeGap)));
	const totalHeight = $derived(rowCount * rowHeight);
	const offsetTop = $derived(Math.max(0, scrollY - containerTop));
	const firstRow = $derived(Math.max(0, Math.floor(offsetTop / rowHeight) - overscanRows));
	const visibleRowCount = $derived(Math.ceil(viewportHeight / rowHeight) + overscanRows * 2);
	const lastRow = $derived(Math.min(rowCount, firstRow + visibleRowCount));
	const startIndex = $derived(firstRow * columnCount);
	const endIndex = $derived(Math.min(effectiveItems.length, lastRow * columnCount));
	const visibleItems = $derived(
		effectiveItems.slice(startIndex, endIndex).map((item, offset) => ({
			item,
			index: startIndex + offset,
			key: item.id ?? item.slug ?? `${item.title}-${startIndex + offset}`
		}))
	);
	const topPad = $derived(firstRow * rowHeight);
	const bottomPad = $derived(Math.max(0, totalHeight - topPad - Math.ceil((endIndex - startIndex) / columnCount) * rowHeight));

	function resolveColumns(width: number) {
		if (width >= 1280) return columns.xl ?? columns.lg ?? columns.md ?? columns.sm ?? columns.base ?? 3;
		if (width >= 1024) return columns.lg ?? columns.md ?? columns.sm ?? columns.base ?? 3;
		if (width >= 768) return columns.md ?? columns.sm ?? columns.base ?? 3;
		if (width >= 640) return columns.sm ?? columns.base ?? 3;
		return columns.base ?? 3;
	}

	function measure() {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		containerTop = rect.top + window.scrollY;
		containerWidth = rect.width;
		viewportHeight = window.innerHeight;
		viewportWidth = window.innerWidth;
		scrollY = window.scrollY;
	}

	function scheduleMeasure() {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (!active) return;
			measure();
		});
	}

	function genresFor(item: AnimeGridItem) {
		return item.genres ?? item.genre ?? [];
	}

	onMount(() => {
		measure();
		resizeObserver = new ResizeObserver(scheduleMeasure);
		if (container) resizeObserver.observe(container);

		intersectionObserver = new IntersectionObserver(
			(entries) => {
				active = entries[0]?.isIntersecting ?? true;
				if (active) scheduleMeasure();
			},
			{ rootMargin: '900px 0px' }
		);
		if (container) intersectionObserver.observe(container);

		window.addEventListener('scroll', scheduleMeasure, { passive: true });
		window.addEventListener('resize', scheduleMeasure, { passive: true });

		return () => {
			window.removeEventListener('scroll', scheduleMeasure);
			window.removeEventListener('resize', scheduleMeasure);
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			if (frame) cancelAnimationFrame(frame);
		};
	});

	onDestroy(() => {
		if (frame) cancelAnimationFrame(frame);
	});
</script>

<div
	bind:this={container}
	class="virtual-anime-grid"
	style="--grid-columns: {columnCount}; --grid-gap: {activeGap}px;"
	role="list"
	aria-label={ariaLabel}
>
	{#if topPad > 0}
		<div class="virtual-anime-grid__spacer" style="height: {topPad}px;"></div>
	{/if}

	<div class="virtual-anime-grid__items">
		{#each visibleItems as entry (entry.key)}
			<div role="listitem" class="virtual-anime-grid__cell">
				<AnimeCard
					title={entry.item.title}
					thumbnail={entry.item.thumbnail}
					genres={genresFor(entry.item)}
					slug={entry.item.slug}
					href={entry.item.href}
					status={entry.item.status as 'Ongoing' | 'Completed'}
					rank={showRank ? entry.index + 1 : entry.item.rank}
					rating={entry.item.rating}
					aboveFold={entry.index < columnCount * 2}
				/>
			</div>
		{/each}
	</div>

	{#if bottomPad > 0}
		<div class="virtual-anime-grid__spacer" style="height: {bottomPad}px;"></div>
	{/if}
</div>

<style>
	.virtual-anime-grid {
		width: 100%;
		contain: layout paint style;
	}

	.virtual-anime-grid__items {
		display: grid;
		grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
		gap: var(--grid-gap);
		align-items: start;
	}

	.virtual-anime-grid__cell {
		min-width: 0;
	}

	.virtual-anime-grid__spacer {
		pointer-events: none;
	}
</style>
