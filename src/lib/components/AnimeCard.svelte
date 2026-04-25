<!-- src/lib/components/AnimeCard.svelte -->
<script lang="ts">
	type AnimeCardProps = {
		slug?: string;
		title: string;
		thumbnail: string;
		genres?: string[];
		status?: 'Ongoing' | 'Completed';
		rank?: number;
		href?: string;
	};

	let { slug, title, thumbnail, genres = [], status, rank, href }: AnimeCardProps = $props();

	const link = $derived(href ?? (slug ? `/anime/${slug}` : '#'));
</script>

<a href={link} class="group flex flex-col">
	<!-- Poster -->
	<div
		class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 mb-2.5 shadow-md group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300"
	>
		<img
			src={thumbnail}
			alt={title}
			class="w-full h-full object-cover transition duration-500 group-hover:scale-110"
			loading="lazy"
		/>

		<!-- Gradient -->
		<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

		<!-- Hover overlay -->
		<div
			class="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[2px] transition-all duration-300 gap-2"
		>
			<div
				class="h-12 w-12 rounded-full bg-white/20 border-2 border-white/60 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300"
			>
				<span class="material-symbols-rounded text-white text-[28px]">play_arrow</span>
			</div>
			{#if genres.length > 0}
				<div class="flex flex-wrap justify-center gap-1 px-2">
					{#each genres.slice(0, 2) as g}
						<span
							class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/20 text-white backdrop-blur-sm"
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
						class="h-6 w-6 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center font-bold text-[11px] text-white/60"
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
						class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 backdrop-blur-sm"
					>
						<span class="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"></span>
						Tayang
					</span>
				{:else}
					<span
						class="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-zinc-500/20 border border-zinc-500/30 text-zinc-400 backdrop-blur-sm"
					>
						Tamat
					</span>
				{/if}
			</div>
		{/if}

		<!-- Bottom overlay: genre pills -->
		{#if genres.length > 0}
			<div class="absolute bottom-0 left-0 right-0 p-2 z-10">
				<div class="flex gap-1 mb-1">
					<span
						class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-600/70 text-white backdrop-blur-sm"
					>
						{genres[0]}
					</span>
					{#if genres.length > 1}
						<span
							class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/15 text-white/80 backdrop-blur-sm"
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
