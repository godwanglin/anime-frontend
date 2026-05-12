<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { episodeBadgeLabel } from '$lib/content-label';
	import type { PageData } from './$types';

	type Episode = {
		id: number;
		title: string;
		episode: string;
		time: string;
		thumbnail: string;
		href: string;
		animeType?: string | null;
		totalEpisodes?: number | null;
		episodeCount?: number | null;
	};

	const { data }: { data: PageData } = $props();
	const episodes = $derived((data.episodes ?? []) as Episode[]);
	const featured = $derived(episodes[0]);
	const restEpisodes = $derived(episodes.slice(1));

	function resolveHref(item: Episode) {
		if (!item.href) return '#';
		if (item.animeType?.toLowerCase() === 'short') return item.href.replace(/^\/anime\//, '/short/');
		return item.href;
	}
	const activeLimit = $derived(Number(data.limit ?? 48));

	const limitOptions = [
		{ value: 24, label: 'Ringkas' },
		{ value: 48, label: 'Standar' },
		{ value: 96, label: 'Banyak' }
	];
</script>

<SEO
	title="Episode Baru"
	description="Update episode anime terbaru subtitle Indonesia, rapi dan cepat buat lanjut nonton."
/>

<div class="max-w-6xl mx-auto">
	<section class="mb-6 overflow-hidden rounded-3xl bg-zinc-950 text-white ring-1 ring-white/10 shadow-2xl shadow-black/25">
		<div class="relative min-h-[230px] md:min-h-[320px]">
			{#if featured}
				<div class="absolute inset-0">
					<OptimizedImage
						src={featured.thumbnail}
						alt={featured.title}
						className="h-full w-full opacity-45"
						imageClass="h-full w-full object-cover"
						loading="eager"
						fetchpriority="high"
						sizes="100vw"
						data-sync-asset-context="episode"
						data-sync-asset-id={String(featured.id)}
						data-sync-asset-field="thumbnail"
					/>
				</div>
			{/if}
			<div class="absolute inset-0 bg-linear-to-r from-black via-black/78 to-black/20"></div>
			<div class="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent"></div>

			<div class="relative z-10 flex min-h-[230px] flex-col justify-end gap-4 p-5 md:min-h-[320px] md:gap-5 md:p-8">
				<div class="max-w-2xl">
					<div class="mb-3 flex items-center gap-2">
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-100 ring-1 ring-violet-300/25"
						>
							<AppIcon name="workspace_premium" class="text-[13px]" />
							Update Premium
						</span>
						<span class="hidden rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/75 ring-1 ring-white/15 sm:inline-flex">
							{episodes.length} episode tersedia
						</span>
					</div>
					<h1 class="text-2xl font-black leading-tight md:text-4xl">Episode Baru</h1>
					<p class="mt-2 max-w-xl text-sm leading-relaxed text-white/70 md:text-[15px]">
						Update terbaru yang siap ditonton, langsung ke episode tanpa muter ke jadwal tayang.
					</p>
				</div>

				{#if featured}
					<a
						href={resolveHref(featured)}
						class="group flex max-w-2xl items-center gap-3 rounded-2xl bg-white/10 p-2.5 backdrop-blur-xl ring-1 ring-white/15 transition hover:bg-white/15"
					>
						<div class="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
							<OptimizedImage
								src={featured.thumbnail}
								alt={featured.title}
								className="h-full w-full"
								imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
								loading="eager"
								fetchpriority="high"
								sizes="112px"
								data-sync-asset-context="episode"
								data-sync-asset-id={String(featured.id)}
								data-sync-asset-field="thumbnail"
							/>
							<div class="absolute inset-0 bg-black/15"></div>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-[11px] font-black uppercase tracking-widest text-violet-200">
								Terbaru sekarang
							</p>
							<p class="mt-0.5 line-clamp-1 text-sm font-black text-white md:text-base">
								{featured.title}
							</p>
							<div class="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/65">
								<span>{episodeBadgeLabel(featured)}</span>
								<span class="h-1 w-1 rounded-full bg-white/35"></span>
								<span>{featured.time}</span>
							</div>
						</div>
						<div
							class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white shadow-lg shadow-violet-500/35 transition group-hover:scale-105 sm:flex"
						>
							<AppIcon name="play_arrow" class="text-[24px]" />
						</div>
					</a>
				{/if}
			</div>
		</div>
	</section>

	<section class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="mb-2 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-green-500/15">
					<AppIcon name="fiber_new" class="text-[20px] text-green-500" />
				</div>
				<p class="text-[11px] font-black uppercase tracking-widest text-zinc-400">Episode</p>
			</div>
			<h2 class="text-xl font-black text-zinc-900 dark:text-white md:text-2xl">
				Semua Episode Baru
			</h2>
		</div>

		<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
			{#each limitOptions as option}
				<a
					href="/episode-baru?limit={option.value}"
					class="shrink-0 rounded-xl border px-3 py-2 text-[12px] font-bold transition
						{activeLimit === option.value
						? 'border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-500/20'
						: 'border-zinc-200 bg-white text-zinc-600 hover:border-violet-400 hover:text-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}"
				>
					{option.label}
				</a>
			{/each}
		</div>
	</section>

	{#if episodes.length > 0}
		<div class="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
			{#each restEpisodes as item, i}
				{@const episodeLabel = episodeBadgeLabel(item)}
				<a
					href={resolveHref(item)}
					class="episode-card group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 transition duration-200 md:hover:-translate-y-0.5 md:hover:shadow-lg md:hover:shadow-black/10 md:hover:ring-violet-300 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:ring-violet-500/40"
				>
					<div class="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800">
						<OptimizedImage
							src={item.thumbnail}
							alt={item.title}
							className="h-full w-full"
							imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
							loading="lazy"
							fetchpriority="low"
							sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
							data-sync-asset-context="episode"
							data-sync-asset-id={String(item.id)}
							data-sync-asset-field="thumbnail"
						/>
						<div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/25 to-transparent"></div>
						<div class="absolute left-3 top-3 flex items-center gap-2">
							<span
								class="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[9px] font-black md:px-2 md:py-1 md:text-[10px] {episodeLabel ===
								'Movie'
									? 'bg-violet-950/70 border border-violet-500/40 text-violet-100 shadow-lg shadow-violet-600/20'
									: 'bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-600/35 ring-1 ring-white/20'}"
							>
								{#if episodeLabel === 'Movie'}
									<span class="h-1.5 w-1.5 rounded-full bg-violet-300"></span>
								{:else}
									<AppIcon name="play_arrow" class="text-[11px] md:text-[12px]" />
								{/if}
								{episodeLabel}
							</span>
						</div>
						<span
							class="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white/90 ring-1 ring-white/10 md:right-3 md:top-3 md:px-2 md:py-1 md:text-[10px]"
						>
							<AppIcon name="schedule" class="text-[10px] md:text-[11px]" />
							{item.time}
						</span>
						<div class="absolute bottom-2 left-2 right-2 md:bottom-3 md:left-3 md:right-3">
							<p class="line-clamp-2 text-[12px] font-black leading-snug text-white drop-shadow md:text-[14px]">
								{item.title}
							</p>
						</div>
					</div>
					<div class="flex items-center justify-between gap-2 p-2.5 md:gap-3 md:p-3">
						<div class="min-w-0">
							<p class="line-clamp-1 text-[12px] font-bold text-zinc-500 dark:text-zinc-400">
								Update #{i + 2}
							</p>
							<p class="line-clamp-1 text-[13px] font-black text-zinc-900 dark:text-white">
								{episodeLabel} tersedia
							</p>
						</div>
						<div
							class="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 transition group-hover:bg-violet-600 group-hover:text-white sm:flex"
						>
							<AppIcon name="chevron_right" class="text-[21px]" />
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="py-16 text-center">
			<AppIcon name="video_library" class="text-[54px] text-zinc-300 dark:text-zinc-700" />
			<p class="mt-2 font-bold text-zinc-700 dark:text-zinc-300">Belum ada episode baru</p>
			<a href="/" class="mt-3 inline-flex text-sm font-bold text-violet-500">Kembali ke home</a>
		</div>
	{/if}
</div>

<NavigationBottom />

<style>
	.episode-card {
		content-visibility: auto;
		contain: layout paint style;
		contain-intrinsic-size: 180px 210px;
	}
</style>
