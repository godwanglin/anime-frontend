<script lang="ts">
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import type { EquippedEffect, EquippedFrame, EquippedNameTag } from '$lib/decorations';
	import { getCultivationBadge, type ExpBadge, type LevelProgress } from '$lib/exp';
	import type { ProfileStats } from '$lib/stores/auth.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { comments } from '$lib/stores/comments.svelte';
	import ProfileCard from '../ProfileCard.svelte';
	import CommentInput from './CommentInput.svelte';
	import CommentReplyList from './CommentReplyList.svelte';

	// ✅ content: string | null — match dengan CommentWithMeta dari store
	type Comment = {
		id: number;
		content?: string | null;
		isDeleted?: boolean;
		isEdited?: boolean;
		likeCount: number;
		dislikeCount: number;
		replyCount?: number;
		userReaction?: 'LIKE' | 'DISLIKE' | null;
		createdAt: string;
		user: {
			id: number;
			username: string;
			avatar?: string | null;
			isVerified?: boolean;
			exp?: number;
			level?: number;
			badge?: ExpBadge;
			levelProgress?: LevelProgress;
			profileStats?: ProfileStats;
			frame?: EquippedFrame;
			nametag?: EquippedNameTag;
			effects?: EquippedEffect[];
		};
	};

	type Props = {
		comment: Comment;
		animeId: number;
		episodeId?: number;
		depth?: number;
	};

	const { comment, animeId, episodeId, depth = 0 }: Props = $props();

	let replying = $state(false);
	let editing = $state(false);
	let editContent = $state(comment.content ?? '');
	let error = $state('');

	const isOwner = $derived(auth.user?.id === comment.user?.id);
	const avatarLetter = $derived((comment.user?.username?.[0] ?? '?').toUpperCase());
	const userLevel = $derived(Math.max(1, Number(comment.user?.level ?? 1)));
	const userBadge = $derived(comment.user?.badge ?? getCultivationBadge(userLevel));
	const userFrame = $derived(comment.user?.frame ?? null);
	const userNameTag = $derived(comment.user?.nametag ?? null);
	const avatarSize = $derived(depth > 0 ? 28 : 36);

	function relativeTime(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const s = Math.floor(diff / 1000);
		if (s < 60) return `${s}d`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}j`;
		const d = Math.floor(h / 24);
		if (d < 30) return `${d}hr`;
		const mo = Math.floor(d / 30);
		if (mo < 12) return `${mo}bln`;
		return `${Math.floor(mo / 12)}thn`;
	}

	async function react(type: 'LIKE' | 'DISLIKE') {
		if (!auth.isLoggedIn) return;
		comments.react(comment.id, type);
	}

	async function saveEdit() {
		if (!editContent.trim()) return;
		await comments.editComment(comment.id, editContent);
		editing = false;
	}

	let currentClickedUser: typeof comment.user | null = $state(comment.user ?? null);
	let showUserCard = $state(false);
	let popoverAnchor = $state<HTMLButtonElement | null>(null);

	// onMount(async () => {
	// 	await assetLoader();
	// });
</script>

<ProfileCard
	user={currentClickedUser as any}
	isOpen={showUserCard && !!currentClickedUser}
	onClose={() => {
		showUserCard = false;
		// assetLoader();
	}}
	anchorEl={popoverAnchor}
/>

<div
	class="group flex gap-3 py-3.5 transition-colors"
	style="
        padding-inline: 1rem;
        {depth > 0 ? 'margin-left: 1rem; border-left: 2px solid var(--border);' : ''}
    "
>
	<!-- Avatar -->
	<div class="shrink-0 mt-0.5">
		<AvatarFrame
			bind:el={popoverAnchor}
			src={comment.user?.avatar ?? null}
			alt={comment.user?.username ?? ''}
			size={avatarSize}
			frame={userFrame}
			fallbackInitial={avatarLetter}
			fromComment
			onclick={() => {
				currentClickedUser = comment.user;
				showUserCard = true;
			}}
		/>
	</div>

	<!-- Body -->
	<div class="flex-1 min-w-0">
		<!-- Username + time -->
		<div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
			<span class="text-[12px] font-black" style="color: var(--text-primary);">
				<NameTag name={comment.user?.username ?? 'Anonim'} nametag={userNameTag} />
			</span>
			{#if comment.user?.isVerified}
				<img src="/badges/verify.png" alt="Verified" class="h-3.5 w-3.5 shrink-0 object-contain" />
			{/if}
			<span class="text-[10px]" style="color: var(--text-faint);">
				{relativeTime(comment.createdAt)}
			</span>
			{#if comment.isEdited && !comment.isDeleted}
				<span
					class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
					style="background: var(--surface-offset); color: var(--text-faint); border: 1px solid var(--border);"
				>
					diedit
				</span>
			{/if}
		</div>
		<div class="mb-1.5 flex items-center gap-1.5">
			<span
				class="relative inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-[9px] font-black text-white"
				style="background: {userBadge.color}; box-shadow: 0 5px 14px color-mix(in oklch, var(--accent) 24%, transparent);"
			>
				<span class="material-symbols-rounded" style="font-size:10px;">workspace_premium</span>
				<span class="shrink-0">Lv {userLevel}</span>
				<span class="truncate">{userBadge.name}</span>
				<span class="badge-shine" aria-hidden="true"></span>
			</span>
		</div>

		<!-- Content / edit mode -->
		{#if editing}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					saveEdit();
				}}
				class="mt-1.5 space-y-2"
			>
				<textarea
					bind:value={editContent}
					rows="2"
					class="w-full resize-none rounded-[var(--radius-lg)] px-3 py-2 text-[13px] leading-relaxed outline-none transition-all"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-primary);
                        box-shadow: var(--shadow-sm);
                    "
				></textarea>
				<div class="flex items-center gap-2">
					<button
						type="submit"
						class="px-3.5 py-1.5 rounded-[var(--radius-lg)] text-[11px] font-black text-white transition-all active:scale-[0.97]"
						style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
					>
						Simpan
					</button>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="px-3.5 py-1.5 rounded-[var(--radius-lg)] text-[11px] font-bold transition-all"
						style="color: var(--text-muted);"
					>
						Batal
					</button>
				</div>
			</form>
		{:else}
			<p
				class="text-[13px] leading-relaxed mt-0.5"
				style="
                    color: {comment.isDeleted ? 'var(--text-faint)' : 'var(--text-primary)'};
                    font-style: {comment.isDeleted ? 'italic' : 'normal'};
                "
			>
				{comment.isDeleted ? 'Komentar dihapus.' : (comment.content ?? '')}
			</p>
		{/if}

		<!-- Actions row -->
		{#if !comment.isDeleted && !editing}
			<div class="flex items-center gap-1 mt-2 flex-wrap">
				<button
					onclick={() => react('LIKE')}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all active:scale-95"
					style="
                        background: {comment.userReaction === 'LIKE'
						? 'var(--accent-surface)'
						: 'transparent'};
                        color: {comment.userReaction === 'LIKE'
						? 'var(--accent-text)'
						: 'var(--text-faint)'};
                        border: 1px solid {comment.userReaction === 'LIKE'
						? 'oklch(from var(--accent) l c h / 0.25)'
						: 'transparent'};
                    "
				>
					<span class="material-symbols-rounded" style="font-size:13px;">thumb_up</span>
					{comment.likeCount}
				</button>

				<button
					onclick={() => react('DISLIKE')}
					class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all active:scale-95"
					style="
                        background: {comment.userReaction === 'DISLIKE'
						? 'color-mix(in oklch, #ef4444 10%, var(--surface))'
						: 'transparent'};
                        color: {comment.userReaction === 'DISLIKE'
						? 'color-mix(in oklch, #ef4444 70%, var(--text-primary))'
						: 'var(--text-faint)'};
                        border: 1px solid {comment.userReaction === 'DISLIKE'
						? 'color-mix(in oklch, #ef4444 25%, transparent)'
						: 'transparent'};
                    "
				>
					<span class="material-symbols-rounded" style="font-size:13px;">thumb_down</span>
					{comment.dislikeCount}
				</button>

				{#if depth === 0}
					<span class="w-0.5 h-0.5 rounded-full mx-0.5" style="background: var(--border-strong);"
					></span>
					<button
						onclick={() => (replying = !replying)}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all active:scale-95"
						style="
                            background: {replying ? 'var(--accent-surface)' : 'transparent'};
                            color: {replying ? 'var(--accent-text)' : 'var(--text-faint)'};
                        "
					>
						<span class="material-symbols-rounded" style="font-size:13px;">reply</span>
						Balas
					</button>
				{/if}

				{#if isOwner}
					<span class="w-0.5 h-0.5 rounded-full mx-0.5" style="background: var(--border-strong);"
					></span>
					<button
						onclick={() => {
							editContent = comment.content ?? '';
							editing = true;
						}}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
						style="color: var(--text-faint);"
					>
						<span class="material-symbols-rounded" style="font-size:12px;">edit</span>
						Edit
					</button>
					<button
						onclick={() => comments.deleteComment(comment.id)}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
						style="color: color-mix(in oklch, #ef4444 65%, var(--text-faint));"
					>
						<span class="material-symbols-rounded" style="font-size:12px;">delete</span>
						Hapus
					</button>
				{/if}
			</div>
		{/if}

		{#if error}
			<p
				class="mt-1.5 text-[11px] font-semibold"
				style="color: color-mix(in oklch, #ef4444 70%, var(--text-primary));"
			>
				{error}
			</p>
		{/if}

		{#if replying && depth === 0}
			<div class="mt-3">
				<CommentInput
					{animeId}
					{episodeId}
					parentId={comment.id}
					onCancel={() => (replying = false)}
				/>
			</div>
		{/if}

		{#if depth === 0}
			<CommentReplyList commentId={comment.id} replyCount={comment.replyCount ?? 0} />
		{/if}
	</div>
</div>

<style>
	.badge-shine {
		position: absolute;
		inset: -40% auto -40% -35%;
		width: 32%;
		transform: rotate(18deg);
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
		animation: badge-shine 3.4s ease-in-out infinite;
	}

	@keyframes badge-shine {
		0% {
			left: -40%;
		}
		55%,
		100% {
			left: 115%;
		}
	}
</style>
