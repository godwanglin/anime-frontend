<script lang="ts">
	import { onMount } from 'svelte';
	import AlphabetRail, { DEFAULT_ALPHABET } from '$lib/components/AlphabetRail.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import VirtualizedAnimeGrid from '$lib/components/VirtualizedAnimeGrid.svelte';
	import type { PageData } from './$types';

	type Genre = {
		id: number;
		slug?: string;
		name: string;
		animeCount: number;
	};

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre: string[];
		thumbnail: string;
		status: 'Ongoing' | 'Completed';
	};

	const { data }: { data: PageData } = $props();
	const genres = $derived((data.genres ?? []) as Genre[]);
	const popular = $derived((data.popular ?? []) as Anime[]);

	const ALPHABET = DEFAULT_ALPHABET;

	const visibleGroups = $derived.by(() => {
		const map: Record<string, Genre[]> = {};
		for (const g of genres) {
			const first = (g.name?.charAt(0) ?? '').toUpperCase();
			const key = /[A-Z]/.test(first) ? first : '#';
			if (!map[key]) map[key] = [];
			map[key].push(g);
		}
		return ALPHABET.filter((k) => map[k]?.length).map((letter) => ({
			letter,
			items: (map[letter] ?? []).sort((a, b) => a.name.localeCompare(b.name))
		}));
	});

	const visibleSet = $derived(new Set(visibleGroups.map((g) => g.letter)));
	let activeLetter = $state('');

	type ViewMode = 'grid' | 'list';
	const VIEW_KEY = 'genre:view';
	let viewMode = $state<ViewMode>('grid');

	onMount(() => {
		try {
			const saved = localStorage.getItem(VIEW_KEY);
			if (saved === 'list' || saved === 'grid') viewMode = saved;
		} catch {
			/* ignore */
		}
	});

	function setView(mode: ViewMode) {
		viewMode = mode;
		try {
			localStorage.setItem(VIEW_KEY, mode);
		} catch {
			/* ignore */
		}
	}

	$effect(() => {
		if (!activeLetter && visibleGroups.length > 0) activeLetter = visibleGroups[0].letter;
	});

	function jumpTo(letter: string) {
		const el = document.getElementById(`genre-section-${letter}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeLetter = letter;
		}
	}

	onMount(() => {
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				const intersecting = entries.filter((e) => e.isIntersecting);
				if (intersecting.length === 0) return;
				const top = intersecting.sort(
					(a, b) => a.boundingClientRect.top - b.boundingClientRect.top
				)[0];
				const letter = top.target.getAttribute('data-letter');
				if (letter) activeLetter = letter;
			},
			{ rootMargin: '-20% 0px -60% 0px', threshold: 0 }
		);
		const els = document.querySelectorAll('[data-genre-section]');
		els.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

<SEO title="Genre Anime" description="Direktori genre anime untuk menemukan tontonan baru." />

<div class="genre-page">
	<header class="genre-header">
		<div class="genre-header-top">
			<div>
				<p class="genre-eyebrow">Direktori</p>
				<h1 class="genre-title">Genre</h1>
			</div>
			<div class="view-toggle" role="group" aria-label="Pilih tampilan">
				<button
					type="button"
					class="view-btn"
					class:view-btn-active={viewMode === 'grid'}
					onclick={() => setView('grid')}
					aria-pressed={viewMode === 'grid'}
					aria-label="Tampilan grid"
				>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
						<rect x="3" y="3" width="8" height="8" rx="1.5" />
						<rect x="13" y="3" width="8" height="8" rx="1.5" />
						<rect x="3" y="13" width="8" height="8" rx="1.5" />
						<rect x="13" y="13" width="8" height="8" rx="1.5" />
					</svg>
					<span>Grid</span>
				</button>
				<button
					type="button"
					class="view-btn"
					class:view-btn-active={viewMode === 'list'}
					onclick={() => setView('list')}
					aria-pressed={viewMode === 'list'}
					aria-label="Tampilan list"
				>
					<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
						<rect x="3" y="5" width="18" height="2" rx="1" />
						<rect x="3" y="11" width="18" height="2" rx="1" />
						<rect x="3" y="17" width="18" height="2" rx="1" />
					</svg>
					<span>List</span>
				</button>
			</div>
		</div>
		<p class="genre-lede">
			{genres.length} genre — loncat lewat indeks huruf di samping
		</p>
	</header>

	<div class="genre-list">
		{#each visibleGroups as group (group.letter)}
			<section
				id="genre-section-{group.letter}"
				data-genre-section
				data-letter={group.letter}
				class="genre-group"
				aria-labelledby="genre-letter-{group.letter}"
			>
				<header class="genre-group-header">
					<span class="genre-letter" id="genre-letter-{group.letter}">{group.letter}</span>
					<span class="genre-letter-rule" aria-hidden="true"></span>
					<span class="genre-letter-count">{group.items.length}</span>
				</header>
				<ul class="genre-rows" class:genre-rows-grid={viewMode === 'grid'}>
					{#each group.items as g (g.id)}
						<li>
							<a class="genre-row" href="/browse?genre={encodeURIComponent(g.name)}">
								<span class="genre-name">{g.name}</span>
								<span class="genre-count">{g.animeCount}</span>
								<span class="genre-arrow" aria-hidden="true">→</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	{#if popular.length > 0}
		<section class="genre-popular">
			<header class="genre-popular-header">
				<h2 class="genre-popular-title">Populer Sekarang</h2>
				<a href="/popular" class="genre-popular-link">Lihat semua →</a>
			</header>
			<VirtualizedAnimeGrid
				items={popular}
				columns={{ base: 3, md: 6 }}
				showRank
				ariaLabel="Anime populer"
			/>
		</section>
	{/if}
</div>

<AlphabetRail letters={ALPHABET} enabled={visibleSet} active={activeLetter} onJump={jumpTo} />

<NavigationBottom />

<style>
	.genre-page {
		max-width: 52rem;
		margin: 0 auto;
		padding: 0 1rem 4rem;
	}

	.genre-header {
		padding: 2.25rem 0 1.75rem;
		border-bottom: 1px solid var(--border);
		margin-bottom: 2rem;
	}

	.genre-header-top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
	}

	.view-toggle {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--surface-offset);
		border: 1px solid var(--border);
		border-radius: 10px;
	}

	.view-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		background: transparent;
		border: 0;
		border-radius: 7px;
		color: var(--text-faint);
		font-size: 11.5px;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			background-color 160ms ease,
			color 160ms ease;
	}

	.view-btn:hover {
		color: var(--text-primary);
	}

	.view-btn-active {
		background: var(--surface-2, var(--surface));
		color: var(--text-primary);
		box-shadow: 0 1px 3px oklch(0 0 0 / 0.06);
	}

	.genre-eyebrow {
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin: 0 0 8px;
	}

	.genre-title {
		font-size: clamp(2.25rem, 6vw, 3.25rem);
		font-weight: 900;
		letter-spacing: -0.025em;
		color: var(--text-primary);
		line-height: 1;
		margin: 0;
	}

	.genre-lede {
		margin: 12px 0 0;
		color: var(--text-faint);
		font-size: 13px;
	}

	.genre-list {
		display: flex;
		flex-direction: column;
		gap: 2.25rem;
	}

	.genre-group {
		scroll-margin-top: 84px;
	}

	.genre-group-header {
		display: flex;
		align-items: baseline;
		gap: 16px;
		margin-bottom: 0.25rem;
	}

	.genre-letter {
		font-family: 'Bebas Neue', 'Lexend Deca', sans-serif;
		font-size: clamp(48px, 8vw, 72px);
		font-weight: 900;
		line-height: 0.9;
		color: var(--text-primary);
		letter-spacing: -0.015em;
		opacity: 0.92;
	}

	.genre-letter-rule {
		flex: 1;
		height: 1px;
		background: var(--border);
		transform: translateY(-6px);
	}

	.genre-letter-count {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
		transform: translateY(-6px);
	}

	.genre-rows {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--border);
	}

	.genre-rows li:last-child .genre-row {
		border-bottom: 1px solid var(--border);
	}

	.genre-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 18px;
		padding: 14px 6px;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		transition:
			background-color 180ms ease,
			padding 180ms ease;
	}

	.genre-row:hover {
		background: var(--surface-offset);
		padding-left: 14px;
		padding-right: 12px;
	}

	/* ── Grid mode ───────────────────────────────────── */
	.genre-rows-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		border-top: 0;
		padding-top: 6px;
	}

	@media (min-width: 720px) {
		.genre-rows-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.genre-rows-grid li:last-child .genre-row,
	.genre-rows-grid .genre-row {
		border-bottom: 0;
	}

	.genre-rows-grid .genre-row {
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: 10px;
		gap: 10px;
		grid-template-columns: 1fr auto;
	}

	.genre-rows-grid .genre-row:hover {
		background: var(--surface-offset);
		padding-left: 14px;
		padding-right: 14px;
		border-color: var(--border-strong);
	}

	.genre-rows-grid .genre-arrow {
		display: none;
	}

	.genre-row:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
		border-radius: 4px;
	}

	.genre-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.005em;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.genre-count {
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		color: var(--text-faint);
		font-weight: 600;
	}

	.genre-arrow {
		font-size: 15px;
		color: var(--text-faint);
		line-height: 1;
		transition:
			transform 180ms ease,
			color 180ms ease;
	}

	.genre-row:hover .genre-arrow {
		color: var(--accent);
		transform: translateX(4px);
	}

	/* ── Populer section ─────────────────────────────── */
	.genre-popular {
		margin-top: 3.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}

	.genre-popular-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.genre-popular-title {
		font-size: 1.125rem;
		font-weight: 900;
		color: var(--text-primary);
		letter-spacing: -0.015em;
		margin: 0;
	}

	.genre-popular-link {
		font-size: 12px;
		font-weight: 700;
		color: var(--accent);
		text-decoration: none;
		letter-spacing: 0.01em;
	}

	.genre-popular-link:hover {
		color: var(--accent-hover);
	}

	@media (max-width: 640px) {
		.genre-page {
			padding: 0 1rem 5rem;
		}
		.genre-header {
			padding: 1.5rem 0 1.25rem;
		}
		.genre-letter-rule,
		.genre-letter-count {
			transform: translateY(-4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.genre-row,
		.genre-arrow {
			transition: none;
		}
	}
</style>
