<!-- src/lib/components/AnimeCard.svelte -->
<script lang="ts">
	import OptimizedImage from './OptimizedImage.svelte';

	type AnimeCardProps = {
		slug?: string;
		title: string;
		thumbnail: string;
		genres?: string[];
		status?: 'Ongoing' | 'Completed';
		rank?: number;
		href?: string;
		rating?: number | string | null;
		aboveFold?: boolean;
	};

	let {
		slug,
		title,
		thumbnail,
		genres = [],
		status,
		rank,
		href,
		rating,
		aboveFold = false
	}: AnimeCardProps = $props();

	const link = $derived(href ?? (slug ? `/anime/${slug}` : '#'));
	const loading = $derived(aboveFold ? 'eager' : 'lazy');
	const fetchpriority = $derived(aboveFold ? 'high' : 'low');
</script>

<a href={link} class="anime-card group flex flex-col">
	<!-- Poster -->
	<div
		class="anime-card-poster relative rounded-2xl overflow-hidden aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 mb-2.5 shadow-sm md:shadow-md md:group-hover:shadow-lg md:group-hover:shadow-black/30 transition-shadow duration-200"
	>
		<OptimizedImage
			src={thumbnail}
			alt={title}
			className="h-full w-full"
			imageClass="anime-card-image h-full w-full object-cover transition duration-600 md:group-hover:scale-[1.04]"
			{loading}
			{fetchpriority}
			sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 170px"
		/>

		<!-- Gradient -->
		<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

		<!-- Hover overlay -->
		<div
			class="anime-card-hover absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-black/35 opacity-0 transition-opacity duration-200 md:flex md:group-hover:opacity-100"
		>
			<div
				class="h-12 w-12 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center scale-90 md:group-hover:scale-100 transition-transform duration-200"
			>
				<span class="material-symbols-rounded text-white text-[28px]">play_arrow</span>
			</div>
			{#if genres.length > 0}
				<div class="flex flex-wrap justify-center gap-1 px-2">
					{#each genres.slice(0, 2) as g}
						<span
							class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/20 text-white"
						>
							{g}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Rank badge -->
		{#if rank !== undefined}
			<div class="absolute top-2 left-2 z-10">
				{#if rank === 1}
					<div
						class="h-6 w-6 rounded-lg flex items-center justify-center font-black text-[12px] bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/30"
					>
						1
					</div>
				{:else if rank === 2}
					<div
						class="h-6 w-6 rounded-lg flex items-center justify-center font-black text-[12px] bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-700 shadow-lg"
					>
						2
					</div>
				{:else if rank === 3}
					<div
						class="h-6 w-6 rounded-lg flex items-center justify-center font-black text-[12px] bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 shadow-lg shadow-amber-500/30"
					>
						3
					</div>
				{:else}
					<div
						class="h-6 w-6 rounded-lg bg-black/55 flex items-center justify-center font-bold text-[11px] text-white/70"
					>
						{rank}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Status badge -->
		{#if status}
			<div class="absolute top-2 right-2 z-10">
				{#if status === 'Ongoing'}
					<span
						class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
					>
						<span class="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
						Tayang
					</span>
				{:else}
					<span
						class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-950/65 border border-zinc-500/30 text-zinc-300"
					>
						Tamat
					</span>
				{/if}
			</div>
		{/if}

		{#if rating}
			<div
				class="absolute bottom-2 right-2 z-10 flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5"
			>
				<span class="material-symbols-rounded text-yellow-400 text-[11px]">star</span>
				<span class="text-[10px] font-bold text-white">{rating}</span>
			</div>
		{/if}

		<!-- Bottom overlay: genre pills -->
		{#if genres.length > 0}
			<div class="absolute bottom-0 left-0 right-0 p-2 z-10">
				<div class="flex gap-1 mb-1">
					<span
						class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-600/80 text-white"
					>
						{genres[0]}
					</span>
					{#if genres.length > 1}
						<span
							class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-black/45 text-white/85"
						>
							+{genres.length - 1}
						</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Text info di bawah poster -->
	<div class="px-0.5 flex-1">
		<p
			class="text-[12px] md:text-[13px] font-bold text-zinc-800 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors"
		>
			{title}
		</p>
		{#if genres.length > 0}
			<div class="flex gap-1 mt-1 overflow-hidden">
				{#each genres as g, i}
					<span class="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-400">{g}</span>
					{#if i < genres.length - 1}
						<span class="text-zinc-300 dark:text-zinc-600 text-[10px]">·</span>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</a>

<style>
	.anime-card {
		content-visibility: auto;
		contain-intrinsic-size: 210px 360px;
		contain: layout paint style;
	}

	.anime-card-poster {
		transform: translateZ(0);
	}

	@media (hover: none), (pointer: coarse) {
		.anime-card :global(.anime-card-image) {
			transform: none !important;
			transition-duration: 160ms;
		}
	}
</style>
