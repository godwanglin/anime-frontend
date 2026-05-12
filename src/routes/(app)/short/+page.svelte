<script lang="ts">
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import config from '$lib/config';
	import { pageTitle } from '$lib/stores/page.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	type ShortAnime = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		genres?: string[] | null;
		genre?: string[] | null;
		status?: string | null;
		type?: string | null;
	};

	type Episode = {
		id: number;
		slug: string;
		title: string;
		number: number;
		thumbnail?: string | null;
		animeSlug: string;
		animeTitle: string;
		animeThumbnail?: string | null;
		animeType?: string | null;
		href?: string | null;
	};

	const { data }: { data: PageData } = $props();
	const popular = $derived((data.popular ?? []) as ShortAnime[]);
	const initialAnimes = $derived((data.animes ?? []) as ShortAnime[]);
	const episodes = $derived((data.episodes ?? []) as Episode[]);

	// Infinite scroll state
	let extraAnimes = $state<ShortAnime[]>([]);
	let currentPage = $state(1);
	let hasMore = $state(true);
	let isLoadingMore = $state(false);
	let sentinelEl = $state<HTMLDivElement | null>(null);

	const allAnimes = $derived([...initialAnimes, ...extraAnimes]);
	const featured = $derived(popular[0] ?? initialAnimes[0] ?? null);

	function genreLabel(anime: ShortAnime): string {
		const g = anime.genres ?? anime.genre ?? [];
		return g.find((x: string) => x && x !== 'Semua') ?? '';
	}

	function episodeHref(ep: Episode): string {
		if (!ep.href) return `/short/${ep.animeSlug}/${ep.slug}`;
		return ep.href.replace(/^\/anime\//, '/short/');
	}

	async function loadMore() {
		if (isLoadingMore || !hasMore) return;
		isLoadingMore = true;
		try {
			const nextPage = currentPage + 1;
			const res = await fetch(
				`${config.API_BASE_URL}/api/anime?type=Short&limit=20&sortBy=updatedAt&order=desc&page=${nextPage}`
			);
			const json = await res.json().catch(() => ({}));
			const items = (json.data ?? []) as ShortAnime[];
			if (items.length === 0) {
				hasMore = false;
			} else {
				extraAnimes = [...extraAnimes, ...items];
				currentPage = nextPage;
				if (items.length < 20) hasMore = false;
			}
		} catch {
			// silent — user can scroll again to retry
		} finally {
			isLoadingMore = false;
		}
	}

	$effect(() => {
		if (!sentinelEl) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: '300px' }
		);
		observer.observe(sentinelEl);
		return () => observer.disconnect();
	});

	onMount(() => {
		pageTitle.value = 'Short';
		if (initialAnimes.length < 20) hasMore = false;
		return () => {
			pageTitle.value = '';
		};
	});
</script>

<SEO
	title="Short — Drama Pendek Populer"
	description="Tonton drama pendek populer, update setiap hari."
/>

<!-- Hero -->
<div class="short-hero">
	<div class="short-hero-glow"></div>
	<div class="short-hero-content">
		<div class="short-hero-badge">
			<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
				/>
			</svg>
			Short
		</div>
		<h1 class="short-hero-title">
			Drama Pendek<br /><span class="short-hero-accent">Populer</span>
		</h1>
		<p class="short-hero-sub">
			{allAnimes.length > 0 ? `${allAnimes.length}+ judul tersedia` : 'Koleksi short anime pilihan'}
		</p>
	</div>
</div>

<!-- Featured -->
{#if featured}
	<a
		href="/anime/{featured.slug}"
		class="short-featured group"
		aria-label="Tonton {featured.title}"
	>
		<div class="short-featured-thumb">
			<OptimizedImage
				src={featured.thumbnail}
				alt={featured.title}
				className="h-full w-full"
				imageClass="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
				sizes="(max-width: 768px) 100vw, 800px"
				loading="eager"
				fetchpriority="high"
			/>
			<div class="short-featured-overlay"></div>
			<div class="short-featured-play">
				<div class="short-featured-play-circle">
					<svg width="30" height="30" viewBox="0 0 24 24" fill="white" aria-hidden="true">
						<path
							d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
						/>
					</svg>
				</div>
			</div>
			{#if genreLabel(featured)}
				<span class="short-featured-genre">{genreLabel(featured)}</span>
			{/if}
			<div class="short-featured-meta">
				<span class="short-featured-label">Featured Short</span>
				<h2 class="short-featured-title">{featured.title}</h2>
			</div>
		</div>
	</a>
{/if}

<!-- Popular shorts rail -->
{#if popular.length > 0}
	<section class="short-section mb-7" aria-label="Short populer">
		<header class="short-section-header">
			<div
				class="short-section-icon"
				style="background: linear-gradient(135deg, #f97316, #ef4444); box-shadow: 0 4px 12px oklch(0.65 0.22 35 / 0.45);"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
					/>
				</svg>
			</div>
			<div>
				<h2 class="short-section-title">Short Populer</h2>
				<p class="short-section-sub">Paling banyak ditonton</p>
			</div>
		</header>
		<div class="short-cards-scroll">
			{#each popular as anime (anime.id)}
				{@const genre = genreLabel(anime)}
				<a href="/anime/{anime.slug}" class="short-card group" aria-label={anime.title}>
					<div class="short-card-thumb">
						<OptimizedImage
							src={anime.thumbnail}
							alt={anime.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]"
							sizes="128px"
							loading="lazy"
							fetchpriority="low"
						/>
						<div class="short-card-overlay"></div>
						<div class="short-card-play">
							<div class="short-card-play-circle">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
									<path
										d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
									/>
								</svg>
							</div>
						</div>
						{#if genre}
							<span class="short-card-genre">{genre}</span>
						{/if}
					</div>
					<p class="short-card-title">{anime.title}</p>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- New Episodes -->
{#if episodes.length > 0}
	<section class="short-section mb-7" aria-label="Episode terbaru">
		<header class="short-section-header">
			<div
				class="short-section-icon"
				style="background: linear-gradient(135deg, #8b5cf6, #6366f1); box-shadow: 0 4px 12px oklch(0.55 0.25 280 / 0.4);"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"
					/>
				</svg>
			</div>
			<div>
				<h2 class="short-section-title">Episode Terbaru</h2>
				<p class="short-section-sub">Update terkini</p>
			</div>
			<a href="/episode-baru" class="short-section-link">
				Semua
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
				</svg>
			</a>
		</header>
		<div class="short-ep-scroll">
			{#each episodes as ep (ep.id)}
				<a
					href={episodeHref(ep)}
					class="short-ep-card group"
					aria-label="{ep.animeTitle} Ep {ep.number}"
				>
					<div class="short-ep-thumb">
						<OptimizedImage
							src={ep.animeThumbnail ?? ep.thumbnail ?? ''}
							alt={ep.animeTitle}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]"
							sizes="158px"
							loading="lazy"
							fetchpriority="low"
						/>
						<div class="short-ep-overlay"></div>
						<span class="short-ep-badge">Ep {ep.number}</span>
						<div class="short-ep-play">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
								<path
									d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
								/>
							</svg>
						</div>
					</div>
					<p class="short-ep-title">{ep.animeTitle}</p>
					<p class="short-ep-meta">Episode {ep.number}</p>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- All Shorts — infinite scroll grid -->
{#if allAnimes.length > 0}
	<section class="short-section mb-8" aria-label="Semua short anime">
		<header class="short-section-header">
			<div class="short-section-icon">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"
					/>
				</svg>
			</div>
			<div>
				<h2 class="short-section-title">Semua Short</h2>
				<p class="short-section-sub">{allAnimes.length}{hasMore ? '+' : ''} judul</p>
			</div>
			<a href="/browse?type=Short" class="short-section-link">
				Browse
				<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
				</svg>
			</a>
		</header>

		<div class="short-grid">
			{#each allAnimes as anime (anime.id)}
				{@const genre = genreLabel(anime)}
				<a href="/anime/{anime.slug}" class="short-grid-card group" aria-label={anime.title}>
					<div class="short-grid-thumb">
						<OptimizedImage
							src={anime.thumbnail}
							alt={anime.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]"
							sizes="(max-width: 480px) 33vw, 150px"
							loading="lazy"
							fetchpriority="low"
						/>
						<div class="short-grid-overlay"></div>
						<div class="short-grid-play">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
								<path
									d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"
								/>
							</svg>
						</div>
						{#if genre}
							<span class="short-grid-genre">{genre}</span>
						{/if}
					</div>
					<p class="short-grid-title">{anime.title}</p>
				</a>
			{/each}
		</div>

		<!-- Infinite scroll sentinel -->
		{#if hasMore}
			<div bind:this={sentinelEl} class="short-sentinel" aria-hidden="true">
				{#if isLoadingMore}
					<div class="short-loader">
						<div class="short-loader-dot"></div>
						<div class="short-loader-dot"></div>
						<div class="short-loader-dot"></div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="short-end-label">— Semua short sudah dimuat —</p>
		{/if}
	</section>
{:else if popular.length === 0 && episodes.length === 0}
	<div class="short-empty">
		<div class="short-empty-icon">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"
				/>
			</svg>
		</div>
		<p class="short-empty-title">Belum ada short tersedia</p>
		<p class="short-empty-sub">Konten sedang dipersiapkan, cek lagi nanti.</p>
	</div>
{/if}

<NavigationBottom />

<style>
	/* ── Hero ── */
	.short-hero {
		position: relative;
		margin: -1.25rem -1rem 1.75rem;
		padding: 2rem 1.25rem 1.75rem;
		overflow: hidden;
		border-radius: 0 0 28px 28px;
		background: linear-gradient(140deg, oklch(0.16 0.05 285), oklch(0.11 0.02 250));
		border-bottom: 1px solid oklch(from var(--accent) l c h / 0.18);
	}

	.short-hero-glow {
		position: absolute;
		top: -80px;
		right: -60px;
		width: 280px;
		height: 280px;
		border-radius: 9999px;
		background: radial-gradient(circle, oklch(from var(--accent) l c h / 0.35) 0%, transparent 70%);
		pointer-events: none;
	}

	.short-hero-glow::after {
		content: '';
		position: absolute;
		bottom: -60px;
		left: -100px;
		width: 200px;
		height: 200px;
		border-radius: 9999px;
		background: radial-gradient(circle, oklch(0.65 0.22 320 / 0.18) 0%, transparent 70%);
	}

	.short-hero-content {
		position: relative;
		z-index: 1;
	}

	.short-hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.18);
		border: 1px solid oklch(from var(--accent) l c h / 0.32);
		color: var(--accent);
		font-size: 10.5px;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 0.85rem;
	}

	.short-hero-title {
		font-size: clamp(1.65rem, 6vw, 2.4rem);
		font-weight: 900;
		line-height: 1.15;
		color: white;
		margin-bottom: 0.55rem;
	}

	.short-hero-accent {
		background: linear-gradient(
			90deg,
			var(--accent),
			oklch(from var(--accent) calc(l + 0.14) c calc(h - 35))
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.short-hero-sub {
		font-size: 12.5px;
		color: oklch(1 0 0 / 0.52);
		font-weight: 600;
	}

	/* ── Featured card ── */
	.short-featured {
		display: block;
		border-radius: 22px;
		overflow: hidden;
		margin-bottom: 2rem;
		text-decoration: none;
		box-shadow:
			0 24px 64px oklch(0 0 0 / 0.38),
			0 0 0 1px oklch(from var(--accent) l c h / 0.14);
		transition:
			transform 280ms cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 280ms ease;
	}

	.short-featured:hover {
		transform: translateY(-3px);
		box-shadow:
			0 32px 80px oklch(0 0 0 / 0.42),
			0 0 0 1px oklch(from var(--accent) l c h / 0.22),
			0 0 40px oklch(from var(--accent) l c h / 0.1);
	}

	.short-featured-thumb {
		position: relative;
		aspect-ratio: 16 / 7;
		overflow: hidden;
		background: var(--surface-offset);
	}

	.short-featured-overlay {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, oklch(0 0 0 / 0.92) 0%, oklch(0 0 0 / 0.28) 45%, transparent 70%),
			linear-gradient(to right, oklch(0 0 0 / 0.25), transparent 50%);
		pointer-events: none;
	}

	.short-featured-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 280ms ease;
	}

	.short-featured:hover .short-featured-play {
		opacity: 1;
	}

	.short-featured-play-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76px;
		height: 76px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.92);
		box-shadow:
			0 16px 48px var(--accent-glow),
			inset 0 1px 0 rgba(255, 255, 255, 0.45);
		transform: scale(0.75);
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.short-featured:hover .short-featured-play-circle {
		transform: scale(1);
	}

	.short-featured-genre {
		position: absolute;
		top: 14px;
		left: 14px;
		padding: 4px 11px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.88);
		backdrop-filter: blur(8px);
		color: white;
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.short-featured-meta {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 16px 18px 20px;
	}

	.short-featured-label {
		display: block;
		font-size: 9.5px;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 4px;
		text-shadow: 0 1px 8px var(--accent-glow);
	}

	.short-featured-title {
		font-size: 17px;
		font-weight: 900;
		color: white;
		line-height: 1.25;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		text-shadow: 0 2px 12px oklch(0 0 0 / 0.6);
	}

	/* ── Section layout ── */
	.short-section {
		content-visibility: auto;
		contain-intrinsic-size: 0 280px;
	}

	.short-section-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 13px;
	}

	.short-section-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		flex-shrink: 0;
		background: linear-gradient(
			135deg,
			var(--accent),
			oklch(from var(--accent) calc(l + 0.07) c h)
		);
		color: white;
		box-shadow: 0 4px 14px var(--accent-glow);
	}

	.short-section-title {
		font-size: 15px;
		font-weight: 900;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.short-section-sub {
		font-size: 10.5px;
		color: var(--text-faint);
		margin-top: 1px;
	}

	.short-section-link {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-left: auto;
		font-size: 11.5px;
		font-weight: 700;
		color: var(--accent);
		text-decoration: none;
		transition: color 150ms;
		white-space: nowrap;
	}

	.short-section-link:hover {
		color: var(--accent-hover);
	}

	/* ── Portrait cards (horizontal rail) ── */
	.short-cards-scroll {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding-bottom: 6px;
		margin: 0 -1rem;
		padding-left: 1rem;
		padding-right: 1rem;
		scrollbar-width: none;
	}

	.short-cards-scroll::-webkit-scrollbar {
		display: none;
	}

	.short-card {
		flex-shrink: 0;
		width: 128px;
		display: block;
		text-decoration: none;
	}

	.short-card-thumb {
		position: relative;
		aspect-ratio: 3 / 4;
		border-radius: 16px;
		overflow: hidden;
		background: var(--surface-offset);
		margin-bottom: 7px;
		box-shadow:
			0 8px 24px oklch(0 0 0 / 0.3),
			0 0 0 1px oklch(from var(--accent) l c h / 0.07);
		transition: box-shadow 250ms ease;
	}

	.short-card:hover .short-card-thumb {
		box-shadow:
			0 14px 36px oklch(from var(--accent) l c h / 0.28),
			0 0 0 1px oklch(from var(--accent) l c h / 0.2);
	}

	.short-card-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.72) 0%, transparent 55%);
		pointer-events: none;
	}

	.short-card-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.28);
		border-radius: inherit;
		transition: opacity 220ms ease;
	}

	.short-card:hover .short-card-play {
		opacity: 1;
	}

	.short-card-play-circle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.9);
		box-shadow: 0 8px 24px var(--accent-glow);
		transform: scale(0.75);
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.short-card:hover .short-card-play-circle {
		transform: scale(1);
	}

	.short-card-genre {
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		font-size: 9px;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.82);
		letter-spacing: 0.03em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.short-card-title {
		font-size: 11px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	/* ── Episode cards ── */
	.short-ep-scroll {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		padding-bottom: 6px;
		margin: 0 -1rem;
		padding-left: 1rem;
		padding-right: 1rem;
		scrollbar-width: none;
	}

	.short-ep-scroll::-webkit-scrollbar {
		display: none;
	}

	.short-ep-card {
		flex-shrink: 0;
		width: 158px;
		display: block;
		text-decoration: none;
	}

	.short-ep-thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: 14px;
		overflow: hidden;
		background: var(--surface-offset);
		margin-bottom: 7px;
		box-shadow: 0 6px 20px oklch(0 0 0 / 0.28);
	}

	.short-ep-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.65) 0%, transparent 55%);
		pointer-events: none;
	}

	.short-ep-badge {
		position: absolute;
		top: 7px;
		right: 7px;
		padding: 2px 7px;
		border-radius: 6px;
		background: oklch(0 0 0 / 0.72);
		backdrop-filter: blur(4px);
		color: white;
		font-size: 9.5px;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.short-ep-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.25);
		transition: opacity 220ms ease;
	}

	.short-ep-card:hover .short-ep-play {
		opacity: 1;
	}

	.short-ep-title {
		font-size: 11.5px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.short-ep-meta {
		font-size: 10.5px;
		color: var(--text-faint);
		font-weight: 600;
		margin-top: 2px;
	}

	/* ── Infinite scroll grid ── */
	.short-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.short-grid-card {
		display: block;
		text-decoration: none;
	}

	.short-grid-thumb {
		position: relative;
		aspect-ratio: 3 / 4;
		border-radius: 12px;
		overflow: hidden;
		background: var(--surface-offset);
		margin-bottom: 5px;
		box-shadow: 0 4px 16px oklch(0 0 0 / 0.28);
		transition: box-shadow 220ms ease;
	}

	.short-grid-card:hover .short-grid-thumb {
		box-shadow:
			0 8px 24px oklch(from var(--accent) l c h / 0.24),
			0 0 0 1px oklch(from var(--accent) l c h / 0.15);
	}

	.short-grid-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.68) 0%, transparent 50%);
		pointer-events: none;
	}

	.short-grid-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.28);
		transition: opacity 200ms ease;
	}

	.short-grid-card:hover .short-grid-play {
		opacity: 1;
	}

	.short-grid-genre {
		position: absolute;
		bottom: 6px;
		left: 6px;
		right: 6px;
		font-size: 8.5px;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.short-grid-title {
		font-size: 10.5px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	/* ── Infinite scroll sentinel + loader ── */
	.short-sentinel {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0 0.5rem;
		min-height: 48px;
	}

	.short-loader {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.short-loader-dot {
		width: 7px;
		height: 7px;
		border-radius: 9999px;
		background: var(--accent);
		opacity: 0.6;
		animation: dotBounce 1.2s ease-in-out infinite;
	}

	.short-loader-dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.short-loader-dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes dotBounce {
		0%,
		80%,
		100% {
			transform: scale(0.7);
			opacity: 0.4;
		}
		40% {
			transform: scale(1.1);
			opacity: 1;
		}
	}

	.short-end-label {
		text-align: center;
		font-size: 11px;
		color: var(--text-faint);
		font-weight: 600;
		padding: 1.5rem 0 0.5rem;
	}

	/* ── Empty state ── */
	.short-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 3rem 1rem;
		gap: 0.5rem;
	}

	.short-empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 18px;
		background: var(--accent-surface);
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.short-empty-title {
		font-size: 14px;
		font-weight: 900;
		color: var(--text-primary);
	}

	.short-empty-sub {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
