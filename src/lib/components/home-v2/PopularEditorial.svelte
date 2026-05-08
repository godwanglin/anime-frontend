<script lang="ts">
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import { isMovieContent } from '$lib/content-label';
	import StarIcon from './icons/StarIcon.svelte';
	import HeartIcon from './icons/HeartIcon.svelte';
	import PlayIcon from './icons/PlayIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';
	import TrendingIcon from './icons/TrendingIcon.svelte';

	type Anime = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		bigCover?: string;
		type?: string;
		studio?: string;
		rating?: number | null;
		followed?: number;
		episodeCount?: number;
		status?: 'Ongoing' | 'Completed';
	};

	let { items = [] }: { items?: Anime[] } = $props();

	function cover(item: Anime) {
		return item.bigCover && item.bigCover.length > 0 ? item.bigCover : item.thumbnail;
	}

	function compactNum(n?: number) {
		if (!n) return '—';
		return Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
	}
</script>

{#if items.length > 0}
	<section class="pe-section mb-10" aria-label="Paling populer">
		<header class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2.5">
				<span class="pe-icon-badge">
					<StarIcon size={14} filled />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black" style="color: var(--text-primary);">
						Paling Populer
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Banyak pengikut, tinggi rating
					</p>
				</div>
			</div>
			<a
				href="/popular"
				class="pe-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Lihat semua
				<ChevronRightIcon size={14} />
			</a>
		</header>

		<div class="flex max-w-[calc(100%+2rem)] gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
			{#each items as item (item.id)}
				<a href="/anime/{item.slug}" class="pe-card group">
					<div class="pe-thumb">
						<OptimizedImage
							src={cover(item)}
							alt={item.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-700 md:group-hover:scale-[1.05]"
							sizes="(max-width: 768px) 308px, 340px"
							loading="lazy"
							fetchpriority="low"
						/>
						<div class="pe-thumb-shade"></div>

						<!-- Type pill -->
						{#if item.type}
							<span class="pe-type-pill">{item.type}</span>
						{/if}

						<!-- Rating -->
						{#if item.rating}
							<span class="pe-rating">
								<StarIcon size={11} filled />
								{item.rating.toFixed(1)}
							</span>
						{/if}

						<!-- Bottom info -->
						<div class="pe-info">
							<p class="pe-title">{item.title}</p>
							<div class="pe-meta-row">
								{#if item.studio}
									<span class="pe-meta">
										<span class="pe-meta-dot"></span>
										<span class="pe-meta-text">{item.studio}</span>
									</span>
								{/if}
								{#if item.followed}
									<span class="pe-meta">
										<HeartIcon size={11} class="pe-meta-icon" />
										{compactNum(item.followed)}
									</span>
								{/if}
								{#if item.episodeCount}
									<span class="pe-meta">
										<PlayIcon size={11} class="pe-meta-icon" />
										{isMovieContent(item) ? 'Movie' : `${item.episodeCount} ep`}
									</span>
								{/if}
							</div>
						</div>

						<!-- Hover play -->
						<div class="pe-hover-play">
							<div class="pe-play-circle">
								<PlayIcon size={20} />
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.pe-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #f59e0b, #ef4444);
		color: white;
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
	}

	.pe-link {
		color: var(--accent);
	}

	.pe-link:hover {
		color: var(--accent-hover);
	}

	.pe-card {
		flex-shrink: 0;
		width: 308px;
		display: block;
	}

	@media (min-width: 768px) {
		.pe-card {
			width: 340px;
		}
	}

	.pe-thumb {
		position: relative;
		aspect-ratio: 16 / 10;
		border-radius: 22px;
		overflow: hidden;
		background: var(--surface-offset);
		box-shadow: var(--shadow-lg);
		transition: transform 240ms ease;
	}

	.pe-card:hover .pe-thumb {
		transform: translateY(-3px);
	}

	.pe-thumb-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.94) 0%, oklch(0 0 0 / 0.5) 35%, transparent 70%);
		pointer-events: none;
	}

	.pe-type-pill {
		position: absolute;
		top: 14px;
		left: 14px;
		padding: 4px 10px;
		font-size: 10px;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		border-radius: 9999px;
		color: white;
		background: oklch(0 0 0 / 0.55);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.18);
		z-index: 5;
	}

	.pe-rating {
		position: absolute;
		top: 14px;
		right: 14px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 9px;
		font-size: 11.5px;
		font-weight: 900;
		border-radius: 9999px;
		color: #78350f;
		background: linear-gradient(135deg, #fde68a, #f59e0b);
		box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
		z-index: 5;
	}

	.pe-info {
		position: absolute;
		left: 14px;
		right: 14px;
		bottom: 14px;
		padding: 12px 14px;
		border-radius: 14px;
		background: oklch(from #000000 l c h / 0.4);
		backdrop-filter: blur(14px);
		border: 1px solid rgba(255, 255, 255, 0.18);
		z-index: 5;
	}

	.pe-title {
		font-size: 14px;
		font-weight: 900;
		color: white;
		line-height: 1.2;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.pe-meta-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 8px;
		flex-wrap: wrap;
	}

	.pe-meta {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10.5px;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.85);
	}

	.pe-meta-text {
		max-width: 110px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pe-meta-dot {
		display: inline-block;
		height: 4px;
		width: 4px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.55);
	}

	.pe-meta-icon {
		opacity: 0.85;
	}

	.pe-hover-play {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.18);
		transition: opacity 220ms ease;
		z-index: 4;
		pointer-events: none;
	}

	.pe-card:hover .pe-hover-play {
		opacity: 1;
	}

	.pe-play-circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 56px;
		width: 56px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.95);
		color: white;
		transform: scale(0.78);
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 14px 32px rgba(124, 58, 237, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.55);
	}

	.pe-card:hover .pe-play-circle {
		transform: scale(1);
	}

	@media (hover: none) {
		.pe-card:hover .pe-thumb {
			transform: none;
		}
	}

	/* Mobile perf — backdrop-filter blur(14px) is the worst offender here */
	@media (max-width: 768px) {
		.pe-info,
		.pe-type-pill {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
		.pe-info {
			background: oklch(from #000000 l c h / 0.62);
		}
	}

	.pe-section {
		content-visibility: auto;
		contain-intrinsic-size: 0 380px;
	}
</style>
