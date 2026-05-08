<script lang="ts">
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';
	import PlayIcon from './icons/PlayIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';
	import ClockIcon from './icons/ClockIcon.svelte';

	const items = $derived(history.items.slice(0, 10));
</script>

{#if items.length > 0 || auth.isLoggedIn}
	<section class="mb-9" aria-label="Lanjutkan menonton">
		<header class="flex items-center justify-between mb-3">
			<div class="flex items-center gap-2.5">
				<span class="cw-icon-badge">
					<PlayIcon size={14} />
				</span>
				<div>
					<h2 class="text-[15px] sm:text-base font-black" style="color: var(--text-primary);">
						Lanjutkan Menonton
					</h2>
					<p class="text-[11px] -mt-0.5" style="color: var(--text-faint);">
						Pick up where you left off
					</p>
				</div>
			</div>
			<a
				href="/profile/history"
				class="cw-link inline-flex items-center gap-1 text-[12px] font-bold transition-colors"
			>
				Riwayat lengkap
				<ChevronRightIcon size={14} />
			</a>
		</header>

		{#if items.length === 0}
			<div
				class="rounded-2xl px-5 py-7 text-center"
				style="background: var(--surface); border: 1px dashed var(--border-strong);"
			>
				<div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style="background: var(--accent-surface); color: var(--accent);">
					<ClockIcon size={20} />
				</div>
				<p class="text-[13px] font-bold mb-1" style="color: var(--text-primary);">Belum ada riwayat</p>
				<p class="text-[12px]" style="color: var(--text-muted);">
					Tonton episode pertamamu — riwayat akan muncul di sini.
				</p>
			</div>
		{:else}
			<div
				class="flex max-w-[calc(100%+2rem)] gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
			>
				{#each items as item (item.episodeSlug)}
					<a href="/anime/{item.animeSlug}/{item.episodeSlug}" class="cw-card group">
						<div class="cw-thumb">
							<OptimizedImage
								src={item.animeThumbnail}
								alt={item.animeTitle}
								className="h-full w-full"
								imageClass="h-full w-full object-cover transition duration-500 md:group-hover:scale-[1.06]"
								sizes="(max-width: 768px) 168px, 208px"
								loading="lazy"
								fetchpriority="low"
							/>
							<!-- Overlay gradient -->
							<div class="cw-thumb-overlay"></div>
							<!-- Play badge (hover) -->
							<div class="cw-play-overlay">
								<div class="cw-play-circle">
									<PlayIcon size={16} />
								</div>
							</div>
							<!-- Episode badge -->
							<span class="cw-ep-badge">Ep {item.episodeNumber}</span>
							<!-- Progress bar -->
							<div class="cw-progress-track">
								<div class="cw-progress-fill" style="width: {item.progressPct}%"></div>
							</div>
						</div>
						<p class="cw-title">{item.animeTitle}</p>
						<p class="cw-meta">
							<span class="cw-meta-pct">{Math.round(item.progressPct)}%</span>
							<span class="cw-meta-sep">•</span>
							ditonton
						</p>
					</a>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.cw-icon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		width: 32px;
		border-radius: 10px;
		background: linear-gradient(135deg, var(--accent), oklch(from var(--accent) calc(l + 0.08) c h));
		color: white;
		box-shadow: 0 4px 12px var(--accent-glow);
	}

	.cw-link {
		color: var(--accent);
	}

	.cw-link:hover {
		color: var(--accent-hover);
	}

	.cw-card {
		flex-shrink: 0;
		width: 168px;
		display: block;
	}

	@media (min-width: 768px) {
		.cw-card {
			width: 208px;
		}
	}

	.cw-thumb {
		position: relative;
		aspect-ratio: 16 / 9;
		border-radius: 14px;
		overflow: hidden;
		background: var(--surface-offset);
		margin-bottom: 8px;
		box-shadow: var(--shadow-md);
	}

	.cw-thumb-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, oklch(0 0 0 / 0.55), transparent 55%);
		pointer-events: none;
	}

	.cw-play-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		background: oklch(0 0 0 / 0.3);
		transition: opacity 220ms ease;
	}

	.cw-card:hover .cw-play-overlay {
		opacity: 1;
	}

	.cw-play-circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		width: 44px;
		border-radius: 9999px;
		background: oklch(from var(--accent) l c h / 0.95);
		color: white;
		transform: scale(0.78);
		transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 8px 24px var(--accent-glow), inset 0 0 0 1.5px rgba(255, 255, 255, 0.55);
	}

	.cw-card:hover .cw-play-circle {
		transform: scale(1);
	}

	.cw-ep-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		padding: 3px 7px;
		border-radius: 6px;
		background: oklch(0 0 0 / 0.7);
		backdrop-filter: blur(4px);
		color: white;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.02em;
	}

	.cw-progress-track {
		position: absolute;
		left: 8px;
		right: 8px;
		bottom: 8px;
		height: 3px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.22);
		overflow: hidden;
	}

	.cw-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #c4b5fd, var(--accent));
		border-radius: inherit;
		box-shadow: 0 0 12px var(--accent-glow);
	}

	.cw-title {
		font-size: 12.5px;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}

	.cw-meta {
		font-size: 11px;
		color: var(--text-faint);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 5px;
		margin-top: 2px;
	}

	.cw-meta-pct {
		color: var(--accent);
		font-weight: 800;
	}

	.cw-meta-sep {
		opacity: 0.5;
	}
</style>
