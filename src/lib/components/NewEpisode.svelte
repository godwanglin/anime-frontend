<!-- src/lib/components/AnimeListItem.svelte -->
<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	type AnimeListItemProps = {
		title: string;
		thumbnail: string;
		href?: string;
		rank?: number;
		episode?: string;
		time?: string;
	};

	let { title, thumbnail, href = '#', rank, episode, time }: AnimeListItemProps = $props();
</script>

<a
	{href}
	class="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition group"
>
	<!-- Rank -->
	{#if rank !== undefined}
		<span
			class="text-[13px] font-black w-5 text-center shrink-0 {rank <= 3
				? 'text-violet-500'
				: 'text-zinc-400'}"
		>
			{rank}
		</span>
	{/if}

	<!-- Thumb -->
	<div
		class="relative shrink-0 w-20 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800"
	>
		<img
			src={thumbnail}
			alt={title}
			class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
			loading="lazy"
		/>
		<div
			class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition"
		>
			<AppIcon name="play_circle" class="text-white text-[20px]" />
		</div>
	</div>

	<!-- Info -->
	<div class="flex-1 min-w-0">
		<p class="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">
			{title}
		</p>
		{#if episode}
			<p class="text-[11px] text-zinc-500 dark:text-zinc-400">{episode}</p>
		{/if}
	</div>

	<!-- Time -->
	{#if time}
		<span class="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{time}</span>
	{/if}
</a>
