<script lang="ts">
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import { isMovieContent } from '$lib/content-label';
	import FlameIcon from './icons/FlameIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';
	import PlayIcon from './icons/PlayIcon.svelte';
	import StarIcon from './icons/StarIcon.svelte';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		genre?: string[];
		thumbnail: string;
		bigCover?: string;
		status?: 'Ongoing' | 'Completed';
		type?: string | null;
		rating?: number | null;
		totalEpisodes?: number | null;
		episodeCount?: number | null;
	};

	let { items = [] }: { items?: Anime[] } = $props();

	const featured = $derived(items[0]);
	const sideItems = $derived(items.slice(1, 5));
	const railItems = $derived(items.slice(5, 10));

	function cover(item: Anime) {
		return item.bigCover && item.bigCover.length > 0 ? item.bigCover : item.thumbnail;
	}
</script>

{#if featured}
	<section class="mb-10" aria-label="Sedang trending">
		<header class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2.5">
				<span class="ts-icon-badge">
					<FlameIcon size={14} />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black flex items-center gap-2" style="color: var(--text-primary);">
						Sedang Trending
						<span class="ts-live-pill">
							<span class="ts-live-dot"></span>
							Live
						</span>
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Pilihan terhangat minggu ini
					</p>
				</div>
			</div>
			<a
				href="/popular"
				class="ts-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Lihat semua
				<ChevronRightIcon size={14} />
			</a>
		</header>

		<!-- Bento layout: 1 big + 4 small -->
		<div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3 mb-3">
			<!-- Featured big card -->
			<a href="/anime/{featured.slug}" class="ts-feature group">
				<div class="ts-feature-image">
					<OptimizedImage
						src={cover(featured)}
						alt={featured.title}
						className="h-full w-full"
						imageClass="h-full w-full object-cover transition duration-700 md:group-hover:scale-[1.04]"
						sizes="(max-width: 1024px) 100vw, 720px"
						loading="lazy"
						fetchpriority="low"
					/>
				</div>
				<div class="ts-feature-shade"></div>
				<!-- Top-left rank -->
				<div class="absolute top-4 left-4 z-10">
					<span class="ts-rank-badge">
						<FlameIcon size={12} class="mr-1" />
						#1 Trending
					</span>
				</div>
				<!-- Top-right rating -->
				{#if featured.rating}
					<div class="absolute top-4 right-4 z-10">
						<span class="ts-rating-pill">
							<StarIcon size={12} filled />
							{featured.rating?.toFixed(1)}
						</span>
					</div>
				{/if}
				<!-- Bottom content -->
				<div class="absolute inset-x-4 bottom-4 z-10">
					<div class="flex items-end justify-between gap-3">
						<div class="min-w-0 flex-1">
							<h3
								class="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5 drop-shadow-lg line-clamp-2"
								style="font-family: 'Bebas Neue', 'Lexend Deca', sans-serif; letter-spacing: 0.005em;"
							>
								{featured.title}
							</h3>
							<div class="flex items-center gap-2 flex-wrap">
								{#if featured.type}
									<span class="ts-feature-meta">{featured.type}</span>
								{/if}
								{#if featured.status === 'Ongoing'}
									<span class="ts-feature-meta ts-feature-meta-active">
										<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
										Tayang
									</span>
								{/if}
								{#if featured.genre && featured.genre.length > 0}
									<span class="ts-feature-meta">{featured.genre[0]}</span>
								{/if}
							</div>
						</div>
						<button
							type="button"
							class="ts-feature-play"
							aria-label="Tonton {featured.title}"
							tabindex="-1"
						>
							<PlayIcon size={18} />
						</button>
					</div>
				</div>
			</a>

			<!-- Side: 2x2 mini cards -->
			<div class="grid grid-cols-2 gap-3">
				{#each sideItems as item, i (item.slug)}
					{@const rank = i + 2}
					{@const tier = rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'violet'}
					<a href="/anime/{item.slug}" class="ts-side group" data-tier={tier}>
						<div class="ts-side-image">
							<OptimizedImage
								src={cover(item)}
								alt={item.title}
								className="h-full w-full"
								imageClass="h-full w-full object-cover transition duration-700 md:group-hover:scale-[1.08]"
								sizes="(max-width: 768px) 50vw, 240px"
								loading="lazy"
								fetchpriority="low"
							/>
						</div>
						<!-- Layered shade for depth -->
						<div class="ts-side-shade"></div>
						<div class="ts-side-vignette"></div>
						<!-- Top accent line per tier -->
						<div class="ts-side-accent" aria-hidden="true"></div>

						<!-- Rank medal -->
						<span class="ts-side-rank">
							<span class="ts-side-rank-hash">#</span>{rank}
						</span>

						<!-- Rating top-right (if available) -->
						{#if item.rating}
							<span class="ts-side-rating">
								<StarIcon size={10} filled />
								{item.rating.toFixed(1)}
							</span>
						{/if}

						<!-- Hover play (center) -->
						<div class="ts-side-hover">
							<span class="ts-side-play">
								<PlayIcon size={16} />
							</span>
						</div>

						<!-- Title + meta -->
						<div class="ts-side-info">
							<p class="ts-side-title">{item.title}</p>
							<div class="ts-side-meta">
								{#if isMovieContent(item)}
									<span class="ts-side-chip ts-side-chip-movie">
										<span class="ts-side-chip-dot"></span>
										Movie
									</span>
								{:else}
									{#if item.status === 'Ongoing'}
										<span class="ts-side-chip ts-side-chip-live">
											<span class="ts-side-chip-dot ts-side-chip-dot-live"></span>
											Tayang
										</span>
									{/if}
									{#if item.episodeCount}
										<span class="ts-side-chip-text">{item.episodeCount} ep</span>
									{/if}
								{/if}
								{#if item.genre && item.genre.length > 0 && !isMovieContent(item)}
									<span class="ts-side-chip-text ts-side-chip-text-muted">·</span>
									<span class="ts-side-chip-text">{item.genre[0]}</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>

		<!-- Smaller rail for items 6-10 -->
		{#if railItems.length > 0}
			<div class="flex max-w-[calc(100%+2rem)] gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
				{#each railItems as item, i (item.slug)}
					<a href="/anime/{item.slug}" class="ts-rail group">
						<div class="ts-rail-image">
							<OptimizedImage
								src={item.thumbnail}
								alt={item.title}
								className="h-full w-full"
								imageClass="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.06]"
								sizes="120px"
								loading="lazy"
								fetchpriority="low"
							/>
							<div class="ts-rail-shade"></div>
							<span class="ts-rail-rank">{i + 6}</span>
						</div>
						<p class="ts-rail-title">{item.title}</p>
					</a>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.ts-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #f97316, #ef4444);
		color: white;
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
	}

	.ts-live-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		border-radius: 9999px;
		background: oklch(from #ef4444 l c h / 0.12);
		color: #f87171;
		border: 1px solid oklch(from #ef4444 l c h / 0.3);
	}

	.ts-live-dot {
		height: 5px;
		width: 5px;
		border-radius: 9999px;
		background: #f87171;
		animation: ts-pulse 1.6s ease-in-out infinite;
	}

	@keyframes ts-pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(1.3);
		}
	}

	.ts-link {
		color: var(--accent);
	}

	.ts-link:hover {
		color: var(--accent-hover);
	}

	/* Featured */
	.ts-feature {
		position: relative;
		display: block;
		aspect-ratio: 16 / 10;
		border-radius: 24px;
		overflow: hidden;
		background: var(--surface-offset);
		box-shadow: var(--shadow-lg);
		transition: transform 220ms ease;
	}

	@media (min-width: 1024px) {
		.ts-feature {
			aspect-ratio: 16 / 11;
		}
	}

	.ts-feature:hover {
		transform: translateY(-3px);
	}

	.ts-feature-image {
		position: absolute;
		inset: 0;
	}

	.ts-feature-shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, oklch(0 0 0 / 0.92) 0%, oklch(0 0 0 / 0.35) 45%, transparent 75%),
			linear-gradient(to right, oklch(0 0 0 / 0.4) 0%, transparent 35%);
		pointer-events: none;
	}

	.ts-rank-badge {
		display: inline-flex;
		align-items: center;
		padding: 5px 10px;
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: 9999px;
		background: linear-gradient(135deg, #ef4444, #f97316);
		color: white;
		box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
	}

	.ts-rating-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		font-size: 11px;
		font-weight: 900;
		border-radius: 9999px;
		background: oklch(0 0 0 / 0.55);
		color: #fbbf24;
		backdrop-filter: blur(8px);
		border: 1px solid rgba(251, 191, 36, 0.35);
	}

	.ts-feature-meta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 9px;
		font-size: 10.5px;
		font-weight: 700;
		border-radius: 9999px;
		background: oklch(from #ffffff l c h / 0.13);
		color: #f4f4f5;
		border: 1px solid rgba(255, 255, 255, 0.18);
		backdrop-filter: blur(6px);
	}

	.ts-feature-meta-active {
		background: oklch(from #10b981 l c h / 0.2);
		color: #6ee7b7;
		border-color: oklch(from #10b981 l c h / 0.4);
	}

	.ts-feature-play {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		width: 48px;
		border-radius: 9999px;
		background: white;
		color: var(--accent);
		border: 0;
		box-shadow: 0 12px 32px oklch(0 0 0 / 0.5);
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ts-feature:hover .ts-feature-play {
		transform: scale(1.08);
	}

	/* ── Side cards #2..#5 ─────────────────────────── */
	.ts-side {
		position: relative;
		display: block;
		aspect-ratio: 4 / 5;
		border-radius: 18px;
		overflow: hidden;
		background: var(--surface-offset);
		box-shadow:
			0 8px 24px oklch(0 0 0 / 0.18),
			inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		transition:
			transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 320ms ease;
		isolation: isolate;
	}

	.ts-side:hover {
		transform: translateY(-4px) scale(1.012);
		box-shadow:
			0 18px 38px oklch(0 0 0 / 0.32),
			0 0 0 1px var(--tier-glow-ring, rgba(255, 255, 255, 0.18)),
			inset 0 0 0 1px rgba(255, 255, 255, 0.12);
	}

	.ts-side-image {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	/* Two-layer shade for cinematic depth */
	.ts-side-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			oklch(0 0 0 / 0.95) 0%,
			oklch(0 0 0 / 0.55) 28%,
			oklch(0 0 0 / 0.1) 60%,
			transparent 80%
		);
		pointer-events: none;
		z-index: 1;
	}

	.ts-side-vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(120% 100% at 50% 100%, transparent 40%, oklch(0 0 0 / 0.3) 100%),
			linear-gradient(to right, oklch(0 0 0 / 0.2) 0%, transparent 35%);
		pointer-events: none;
		z-index: 1;
	}

	/* Top accent line (tier-colored, glows on hover) */
	.ts-side-accent {
		position: absolute;
		top: 0;
		left: 8%;
		right: 8%;
		height: 2px;
		border-radius: 9999px;
		background: var(--tier-accent, linear-gradient(90deg, transparent, #ddd6fe, transparent));
		opacity: 0.55;
		transition: opacity 320ms ease, height 320ms ease, top 320ms ease;
		z-index: 6;
		filter: blur(0.4px);
	}

	.ts-side:hover .ts-side-accent {
		opacity: 1;
		height: 3px;
	}

	/* Rank medal — tier-themed gradient */
	.ts-side-rank {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 1px;
		padding: 5px 10px 5px 8px;
		border-radius: 9999px;
		font-family: 'Bebas Neue', 'Lexend Deca', sans-serif;
		font-size: 14px;
		font-weight: 400;
		line-height: 1;
		letter-spacing: 0.04em;
		color: var(--tier-text, white);
		background: var(--tier-bg, oklch(0 0 0 / 0.6));
		box-shadow: var(--tier-shadow, 0 4px 14px oklch(0 0 0 / 0.4)), inset 0 1px 0 rgba(255, 255, 255, 0.35);
		border: 1px solid var(--tier-border, rgba(255, 255, 255, 0.18));
		backdrop-filter: blur(6px);
	}

	.ts-side-rank-hash {
		opacity: 0.6;
		font-size: 10px;
		margin-right: 1px;
		transform: translateY(-1px);
	}

	/* Rating chip top-right */
	.ts-side-rating {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 4px 8px;
		border-radius: 9999px;
		font-size: 10.5px;
		font-weight: 900;
		color: #78350f;
		background: linear-gradient(135deg, #fde68a, #f59e0b);
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	/* Hover play overlay */
	.ts-side-hover {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.18);
		transition: opacity 240ms ease;
		z-index: 5;
		pointer-events: none;
	}

	.ts-side:hover .ts-side-hover {
		opacity: 1;
	}

	.ts-side-play {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		width: 44px;
		border-radius: 9999px;
		color: white;
		background: oklch(from var(--accent) l c h / 0.95);
		box-shadow: 0 12px 28px var(--accent-glow), inset 0 0 0 1.5px rgba(255, 255, 255, 0.55);
		transform: scale(0.8);
		transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.ts-side:hover .ts-side-play {
		transform: scale(1);
	}

	/* Bottom info */
	.ts-side-info {
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 12px;
		z-index: 6;
	}

	.ts-side-title {
		font-size: 13px;
		font-weight: 900;
		color: white;
		line-height: 1.22;
		letter-spacing: -0.005em;
		text-shadow: 0 2px 8px oklch(0 0 0 / 0.5);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.ts-side-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}

	.ts-side-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 7px;
		border-radius: 9999px;
		font-size: 9.5px;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		backdrop-filter: blur(6px);
	}

	.ts-side-chip-live {
		color: #6ee7b7;
		background: oklch(from #10b981 l c h / 0.18);
		border: 1px solid oklch(from #10b981 l c h / 0.4);
	}

	.ts-side-chip-movie {
		color: #ddd6fe;
		background: oklch(from #7c3aed l c h / 0.22);
		border: 1px solid oklch(from #a78bfa l c h / 0.45);
	}

	.ts-side-chip-dot {
		display: inline-block;
		height: 4px;
		width: 4px;
		border-radius: 9999px;
		background: currentColor;
	}

	.ts-side-chip-dot-live {
		animation: ts-side-pulse 1.6s ease-in-out infinite;
	}

	@keyframes ts-side-pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.4); }
	}

	.ts-side-chip-text {
		font-size: 10px;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.78);
		letter-spacing: 0.02em;
	}

	.ts-side-chip-text-muted {
		opacity: 0.5;
		font-weight: 700;
	}

	/* ── Tier theming ────────────────────────────── */
	.ts-side[data-tier='silver'] {
		--tier-bg: linear-gradient(135deg, #f4f4f5 0%, #d4d4d8 50%, #a1a1aa 100%);
		--tier-text: #18181b;
		--tier-border: rgba(255, 255, 255, 0.55);
		--tier-shadow: 0 4px 14px rgba(161, 161, 170, 0.5);
		--tier-accent: linear-gradient(90deg, transparent, #e4e4e7 30%, #f4f4f5 50%, #e4e4e7 70%, transparent);
		--tier-glow-ring: rgba(228, 228, 231, 0.45);
	}

	.ts-side[data-tier='bronze'] {
		--tier-bg: linear-gradient(135deg, #fed7aa 0%, #c2410c 60%, #7c2d12 100%);
		--tier-text: #fff7ed;
		--tier-border: rgba(254, 215, 170, 0.5);
		--tier-shadow: 0 4px 14px rgba(194, 65, 12, 0.55);
		--tier-accent: linear-gradient(90deg, transparent, #fb923c 30%, #fed7aa 50%, #fb923c 70%, transparent);
		--tier-glow-ring: rgba(251, 146, 60, 0.45);
	}

	.ts-side[data-tier='violet'] {
		--tier-bg: linear-gradient(135deg, #ede9fe 0%, #8b5cf6 60%, #4c1d95 100%);
		--tier-text: #faf5ff;
		--tier-border: rgba(196, 181, 253, 0.45);
		--tier-shadow: 0 4px 14px rgba(124, 58, 237, 0.5);
		--tier-accent: linear-gradient(90deg, transparent, #a78bfa 30%, #ddd6fe 50%, #a78bfa 70%, transparent);
		--tier-glow-ring: rgba(167, 139, 250, 0.5);
	}

	/* Rail */
	.ts-rail {
		flex-shrink: 0;
		width: 120px;
		display: flex;
		flex-direction: column;
	}

	.ts-rail-image {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: 12px;
		overflow: hidden;
		background: var(--surface-offset);
		margin-bottom: 6px;
		box-shadow: var(--shadow-sm);
	}

	.ts-rail-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.6) 0%, transparent 50%);
		pointer-events: none;
	}

	.ts-rail-rank {
		position: absolute;
		top: 6px;
		left: 6px;
		z-index: 10;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 22px;
		min-width: 22px;
		padding: 0 5px;
		border-radius: 6px;
		background: var(--accent);
		color: white;
		font-size: 10.5px;
		font-weight: 900;
		box-shadow: 0 2px 8px var(--accent-glow);
	}

	.ts-rail-title {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	@media (hover: none) {
		.ts-feature:hover,
		.ts-side:hover {
			transform: none;
		}
	}
</style>
