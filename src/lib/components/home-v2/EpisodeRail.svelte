<script lang="ts">
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import { episodeBadgeLabel } from '$lib/content-label';
	import SparkleIcon from './icons/SparkleIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';
	import ClockIcon from './icons/ClockIcon.svelte';
	import PlayCircleIcon from './icons/PlayCircleIcon.svelte';

	type Episode = {
		id: number;
		slug: string;
		title: string;
		episode: string;
		thumbnail: string;
		time: string;
		href?: string;
		animeType?: string | null;
		totalEpisodes?: number | null;
		episodeCount?: number | null;
		[key: string]: any;
	};

	let { items = [] }: { items?: Episode[] } = $props();
</script>

{#if items.length > 0}
	<section class="er-section mb-10" aria-label="Episode terbaru">
		<header class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2.5">
				<span class="er-icon-badge">
					<SparkleIcon size={14} />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black" style="color: var(--text-primary);">
						Episode Terbaru
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Update terkini dari studio
					</p>
				</div>
			</div>
			<a
				href="/episode-baru"
				class="er-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Semua episode
				<ChevronRightIcon size={14} />
			</a>
		</header>

		<div class="flex max-w-[calc(100%+2rem)] gap-3 sm:gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
			{#each items as item (item.id)}
				{@const epLabel = episodeBadgeLabel({
					episode: item.episode,
					animeType: item.animeType,
					totalEpisodes: item.totalEpisodes,
					episodeCount: item.episodeCount
				})}
				{@const isShort = item.animeType?.toLowerCase() === 'short'}
		{@const epHref = isShort && item.href
			? item.href.replace(/^\/anime\//, '/short/')
			: (item.href ?? '/anime/' + item.slug)}
		<a href={epHref} class="er-card group">
					<div class="er-thumb">
						<OptimizedImage
							src={item.thumbnail}
							alt={item.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.06]"
							sizes="(max-width: 768px) 232px, 304px"
							loading="lazy"
							fetchpriority="low"
						/>
						<div class="er-thumb-shade"></div>

						<!-- Episode badge top-left -->
						<span class="er-ep-badge {epLabel === 'Movie' ? 'er-ep-movie' : ''}">
							{#if epLabel !== 'Movie'}
								<PlayCircleIcon size={11} class="mr-1" />
							{:else}
								<span class="h-1.5 w-1.5 rounded-full bg-violet-300 mr-1.5"></span>
							{/if}
							{epLabel}
						</span>

						<!-- Time badge top-right -->
						<span class="er-time-badge">
							<ClockIcon size={11} class="mr-1" />
							{item.time}
						</span>

						<!-- Hover play -->
						<div class="er-play-overlay">
							<div class="er-play-circle">
								<PlayCircleIcon size={32} />
							</div>
						</div>

						<!-- Title -->
						<p class="er-title">{item.title}</p>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.er-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, #10b981, #06b6d4);
		color: white;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}

	.er-link {
		color: var(--accent);
	}

	.er-link:hover {
		color: var(--accent-hover);
	}

	.er-card {
		flex-shrink: 0;
		width: 232px;
		display: block;
	}

	@media (min-width: 768px) {
		.er-card {
			width: 304px;
		}
	}

	.er-thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: 16px;
		overflow: hidden;
		background: var(--surface-offset);
		box-shadow: var(--shadow-md);
		transition: transform 220ms ease;
	}

	.er-card:hover .er-thumb {
		transform: translateY(-2px);
	}

	.er-thumb-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.92) 0%, oklch(0 0 0 / 0.25) 50%, transparent 75%);
		pointer-events: none;
	}

	.er-ep-badge {
		position: absolute;
		top: 10px;
		left: 10px;
		display: inline-flex;
		align-items: center;
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 10.5px;
		font-weight: 900;
		letter-spacing: 0.02em;
		color: white;
		background: linear-gradient(135deg, #7c3aed, #a855f7);
		box-shadow: 0 4px 14px rgba(124, 58, 237, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
		z-index: 5;
	}

	.er-ep-movie {
		background: oklch(0 0 0 / 0.65);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(196, 181, 253, 0.4);
		color: #ddd6fe;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
	}

	.er-time-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		display: inline-flex;
		align-items: center;
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 10px;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.92);
		background: oklch(0 0 0 / 0.55);
		backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		z-index: 5;
	}

	.er-play-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.25);
		transition: opacity 220ms ease;
		z-index: 4;
	}

	.er-card:hover .er-play-overlay {
		opacity: 1;
	}

	.er-play-circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 56px;
		width: 56px;
		border-radius: 9999px;
		color: white;
		transform: scale(0.8);
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
		filter: drop-shadow(0 8px 20px rgba(124, 58, 237, 0.6));
	}

	.er-card:hover .er-play-circle {
		transform: scale(1);
	}

	.er-title {
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 10px;
		font-size: 13px;
		font-weight: 900;
		color: white;
		line-height: 1.25;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		z-index: 5;
	}

	@media (hover: none) {
		.er-card:hover .er-thumb {
			transform: none;
		}
	}

	@media (max-width: 768px) {
		.er-ep-movie,
		.er-time-badge {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}

	.er-section {
		content-visibility: auto;
		contain-intrinsic-size: 0 360px;
	}
</style>
