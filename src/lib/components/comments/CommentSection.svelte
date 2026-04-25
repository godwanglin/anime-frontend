<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { comments } from '$lib/stores/comments.svelte';
	import CommentInput from './CommentInput.svelte';
	import CommentItem from './CommentItem.svelte';

	type Props = {
		animeId: number;
		episodeId?: number;
		/**
		 * When true, the section becomes a flex column that fills its
		 * parent's height. Header/input/sort stay pinned, the list scrolls
		 * internally — used in the desktop layout to keep the comments
		 * pane aligned with the episode list.
		 */
		bounded?: boolean;
	};

	const { animeId, episodeId, bounded = false }: Props = $props();
	let sort = $state<'newest' | 'oldest' | 'top'>('newest');

	onMount(() => {
		comments.startCooldownTimer();
		comments.fetchComments(animeId, episodeId, 1, sort);
	});

	function changeSort(value: 'newest' | 'oldest' | 'top') {
		sort = value;
		comments.fetchComments(animeId, episodeId, 1, sort);
	}
</script>

<section class="comment-section {bounded ? 'is-bounded' : 'mt-6'}">
	<!-- ── Section header ── -->
	<div class="comment-section-head flex items-center justify-between gap-3 px-4 md:px-0 mb-4">
		<div>
			<h2 class="text-[15px] font-black leading-tight" style="color: var(--text-primary);">
				Komentar
			</h2>
			<p class="text-[11px] mt-0.5" style="color: var(--text-faint);">
				{comments.pagination.total} komentar
			</p>
		</div>

		<!-- Sort pill tabs -->
		<div
			class="flex items-center gap-1 p-1 rounded-full"
			style="background: var(--surface); border: 1px solid var(--border-strong); box-shadow: var(--shadow-sm);"
		>
			{#each [{ value: 'newest', label: 'Terbaru' }, { value: 'top', label: 'Top' }, { value: 'oldest', label: 'Lama' }] as const as tab}
				<button
					onclick={() => changeSort(tab.value)}
					class="px-3 py-1.5 rounded-full text-[10px] font-black transition-all"
					style="
                        background: {sort === tab.value ? 'var(--accent)' : 'transparent'};
                        color: {sort === tab.value ? '#fff' : 'var(--text-muted)'};
                        box-shadow: {sort === tab.value ? '0 2px 6px var(--accent-glow)' : 'none'};
                    "
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Login prompt ── -->
	{#if !auth.isLoggedIn}
		<div
			class="comment-section-head mx-4 md:mx-0 mb-5 flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-xl)]"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
		>
			<span
				class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
				style="background: var(--accent); color: #fff;"
			>
				<span class="material-symbols-rounded" style="font-size:16px;">person</span>
			</span>
			<p class="text-[12px] flex-1" style="color: var(--text-muted);">
				<button
					onclick={() => goto(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
					class="font-black transition-colors"
					style="color: var(--accent);"
				>
					Login
				</button>
				untuk berkomentar, like, dan dislike.
			</p>
		</div>
	{:else}
		<div class="comment-section-head px-4 md:px-0 mb-5">
			<CommentInput {animeId} {episodeId} />
		</div>
	{/if}

	<!-- Divider -->
	<div class="comment-section-head mx-4 md:mx-0 h-px mb-4" style="background: var(--border);"></div>

	<!-- ── Comment list ── -->
	<div class="comment-section-list space-y-0">
		{#if comments.isLoading && comments.items.length === 0}
			{#each [1, 2, 3] as _}
				<div class="flex gap-3 px-4 md:px-0 py-4">
					<div
						class="shrink-0 w-9 h-9 rounded-full"
						style="background: var(--surface-offset);"
					></div>
					<div class="flex-1 space-y-2 pt-1">
						<div class="h-2.5 w-24 rounded-full" style="background: var(--surface-offset);"></div>
						<div class="h-2.5 w-full rounded-full" style="background: var(--surface-offset);"></div>
						<div class="h-2.5 w-2/3 rounded-full" style="background: var(--surface-offset);"></div>
					</div>
				</div>
			{/each}
		{:else}
			{#each comments.items as comment (comment.id)}
				<CommentItem {comment} {animeId} {episodeId} depth={0} />
			{:else}
				<div class="px-4 md:px-0 py-12 flex flex-col items-center gap-3">
					<div
						class="w-14 h-14 rounded-2xl flex items-center justify-center"
						style="background: var(--surface-offset); border: 1px solid var(--border);"
					>
						<span
							class="material-symbols-rounded"
							style="font-size:28px; color: var(--text-faint);"
						>
							chat_bubble_outline
						</span>
					</div>
					<p class="text-[13px] font-bold" style="color: var(--text-muted);">Belum ada komentar</p>
					<p class="text-[11px]" style="color: var(--text-faint);">
						Jadilah yang pertama berkomentar
					</p>
				</div>
			{/each}
		{/if}
	</div>

	<!-- ── Load more — inside scroll area when bounded ── -->
	{#if comments.items.length < comments.pagination.total}
		<button
			onclick={() => comments.fetchComments(animeId, episodeId, comments.pagination.page + 1, sort)}
			class="comment-section-foot mt-4 mx-4 md:mx-0 w-[calc(100%-2rem)] md:w-full py-3 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-[0.99]"
			style="background: var(--surface); border-color: var(--border-strong); color: var(--text-muted); box-shadow: var(--shadow-sm);"
		>
			<span class="material-symbols-rounded" style="font-size:16px;">expand_more</span>
			Muat lebih banyak
		</button>
	{/if}
</section>

<style>
	@keyframes shimmer {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 1;
		}
	}

	/*
	 * Bounded mode: section fills its parent's height. Header, input,
	 * sort tabs and divider stay pinned, the comment list scrolls
	 * internally — visually mirrors the episode list sidebar.
	 */
	.comment-section.is-bounded {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
	}

	.comment-section.is-bounded .comment-section-head {
		flex-shrink: 0;
	}

	.comment-section.is-bounded .comment-section-list {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding-right: 4px;
	}

	.comment-section.is-bounded .comment-section-foot {
		flex-shrink: 0;
	}

	/* Thin scrollbar to match the episode list */
	.comment-section.is-bounded .comment-section-list::-webkit-scrollbar {
		width: 4px;
	}
	.comment-section.is-bounded .comment-section-list::-webkit-scrollbar-track {
		background: transparent;
	}
	.comment-section.is-bounded .comment-section-list::-webkit-scrollbar-thumb {
		background: var(--border-strong);
		border-radius: 9999px;
	}
</style>
