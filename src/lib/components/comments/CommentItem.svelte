<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import { parseCommentTimestamp } from '$lib/comment-timestamp';
	import { displayUserName } from '$lib/user-display';
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
			fullName?: string | null;
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
		currentTime?: number;
		onSeekTimestamp?: (seconds: number) => void;
	};

	const {
		comment,
		animeId,
		episodeId,
		depth = 0,
		currentTime = 0,
		onSeekTimestamp = () => null
	}: Props = $props();

	let replying = $state(false);
	let editing = $state(false);
	let editContent = $state(comment.content ?? '');
	let error = $state('');
	let reportOpen = $state(false);
	let reportReason = $state('spam');
	let reportDescription = $state('');
	let reportSubmitting = $state(false);
	let reportMessage = $state('');
	let reportError = $state('');

	const reportReasons = [
		{ value: 'spam', label: 'Spam', description: 'Promosi, link mencurigakan, atau komentar berulang' },
		{ value: 'harassment', label: 'Pelecehan', description: 'Menyerang atau mengganggu user lain' },
		{ value: 'hate_speech', label: 'Ujaran kebencian', description: 'Menghina kelompok atau identitas tertentu' },
		{ value: 'misinformation', label: 'Misinformasi', description: 'Informasi palsu atau menyesatkan' },
		{ value: 'inappropriate', label: 'Tidak pantas', description: 'Konten kasar, vulgar, atau tidak sesuai' },
		{ value: 'other', label: 'Lainnya', description: 'Alasan lain yang perlu admin cek' }
	];

	const isOwner = $derived(auth.user?.id === comment.user?.id);
	const avatarLetter = $derived((comment.user?.username?.[0] ?? '?').toUpperCase());
	const userLevel = $derived(Math.max(1, Number(comment.user?.level ?? 1)));
	const userBadge = $derived(comment.user?.badge ?? getCultivationBadge(userLevel));
	const userFrame = $derived(comment.user?.frame ?? null);
	const userNameTag = $derived(comment.user?.nametag ?? null);
	const avatarSize = $derived(depth > 0 ? 28 : 36);
	const timestamp = $derived(parseCommentTimestamp(comment.content));
	const hasTimestamp = $derived(timestamp.seconds !== null);
	const isTimestampActive = $derived(
		hasTimestamp && Math.abs(currentTime - Number(timestamp.seconds)) <= 5
	);

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

	function seekTimestamp() {
		if (timestamp.seconds === null) return;
		onSeekTimestamp(timestamp.seconds);
	}

	function openReport() {
		if (!auth.isLoggedIn) {
			location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
			return;
		}
		reportOpen = true;
		reportMessage = '';
		reportError = '';
	}

	function closeReport() {
		if (reportSubmitting) return;
		reportOpen = false;
		reportMessage = '';
		reportError = '';
	}

	async function submitReport() {
		reportSubmitting = true;
		reportMessage = '';
		reportError = '';
		try {
			const message = await comments.reportComment(comment.id, {
				reason: reportReason,
				description: reportDescription
			});
			reportMessage = message;
			reportDescription = '';
			setTimeout(() => {
				reportOpen = false;
				reportMessage = '';
			}, 1200);
		} catch (err) {
			reportError = err instanceof Error ? err.message : 'Gagal mengirim laporan';
		} finally {
			reportSubmitting = false;
		}
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

{#if reportOpen}
	<div class="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm md:items-center">
		<button class="absolute inset-0" aria-label="Tutup laporan komentar" onclick={closeReport}></button>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				submitReport();
			}}
			class="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Report Komentar</p>
					<h2 class="mt-1 text-lg font-black">Laporkan komentar</h2>
					<p class="mt-1 line-clamp-2 text-xs text-zinc-500">
						Komentar dari {displayUserName(comment.user, 'Anonim')}
					</p>
				</div>
				<button
					type="button"
					onclick={closeReport}
					class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
					aria-label="Tutup"
				>
					<AppIcon name="close" class="text-[20px]" />
				</button>
			</div>

			<div class="mb-3 block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-400">Alasan</span>
				<CustomSelect
					value={reportReason}
					options={reportReasons}
					align="left"
					minWidth={360}
					fullWidth
					onChange={(value) => (reportReason = value)}
				/>
			</div>

			<label class="mb-4 block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-400">Detail opsional</span>
				<textarea
					bind:value={reportDescription}
					rows="4"
					maxlength="500"
					placeholder="Tambahkan konteks supaya admin lebih cepat cek..."
					class="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-red-500"
				></textarea>
			</label>

			{#if reportError}
				<p class="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{reportError}</p>
			{/if}
			{#if reportMessage}
				<p class="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300">{reportMessage}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={closeReport}
					class="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-black text-zinc-400 hover:bg-zinc-900"
				>
					Batal
				</button>
				<button
					type="submit"
					disabled={reportSubmitting}
					class="h-10 rounded-xl bg-red-600 px-4 text-xs font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-500 disabled:opacity-60"
				>
					{reportSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
				</button>
			</div>
		</form>
	</div>
{/if}

<div
	class="group flex gap-3 py-3.5 transition-colors"
	class:is-timestamp-active={isTimestampActive}
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
				<NameTag name={displayUserName(comment.user, 'Anonim')} nametag={userNameTag} />
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
				<AppIcon name="workspace_premium" style="font-size:10px;" />
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
			{#if hasTimestamp}
				<button
					type="button"
					onclick={seekTimestamp}
					class="mb-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black transition-all active:scale-95"
					style="background: {isTimestampActive ? 'var(--accent)' : 'var(--accent-surface)'}; color: {isTimestampActive ? 'white' : 'var(--accent)'}; border: 1px solid color-mix(in oklab, var(--accent) 28%, transparent);"
				>
					<AppIcon name="play_circle" style="font-size:12px;" />
					{timestamp.label}
				</button>
			{/if}
			<p
				class="text-[13px] leading-relaxed mt-0.5"
				style="
                    color: {comment.isDeleted ? 'var(--text-faint)' : 'var(--text-primary)'};
                    font-style: {comment.isDeleted ? 'italic' : 'normal'};
                "
			>
				{comment.isDeleted ? 'Komentar dihapus.' : timestamp.text}
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
					<AppIcon name="thumb_up" style="font-size:13px;" />
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
					<AppIcon name="thumb_down" style="font-size:13px;" />
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
						<AppIcon name="reply" style="font-size:13px;" />
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
						<AppIcon name="edit" style="font-size:12px;" />
						Edit
					</button>
					<button
						onclick={() => comments.deleteComment(comment.id)}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
						style="color: color-mix(in oklch, #ef4444 65%, var(--text-faint));"
					>
						<AppIcon name="delete" style="font-size:12px;" />
						Hapus
					</button>
				{:else}
					<span class="w-0.5 h-0.5 rounded-full mx-0.5" style="background: var(--border-strong);"
					></span>
					<button
						onclick={openReport}
						class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95"
						style="color: color-mix(in oklch, #ef4444 62%, var(--text-faint));"
					>
						<AppIcon name="flag" style="font-size:12px;" />
						Report
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
			<CommentReplyList
				commentId={comment.id}
				replyCount={comment.replyCount ?? 0}
				{currentTime}
				{onSeekTimestamp}
			/>
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

	.is-timestamp-active {
		background: color-mix(in oklab, var(--accent) 9%, transparent);
		box-shadow: inset 3px 0 0 var(--accent);
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
