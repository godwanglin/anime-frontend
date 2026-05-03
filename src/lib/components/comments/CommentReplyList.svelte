<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { comments } from '$lib/stores/comments.svelte';
	import CommentItem from './CommentItem.svelte';

	// ✅ Tidak ada animeId/episodeId — CommentReplyList hanya fetch & render replies
	type Props = {
		commentId: number;
		replyCount: number;
		currentTime?: number;
		onSeekTimestamp?: (seconds: number) => void;
	};

	const { commentId, replyCount, currentTime = 0, onSeekTimestamp = () => null }: Props = $props();

	let loaded = $state(false);
	let loading = $state(false);

	async function loadReplies() {
		if (loading) return;
		loading = true;
		await comments.fetchReplies(commentId).catch(() => null);
		loaded = true;
		loading = false;
	}
</script>

{#if loaded}
	<div class="mt-2 space-y-0">
		{#each comments.replies.get(commentId) ?? [] as reply (reply.id)}
			<!--
                Reply adalah read-only — tidak bisa di-reply lagi (depth=1).
                animeId/episodeId tidak diperlukan karena depth=1 tidak
                menampilkan CommentInput maupun CommentReplyList.
                Tapi CommentItem depth=1 masih butuh animeId untuk like/dislike
                yang memanggil comments.react() — itu tidak butuh animeId.
                Solusi: cast reply.content dari null → undefined via spread.
            -->
			<CommentItem
				comment={{ ...reply, content: reply.content ?? undefined }}
				animeId={0}
				depth={1}
				{currentTime}
				{onSeekTimestamp}
			/>
		{/each}
	</div>
{:else if replyCount > 0}
	<button
		onclick={loadReplies}
		disabled={loading}
		class="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black transition-all active:scale-95 disabled:opacity-60"
		style="color: var(--accent);"
	>
		{#if loading}
			<AppIcon name="progress_activity" style="font-size:13px; animation: spin 1s linear infinite;" />
			Memuat...
		{:else}
			<AppIcon name="subdirectory_arrow_right" style="font-size:13px;" />
			Lihat {replyCount} balasan
		{/if}
	</button>
{/if}

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
