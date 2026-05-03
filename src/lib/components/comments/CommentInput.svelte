<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { formatCommentTimestamp, withCommentTimestamp } from '$lib/comment-timestamp';
	import { auth } from '$lib/stores/auth.svelte';
	import { comments } from '$lib/stores/comments.svelte';
	import { userInitial } from '$lib/user-display';

	type Props = {
		animeId: number;
		episodeId?: number;
		parentId?: number;
		currentTime?: number;
		onCancel?: () => void;
	};

	const { animeId, episodeId, parentId, currentTime = 0, onCancel }: Props = $props();

	let content = $state('');
	let error = $state('');
	let focused = $state(false);
	let timestampAttached = $state(false);

	const isReply = $derived(!!parentId);
	const canAttachTimestamp = $derived(!isReply && Number.isFinite(currentTime) && currentTime >= 1);
	const timestampLabel = $derived(formatCommentTimestamp(currentTime));

	const cooldownText = $derived(() => {
		const s = comments.cooldownRemaining;
		if (s <= 0) return '';
		return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}d` : `${s}d`;
	});

	async function submit() {
		if (!content.trim()) return;
		error = '';
		await comments.postComment({
			animeId,
			episodeId,
			parentId,
			content: withCommentTimestamp(content, timestampAttached && !isReply ? currentTime : null)
		});
		content = '';
		timestampAttached = false;
		// Jika reply, tutup input setelah kirim
		if (isReply) onCancel?.();
	}

	function attachTimestamp() {
		if (!canAttachTimestamp) return;
		timestampAttached = !timestampAttached;
		focused = true;
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		submit();
	}}
>
	<div class="flex gap-2.5 items-start">
		<!-- Current user avatar -->
		{#if auth.user?.avatar}
			<img
				src={auth.user.avatar}
				alt=""
				class="shrink-0 rounded-full object-cover mt-0.5"
				style="
                    width: {isReply ? '28px' : '36px'};
                    height: {isReply ? '28px' : '36px'};
                    border: 1.5px solid var(--border-strong);
                "
			/>
		{:else}
			<div
				class="shrink-0 rounded-full flex items-center justify-center font-black mt-0.5"
				style="
                    width: {isReply ? '28px' : '36px'};
                    height: {isReply ? '28px' : '36px'};
                    font-size: {isReply ? '11px' : '13px'};
                    background: oklch(from var(--accent) 0.88 0.08 h);
                    color: var(--accent-text);
                    border: 1.5px solid oklch(from var(--accent) l c h / 0.2);
                "
			>
				{userInitial(auth.user, '?')}
			</div>
		{/if}

		<!-- Textarea block -->
		<div class="flex-1 min-w-0">
			<div
				class="rounded-[var(--radius-xl)] overflow-hidden transition-all"
				style="
                    background: var(--surface);
                    border: 1px solid {focused ? 'var(--accent)' : 'var(--border-strong)'};
                    box-shadow: {focused ? '0 0 0 3px var(--accent-glow)' : 'var(--shadow-sm)'};
                "
			>
				<textarea
					bind:value={content}
					onfocus={() => (focused = true)}
					onblur={() => (focused = false)}
					placeholder={isReply ? 'Balas komentar...' : 'Tulis komentar...'}
					maxlength={1000}
					rows={focused || content.length > 0 ? 3 : 1}
					class="w-full resize-none px-3.5 py-2.5 text-[13px] leading-relaxed outline-none"
					style="background: transparent; color: var(--text-primary);"
				></textarea>

				{#if focused || content.length > 0}
					<div class="flex items-center justify-between px-3.5 pb-2.5 gap-3">
						<span class="text-[10px] font-semibold" style="color: var(--text-faint);">
							{#if comments.cooldownRemaining > 0}
								<span style="color: color-mix(in oklch, #f59e0b 70%, var(--text-faint));">
									⏳ {cooldownText()}
								</span>
							{:else}
								<span
									style="color: {1000 - content.length < 50
										? 'color-mix(in oklch, #ef4444 60%, var(--text-faint))'
										: 'var(--text-faint)'};"
								>
									{1000 - content.length}/1000
								</span>
							{/if}
						</span>
						<div class="flex items-center gap-1.5">
							{#if canAttachTimestamp}
								<button
									type="button"
									onclick={attachTimestamp}
									class="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-black transition-all active:scale-95"
									style="background: {timestampAttached ? 'var(--accent-surface)' : 'var(--surface-offset)'}; color: var(--accent); border: 1px solid {timestampAttached ? 'color-mix(in oklab, var(--accent) 28%, transparent)' : 'var(--border-strong)'};"
								>
									<AppIcon name="schedule" style="font-size:13px;" />
									{timestampLabel}
								</button>
							{/if}
							{#if isReply && onCancel}
								<button
									type="button"
									onclick={onCancel}
									class="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
									style="color: var(--text-muted);"
								>
									Batal
								</button>
							{/if}
							<button
								type="submit"
								disabled={!content.trim() || comments.cooldownRemaining > 0}
								class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
								style="background: var(--accent); box-shadow: 0 2px 8px var(--accent-glow);"
							>
								<AppIcon name="send" style="font-size:13px;" />
								Kirim
							</button>
						</div>
					</div>
				{/if}
			</div>

			{#if error}
				<p
					class="mt-1.5 text-[11px] font-semibold"
					style="color: color-mix(in oklch, #ef4444 70%, var(--text-primary));"
				>
					{error}
				</p>
			{/if}
		</div>
	</div>
</form>
