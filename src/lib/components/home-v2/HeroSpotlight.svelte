<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import PlayIcon from './icons/PlayIcon.svelte';
	import InfoIcon from './icons/InfoIcon.svelte';
	import StarIcon from './icons/StarIcon.svelte';
	import SparkleIcon from './icons/SparkleIcon.svelte';

	type Hero = {
		id?: number;
		slug: string;
		title: string;
		description?: string;
		genre?: string[];
		episode?: string;
		rating?: string;
		status?: 'Ongoing' | 'Completed';
		thumbnail: string;
		banner?: string;
		href?: string;
		objectPosition?: string;
	};

	let { heroes = [] }: { heroes?: Hero[] } = $props();

	let current = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let isPaused = $state(false);
	let prefersReducedMotion = $state(false);

	const ROTATE_MS = 7000;
	const active = $derived(heroes[current]);
	const upcomingPreviews = $derived(
		heroes.length > 1
			? Array.from({ length: Math.min(3, heroes.length - 1) }, (_, i) => heroes[(current + i + 1) % heroes.length])
			: []
	);

	function goTo(i: number) {
		if (heroes.length === 0) return;
		current = ((i % heroes.length) + heroes.length) % heroes.length;
	}

	function startRotate() {
		stopRotate();
		if (heroes.length <= 1 || prefersReducedMotion) return;
		intervalId = setInterval(() => {
			if (!isPaused) goTo(current + 1);
		}, ROTATE_MS);
	}

	function stopRotate() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	onMount(() => {
		prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		startRotate();
	});

	onDestroy(stopRotate);

	function getBackdrop(h: Hero | undefined) {
		if (!h) return '';
		return h.banner && h.banner.length > 0 ? h.banner : h.thumbnail;
	}

	function getHref(h: Hero | undefined) {
		if (!h) return '#';
		return h.href ?? `/anime/${h.slug}`;
	}
</script>

{#if active}
	<section
		class="hero-v2 relative isolate overflow-hidden rounded-3xl mb-8 ring-1 ring-black/5 dark:ring-white/10"
		style="box-shadow: var(--shadow-lg);"
		onmouseenter={() => (isPaused = true)}
		onmouseleave={() => (isPaused = false)}
		role="region"
		aria-roledescription="carousel"
		aria-label="Anime sorotan"
	>
		<!-- Backdrop layer -->
		<div class="absolute inset-0 -z-10">
			{#each heroes as h, i (h.slug + i)}
				<div
					class="hero-backdrop absolute inset-0 transition-opacity duration-700"
					style="opacity: {i === current ? 1 : 0};"
					aria-hidden={i === current ? undefined : 'true'}
				>
					<OptimizedImage
						src={getBackdrop(h)}
						alt=""
						className="h-full w-full"
						imageClass="h-full w-full object-cover"
						sizes="(max-width: 1024px) 100vw, 1280px"
						loading={i === current ? 'eager' : 'lazy'}
						fetchpriority={i === current ? 'high' : 'low'}
					/>
				</div>
			{/each}
			<!-- Cinematic gradient overlays -->
			<div class="absolute inset-0 bg-linear-to-r from-black/90 via-black/55 to-black/15"></div>
			<div class="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent"></div>
			<!-- Ambient violet wash -->
			<div
				class="absolute -bottom-32 -left-20 h-72 w-72 rounded-full blur-3xl opacity-40 mix-blend-screen"
				style="background: radial-gradient(circle, oklch(0.55 0.22 295), transparent 70%);"
				aria-hidden="true"
			></div>
		</div>

		<!-- Content -->
		<div class="relative z-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 px-5 sm:px-7 lg:px-10 pt-20 sm:pt-24 lg:pt-28 pb-7 sm:pb-9 min-h-110 sm:min-h-125 lg:min-h-135">
			<!-- Left: meta + CTA -->
			<div class="flex flex-col justify-end max-w-2xl">
				<!-- Editorial label -->
				<div class="flex items-center gap-2 mb-3 sm:mb-4">
					<span class="hero-pulse-dot"></span>
					<span class="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">
						Sorotan minggu ini
					</span>
				</div>

				<!-- Title -->
				<h1
					class="text-3xl sm:text-4xl lg:text-6xl font-black leading-[1.05] text-white mb-4 sm:mb-5 drop-shadow-lg"
					style="font-family: 'Bebas Neue', 'Lexend Deca', sans-serif; letter-spacing: 0.005em;"
				>
					{active.title}
				</h1>

				<!-- Meta row -->
				<div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5 text-white/90">
					{#if active.rating}
						<span class="hero-meta-pill flex items-center gap-1">
							<StarIcon size={13} filled />
							<span class="text-[12px] font-black">{active.rating}</span>
						</span>
					{/if}
					{#if active.episode}
						<span class="hero-meta-pill flex items-center gap-1">
							<PlayIcon size={11} />
							<span class="text-[12px] font-bold">{active.episode}</span>
						</span>
					{/if}
					{#if active.status}
						<span class="hero-meta-pill flex items-center gap-1.5">
							{#if active.status === 'Ongoing'}
								<span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
								<span class="text-[12px] font-bold text-emerald-300">Tayang</span>
							{:else}
								<span class="h-1.5 w-1.5 rounded-full bg-zinc-300"></span>
								<span class="text-[12px] font-bold">Tamat</span>
							{/if}
						</span>
					{/if}
					{#if active.genre}
						{#each active.genre.slice(0, 3) as g}
							<span class="hidden sm:inline-flex hero-genre-chip">{g}</span>
						{/each}
					{/if}
				</div>

				<!-- Description -->
				{#if active.description}
					<p class="text-[13px] sm:text-sm text-white/75 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-xl mb-6 sm:mb-7">
						{active.description}
					</p>
				{/if}

				<!-- CTAs -->
				<div class="flex flex-wrap items-center gap-3">
					<a
						href={getHref(active)}
						class="hero-cta-primary group inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[13px] font-black"
					>
						<span class="hero-cta-icon-wrap">
							<PlayIcon size={14} />
						</span>
						Tonton Sekarang
					</a>
					<a
						href="/anime/{active.slug}"
						class="hero-cta-secondary inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[13px] font-black"
					>
						<span class="hero-cta-secondary-icon">
							<InfoIcon size={14} />
						</span>
						Detail
					</a>
				</div>
			</div>

			<!-- Right: floating preview stack (hidden on mobile) -->
			<div class="hidden lg:flex flex-col items-end justify-end gap-3 self-end">
				<div class="flex items-center gap-2 mb-1 self-end">
					<SparkleIcon size={12} class="text-violet-300" />
					<span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
						Berikutnya
					</span>
				</div>
				{#each upcomingPreviews as preview, i (preview.slug + i)}
					<button
						type="button"
						onclick={() => goTo((current + i + 1) % heroes.length)}
						class="hero-preview-card group flex items-center gap-3 w-full max-w-75 p-2.5 pr-4 rounded-2xl text-left transition-all"
						aria-label={`Lihat sorotan ${preview.title}`}
					>
						<div class="relative h-14 w-20 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/15">
							<OptimizedImage
								src={getBackdrop(preview)}
								alt=""
								className="h-full w-full"
								imageClass="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
								sizes="80px"
								loading="lazy"
								fetchpriority="low"
							/>
							<div class="absolute inset-0 bg-linear-to-r from-black/30 to-transparent"></div>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[10px] font-black uppercase tracking-wider text-violet-200/80 mb-0.5">
								#{((current + i + 1) % heroes.length) + 1}
							</p>
							<p class="text-[12.5px] font-bold text-white line-clamp-1">
								{preview.title}
							</p>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Footer: progress dots + counter -->
		<div class="absolute bottom-0 left-0 right-0 z-10 px-5 sm:px-7 lg:px-10 pb-3 sm:pb-4 flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				{#each heroes as _, i (i)}
					<button
						type="button"
						onclick={() => goTo(i)}
						class="hero-progress-track {i === current ? 'is-active' : ''}"
						aria-label={`Sorotan ${i + 1} dari ${heroes.length}`}
						aria-current={i === current ? 'true' : undefined}
					>
						{#if i === current && !prefersReducedMotion && !isPaused}
							<span class="hero-progress-fill"></span>
						{:else if i === current}
							<span class="hero-progress-fill-static"></span>
						{/if}
					</button>
				{/each}
			</div>
			<span class="ml-auto text-[10px] sm:text-[11px] font-bold tracking-wider text-white/55">
				{String(current + 1).padStart(2, '0')} <span class="text-white/30">/</span> {String(heroes.length).padStart(2, '0')}
			</span>
		</div>
	</section>
{/if}

<style>
	.hero-v2 {
		min-height: 440px;
	}

	.hero-pulse-dot {
		display: inline-block;
		height: 6px;
		width: 6px;
		border-radius: 999px;
		background: #c4b5fd;
		box-shadow: 0 0 0 0 rgba(196, 181, 253, 0.7);
		animation: hero-pulse 2s ease-out infinite;
	}

	@keyframes hero-pulse {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(196, 181, 253, 0.55);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(196, 181, 253, 0);
		}
	}

	.hero-meta-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.18);
		backdrop-filter: blur(6px);
	}

	.hero-genre-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 11px;
		border-radius: 9999px;
		background: rgba(124, 58, 237, 0.18);
		border: 1px solid rgba(167, 139, 250, 0.3);
		font-size: 11px;
		font-weight: 700;
		color: #ddd6fe;
	}

	.hero-cta-primary {
		background: linear-gradient(135deg, #ffffff 0%, #f4f4f5 100%);
		color: #4c1d95;
		box-shadow: 0 10px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.6);
		transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease;
	}

	.hero-cta-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 44px rgba(124, 58, 237, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.hero-cta-primary:active {
		transform: translateY(0);
	}

	.hero-cta-icon-wrap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		width: 28px;
		border-radius: 9999px;
		background: linear-gradient(135deg, #7c3aed, #a855f7);
		color: white;
		box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
		transition: transform 200ms ease;
	}

	.hero-cta-primary:hover .hero-cta-icon-wrap {
		transform: scale(1.08);
	}

	.hero-cta-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.22);
		backdrop-filter: blur(8px);
		transition: all 180ms ease;
	}

	.hero-cta-secondary:hover {
		background: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.35);
		transform: translateY(-1px);
	}

	.hero-cta-secondary:active {
		transform: translateY(0);
	}

	.hero-cta-secondary-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		width: 28px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.14);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 200ms ease;
	}

	.hero-cta-secondary:hover .hero-cta-secondary-icon {
		background: rgba(255, 255, 255, 0.95);
		color: var(--accent);
		border-color: rgba(255, 255, 255, 0.95);
		transform: scale(1.05);
	}

	.hero-preview-card {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.hero-preview-card:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(167, 139, 250, 0.35);
		transform: translateX(-3px);
	}

	.hero-progress-track {
		position: relative;
		width: 28px;
		height: 4px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.22);
		overflow: hidden;
		transition: width 320ms cubic-bezier(0.16, 1, 0.3, 1);
		cursor: pointer;
		border: 0;
		padding: 0;
	}

	.hero-progress-track.is-active {
		width: 64px;
		background: rgba(255, 255, 255, 0.18);
	}

	.hero-progress-fill {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, #c4b5fd, #ffffff);
		transform-origin: left;
		animation: hero-fill 7s linear forwards;
	}

	.hero-progress-fill-static {
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, #c4b5fd, #ffffff);
	}

	@keyframes hero-fill {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-pulse-dot {
			animation: none;
		}
		.hero-backdrop {
			transition: none !important;
		}
	}
</style>
