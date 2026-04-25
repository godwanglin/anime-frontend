<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { videoReactions, type VideoReactionType } from '$lib/stores/video-reactions.svelte';

	type Props = {
		episodeId?: number | null;
		compact?: boolean;
	};

	const { episodeId, compact = false }: Props = $props();
	const reaction = $derived(videoReactions.getReaction(episodeId));

	function formatCount(value: number) {
		if (value >= 1_000_000) {
			const f = value / 1_000_000;
			return `${Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1)}M`;
		}
		if (value >= 1_000) {
			const f = value / 1_000;
			return `${Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1)}K`;
		}
		return String(value);
	}

	async function react(type: VideoReactionType) {
		if (!episodeId) return;
		if (!auth.isLoggedIn) {
			goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		await videoReactions.react(episodeId, type).catch(() => null);
	}

	onMount(() => {
		if (episodeId) videoReactions.fetchReaction(episodeId);
	});
</script>

<!--
    Wrapper pill — pakai surface + border dari design tokens.
    Tidak ada lagi bg-zinc-100/zinc-800 hardcoded.
-->
<div
	class="inline-flex items-center rounded-full"
	style="
        background: var(--surface);
        border: 1px solid var(--border-strong);
        box-shadow: var(--shadow-sm);
    "
>
	<!-- ── LIKE ── -->
	<button
		type="button"
		onclick={() => react('LIKE')}
		aria-pressed={reaction.liked}
		aria-label="Suka video"
		class="flex items-center gap-1.5 rounded-full font-black transition-all active:scale-95"
		style="
            height: {compact ? '2rem' : '2.25rem'};
            padding-inline: {compact ? '0.625rem' : '0.75rem'};
            font-size: {compact ? '11px' : '12px'};
            background: {reaction.liked ? 'var(--accent)' : 'transparent'};
            color: {reaction.liked ? '#fff' : 'var(--text-muted)'};
            box-shadow: {reaction.liked ? '0 2px 8px var(--accent-glow)' : 'none'};
        "
	>
		<span class="material-symbols-rounded" style="font-size: {compact ? '15px' : '17px'};">
			thumb_up
		</span>
		<span>{formatCount(reaction.likeCount)}</span>
	</button>

	<!-- Divider -->
	<div class="mx-1" style="width: 1px; height: 1rem; background: var(--border-strong);"></div>

	<!-- ── DISLIKE ── -->
	<button
		type="button"
		onclick={() => react('DISLIKE')}
		aria-pressed={reaction.disliked}
		aria-label="Tidak suka video"
		class="flex items-center gap-1.5 rounded-full font-black transition-all active:scale-95"
		style="
            height: {compact ? '2rem' : '2.25rem'};
            padding-inline: {compact ? '0.625rem' : '0.75rem'};
            font-size: {compact ? '11px' : '12px'};
            background: {reaction.disliked ? 'var(--surface-offset)' : 'transparent'};
            color: {reaction.disliked ? 'var(--text-primary)' : 'var(--text-muted)'};
            border: 1px solid {reaction.disliked ? 'var(--border-strong)' : 'transparent'};
        "
	>
		<span class="material-symbols-rounded" style="font-size: {compact ? '15px' : '17px'};">
			thumb_down
		</span>
		<span>{formatCount(reaction.dislikeCount)}</span>
	</button>
</div>

{#if reaction.error}
	<p class="mt-1.5 text-[11px] font-semibold" style="color: var(--color-error, #a12c7b);">
		{reaction.error}
	</p>
{/if}
