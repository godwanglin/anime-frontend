<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import OptimizedImage from './OptimizedImage.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { saved } from '$lib/stores/saved.svelte';

	type Hero = {
		id?: number;
		slug: string;
		title: string;
		description?: string;
		genre: string[];
		episode?: string;
		rating?: string;
		status?: 'Ongoing' | 'Completed';
		thumbnail: string;
		banner?: string;
		href?: string;
		objectPosition?: string;
	};

	const { heroes }: { heroes: Hero[] } = $props();

	let current = $state(0);
	let isTransitioning = $state(false);
	let autoplayInterval: ReturnType<typeof setInterval>;

	let dragStartX = 0;
	let isDragging = $state(false);
	let dragOffset = 0;
	let rootEl: HTMLElement | undefined = $state();
	let visibilityObserver: IntersectionObserver | undefined;

	function goTo(index: number) {
		if (isTransitioning) return;
		isTransitioning = true;
		current = (index + heroes.length) % heroes.length;
		setTimeout(() => (isTransitioning = false), 500);
	}

	function next() {
		goTo(current + 1);
	}
	function prev() {
		goTo(current - 1);
	}

	function startAutoplay() {
		stopAutoplay();
		autoplayInterval = setInterval(() => next(), 5000);
	}

	function stopAutoplay() {
		clearInterval(autoplayInterval);
	}

	function onTouchStart(e: TouchEvent) {
		dragStartX = e.touches[0].clientX;
		isDragging = true;
		stopAutoplay();
	}
	function onTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		dragOffset = e.touches[0].clientX - dragStartX;
	}
	function onTouchEnd() {
		if (Math.abs(dragOffset) > 50) dragOffset > 0 ? prev() : next();
		dragOffset = 0;
		isDragging = false;
		startAutoplay();
	}
	function onMouseDown(e: MouseEvent) {
		dragStartX = e.clientX;
		isDragging = true;
		stopAutoplay();
	}
	function onMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		dragOffset = e.clientX - dragStartX;
	}
	function onMouseUp() {
		if (isDragging && Math.abs(dragOffset) > 60) dragOffset > 0 ? prev() : next();
		dragOffset = 0;
		isDragging = false;
		startAutoplay();
	}

	function slideDistance(index: number) {
		const diff = Math.abs(index - current);
		return Math.min(diff, heroes.length - diff);
	}

	function shouldRenderSlide(index: number) {
		return heroes.length <= 3 || slideDistance(index) <= 1;
	}

	let showDescModal = $state(false);
	let activeDescription = $state('');

	function openDesc(description: string) {
		activeDescription = description;
		showDescModal = true;
	}

	async function toggleSaved(hero: Hero) {
		if (!auth.isLoggedIn) {
			location.href = `/login?redirect=/`;
			return;
		}
		if (!hero.id) return;
		if (saved.checkSaved(hero.id)) {
			await saved.unsaveAnime(hero.id);
			return;
		}
		await saved.saveAnime({
			animeId: hero.id,
			animeSlug: hero.slug,
			animeTitle: hero.title,
			animeThumbnail: hero.thumbnail,
			animeStatus: hero.status ?? 'Ongoing'
		});
	}

	onMount(() => {
		startAutoplay();
		visibilityObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) startAutoplay();
				else stopAutoplay();
			},
			{ threshold: 0.1 }
		);
		if (rootEl) visibilityObserver.observe(rootEl);
	});
	onDestroy(() => {
		stopAutoplay();
		visibilityObserver?.disconnect();
	});
</script>

<!-- HERO SLIDER -->
<section
	bind:this={rootEl}
	class="relative -mx-4 mb-6 overflow-hidden select-none rounded-b-3xl"
	style="min-height: 280px; max-height: 520px; height: 58vw; cursor: {isDragging
		? 'grabbing'
		: 'grab'}"
	role="region"
	aria-label="Featured anime"
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
	onmousedown={onMouseDown}
	onmousemove={onMouseMove}
	onmouseup={onMouseUp}
	onmouseleave={onMouseUp}
>
	{#each heroes as hero, i}
		{@const imgSrc = hero.banner ?? hero.thumbnail}
		{@const imgPos = hero.objectPosition ?? 'center top'}
		{@const isActive = i === current}

		{#if shouldRenderSlide(i)}
		<div
			class="absolute inset-0 transition-opacity duration-700"
			style="opacity: {isActive ? 1 : 0}; z-index: {isActive ? 1 : 0};"
		>
			<!-- ① AMBIENT BLUR LAYER -->
			<div class="absolute inset-0 hidden scale-110 md:block">
				<OptimizedImage
					src={imgSrc}
					alt=""
					aria-hidden="true"
					className="hero-ambient h-full w-full"
					imageClass="h-full w-full object-cover"
					loading={isActive ? 'eager' : 'lazy'}
					fetchpriority={isActive ? 'high' : 'low'}
					sizes="100vw"
					objectPosition={imgPos}
					data-sync-asset-context={hero.id ? 'anime' : undefined}
					data-sync-asset-id={hero.id ? String(hero.id) : undefined}
					data-sync-asset-field={hero.id ? (hero.banner ? 'bigCover' : 'thumbnail') : undefined}
				/>
			</div>

			<!-- ② GAMBAR ASLI -->
			<OptimizedImage
				src={imgSrc}
				alt={hero.title}
				className="absolute inset-0 h-full w-full opacity-40"
				imageClass="h-full w-full object-cover"
				loading={isActive ? 'eager' : 'lazy'}
				fetchpriority={isActive ? 'high' : 'low'}
				sizes="100vw"
				objectPosition={imgPos}
				data-sync-asset-context={hero.id ? 'anime' : undefined}
				data-sync-asset-id={hero.id ? String(hero.id) : undefined}
				data-sync-asset-field={hero.id ? (hero.banner ? 'bigCover' : 'thumbnail') : undefined}
			/>

			<!-- ③ Gradient vignette -->
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"
			></div>
			<div
				class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/20 to-transparent"
			></div>

			<!-- ④ CONTENT -->
			<div class="absolute inset-0 flex items-end md:items-center px-4 md:px-10 pb-8 md:pb-0">
				<div class="flex flex-row items-end md:items-center gap-4 md:gap-8 w-full">
					<!-- Poster — desktop only -->
					<div
						class="hidden md:block shrink-0 w-36 lg:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-700"
						style="transform: translateY({isActive ? '0' : '20px'}); opacity: {isActive ? 1 : 0};"
					>
						<OptimizedImage
							src={imgSrc}
							alt={hero.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover"
							loading={isActive ? 'eager' : 'lazy'}
							fetchpriority={isActive ? 'high' : 'low'}
							sizes="176px"
							objectPosition={imgPos}
							data-sync-asset-context={hero.id ? 'anime' : undefined}
							data-sync-asset-id={hero.id ? String(hero.id) : undefined}
							data-sync-asset-field={hero.id ? (hero.banner ? 'bigCover' : 'thumbnail') : undefined}
						/>
					</div>

					<!-- Text info -->
					<div
						class="w-full max-w-sm transition-all duration-700 delay-100"
						style="transform: translateY({isActive ? '0' : '16px'}); opacity: {isActive ? 1 : 0};"
					>
						<!-- Badges -->
						<div class="flex items-center gap-2 mb-2.5">
							<span
								class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-violet-600 text-white uppercase tracking-widest shadow-lg shadow-violet-500/30"
							>
								Trending
							</span>
							{#if hero.rating}
								<div
									class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30"
								>
									<span class="material-symbols-rounded text-yellow-400 text-[13px]">star</span>
									<span class="text-yellow-400 text-[12px] font-black">{hero.rating}</span>
								</div>
							{/if}
						</div>

						<!-- Title -->
						<h1
							class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2.5 leading-tight drop-shadow-lg line-clamp-2"
						>
							{hero.title}
						</h1>

						<!-- Genre + episode + status pills -->
						<div class="flex flex-wrap gap-1.5 mb-3">
							{#each hero.genre as g}
								<span
									class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/85 border border-white/15"
								>
									{g}
								</span>
							{/each}
							{#if hero.episode}
								<span
									class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white/85 border border-white/15"
								>
									{hero.episode}
								</span>
							{/if}
							{#if hero.status}
								<span
									class="px-2 py-0.5 rounded-full text-[11px] font-semibold border
                                    {hero.status === 'Ongoing'
										? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
										: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400'}"
								>
									{hero.status === 'Ongoing' ? '● Tayang' : 'Tamat'}
								</span>
							{/if}
						</div>

						<!-- Description — truncate 2 baris + tombol selengkapnya -->
						{#if hero.description}
							<div class="hidden sm:block mb-4 max-w-sm">
								<p class="text-white/60 text-[12px] md:text-sm leading-relaxed line-clamp-2">
									{hero.description}
								</p>
								<button
									onclick={() => openDesc(hero.description ?? '')}
									class="text-[11px] text-violet-400 hover:text-violet-300 font-semibold mt-1 transition"
								>
									Selengkapnya...
								</button>
							</div>
						{/if}

						<!-- CTA buttons -->
						<div class="flex items-center gap-2.5">
							<a
								href={hero.href ?? `/anime/${hero.slug}`}
								class="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-zinc-900 text-sm font-black transition hover:bg-white/90 shadow-xl shadow-black/30 active:scale-95"
							>
								<span class="material-symbols-rounded text-[18px]">play_arrow</span>
								Tonton Sekarang
							</a>
							<button
								onclick={() => toggleSaved(hero)}
								class="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition active:scale-95"
								aria-label={saved.checkSaved(hero.id) ? 'Tersimpan' : 'Simpan'}
							>
								<span class="material-symbols-rounded text-[18px]"
									>{saved.checkSaved(hero.id) ? 'bookmark' : 'bookmark_add'}</span
								>
							</button>
							<button
								class="flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition active:scale-95"
							>
								<span class="material-symbols-rounded text-[18px]">info</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		{/if}
	{/each}

	<!-- Prev / Next arrows — desktop only -->
	<button
		onclick={prev}
		class="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
		aria-label="Previous"
	>
		<span class="material-symbols-rounded text-[22px]">chevron_left</span>
	</button>
	<button
		onclick={next}
		class="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
		aria-label="Next"
	>
		<span class="material-symbols-rounded text-[22px]">chevron_right</span>
	</button>

	<!-- Dot indicators -->
	<div class="absolute bottom-3 right-4 z-20 flex items-center gap-1.5">
		{#each heroes as _, i}
			<button
				onclick={() => goTo(i)}
				class="rounded-full transition-all duration-300 {i === current
					? 'w-5 h-1.5 bg-white'
					: 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'}"
				aria-label="Slide {i + 1}"
			></button>
		{/each}
	</div>

	<!-- Progress bar -->
	{#key current}
		<div class="absolute bottom-0 left-0 z-20 h-0.5 bg-white/60 animate-progress"></div>
	{/key}
</section>

<!-- Modal deskripsi -->
{#if showDescModal}
	<button
		class="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
		onclick={() => (showDescModal = false)}
		aria-label="Tutup"
	>
		<div
			class="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-5 text-left"
			role="dialog"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between mb-3">
				<h3 class="font-bold text-white text-sm">Sinopsis</h3>
				<div
					onclick={() => (showDescModal = false)}
					class="h-7 w-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
				>
					<span class="material-symbols-rounded text-[16px]">close</span>
				</div>
			</div>

			<!-- Content -->
			<p class="text-zinc-300 text-sm leading-relaxed">
				{activeDescription}
			</p>
		</div>
	</button>
{/if}

<style>
	:global(.hero-ambient) {
		filter: blur(32px) saturate(150%) brightness(0.55);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.animate-progress) {
			animation: none;
		}
	}
</style>
