<script lang="ts">
	import { goto } from '$app/navigation';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';

	let removingId = $state<number | null>(null);
	let confirmClear = $state(false);

	async function remove(episodeId: number) {
		removingId = episodeId;
		await history.deleteHistory(episodeId);
		removingId = null;
	}

	async function clearAll() {
		confirmClear = false;
		await history.clearHistory();
	}

	// Group items by relative date label
	function getDateLabel(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
		if (diff === 0) return 'Hari ini';
		if (diff === 1) return 'Kemarin';
		if (diff < 7) return `${diff} hari lalu`;
		if (diff < 30) return `${Math.floor(diff / 7)} minggu lalu`;
		return `${Math.floor(diff / 30)} bulan lalu`;
	}

	const grouped = $derived(() => {
		const map = new Map<string, typeof history.items>();
		for (const item of history.items) {
			const label = getDateLabel(item.watchedAt ?? item.updatedAt ?? '');
			if (!map.has(label)) map.set(label, []);
			map.get(label)!.push(item);
		}
		return [...map.entries()];
	});
</script>

<SEO title="Riwayat" noindex />

{#if !auth.isLoggedIn}
	<!-- ── NOT LOGGED IN ── -->
	<div class="flex flex-col items-center justify-center py-24 px-6 text-center">
		<div
			class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
		>
			<span class="material-symbols-rounded" style="font-size:28px; color: var(--accent);">
				history
			</span>
		</div>
		<h1 class="text-[18px] font-black mb-1.5" style="color: var(--text-primary);">
			Login diperlukan
		</h1>
		<p class="text-[13px] mb-6 max-w-[240px]" style="color: var(--text-muted);">
			Riwayat tontonanmu tersimpan dan bisa dilanjutkan dari perangkat manapun.
		</p>
		<button
			onclick={() => goto('/login?redirect=/profile/history')}
			class="h-12 px-8 rounded-[var(--radius-xl)] text-[13px] font-black text-white transition-all active:scale-[0.97]"
			style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
		>
			Masuk
		</button>
	</div>
{:else}
	<div class="max-w-3xl mx-auto pb-12">
		<!-- ── PAGE HEADER ── -->
		<div class="flex items-end justify-between gap-4 mb-6">
			<div>
				<h1 class="text-[22px] font-black tracking-tight" style="color: var(--text-primary);">
					Riwayat
				</h1>
				<p class="text-[12px] mt-0.5" style="color: var(--text-faint);">
					{history.items.length} episode ditonton
				</p>
			</div>

			{#if history.items.length > 0}
				{#if confirmClear}
					<!-- Confirm state -->
					<div
						class="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-xl)]"
						style="
                            background: color-mix(in oklch, #ef4444 8%, var(--surface));
                            border: 1px solid color-mix(in oklch, #ef4444 25%, transparent);
                        "
					>
						<span class="text-[11px] font-bold" style="color: var(--text-muted);">
							Hapus semua?
						</span>
						<button
							onclick={clearAll}
							class="px-2.5 py-1 rounded-full text-[10px] font-black text-white transition-all active:scale-[0.97]"
							style="background: #ef4444;"
						>
							Ya, hapus
						</button>
						<button
							onclick={() => (confirmClear = false)}
							class="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
							style="color: var(--text-muted);"
						>
							Batal
						</button>
					</div>
				{:else}
					<button
						onclick={() => (confirmClear = true)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
						style="
                            color: color-mix(in oklch, #ef4444 70%, var(--text-muted));
                            background: var(--surface);
                            border: 1px solid var(--border-strong);
                            box-shadow: var(--shadow-sm);
                        "
					>
						<span class="material-symbols-rounded" style="font-size:13px;">delete_sweep</span>
						Hapus semua
					</button>
				{/if}
			{/if}
		</div>

		{#if history.items.length === 0}
			<!-- ── EMPTY STATE ── -->
			<div class="flex flex-col items-center justify-center py-20 px-6 text-center">
				<div
					class="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border);
                        box-shadow: var(--shadow-md);
                    "
				>
					<span class="material-symbols-rounded" style="font-size:36px; color: var(--text-faint);">
						history
					</span>
				</div>
				<p class="text-[15px] font-black mb-1.5" style="color: var(--text-primary);">
					Belum ada riwayat
				</p>
				<p class="text-[12px] max-w-[220px]" style="color: var(--text-faint);">
					Anime yang kamu tonton akan muncul di sini lengkap dengan progress-nya
				</p>
				<a
					href="/"
					class="mt-6 h-11 px-6 flex items-center gap-2 rounded-[var(--radius-xl)] text-[12px] font-black text-white transition-all active:scale-[0.97]"
					style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
				>
					<span class="material-symbols-rounded" style="font-size:16px;">explore</span>
					Jelajahi anime
				</a>
			</div>
		{:else}
			<!-- ── GROUPED LIST ── -->
			<div class="space-y-7">
				{#each grouped() as [label, items]}
					<div>
						<!-- Group label -->
						<p
							class="text-[9px] font-black uppercase tracking-[0.2em] mb-2.5 px-1"
							style="color: var(--text-faint);"
						>
							{label}
						</p>

						<div class="space-y-2.5">
							{#each items as item (item.episodeId)}
								<!--
                                    History row card — iOS Podcast/YouTube style:
                                    [ thumbnail 16:9 ] [ info + progress ]  [ delete ]
                                    Removing: opacity fade + scale down
                                -->
								<div
									class="group flex items-stretch gap-3 p-2.5 rounded-[var(--radius-2xl)] transition-all duration-300"
									style="
                                        background: var(--surface);
                                        border: 1px solid var(--border);
                                        box-shadow: var(--shadow-sm);
                                        opacity: {removingId === item.episodeId ? '0.35' : '1'};
                                        transform: scale({removingId === item.episodeId
										? '0.97'
										: '1'});
                                        pointer-events: {removingId === item.episodeId
										? 'none'
										: 'auto'};
                                    "
								>
									<!-- Thumbnail 16:9 -->
									<a
										href="/anime/{item.animeSlug}/{item.episodeSlug}"
										class="relative shrink-0 rounded-[var(--radius-xl)] overflow-hidden"
										style="width: 120px; aspect-ratio: 16/9;"
									>
										<img
											src={item.animeThumbnail}
											alt={item.animeTitle}
											loading="lazy"
											class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
											style="background: var(--surface-offset);"
										/>

										<!--
                                            Progress bar overlay — bottom of thumbnail.
                                            Thin bar, accent color, rounded.
                                        -->
										<div
											class="absolute bottom-0 left-0 right-0 h-[3px]"
											style="background: oklch(0 0 0 / 0.3);"
										>
											<div
												class="h-full rounded-full transition-all duration-500"
												style="
                                                    width: {item.progressPct}%;
                                                    background: var(--accent);
                                                    box-shadow: 0 0 6px var(--accent-glow);
                                                "
											></div>
										</div>

										<!-- Play icon overlay on hover -->
										<div
											class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
											style="background: oklch(0 0 0 / 0.35);"
										>
											<div
												class="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm"
												style="background: oklch(1 0 0 / 0.2); border: 1.5px solid oklch(1 0 0 / 0.3);"
											>
												<span class="material-symbols-rounded text-white" style="font-size:20px;">
													play_arrow
												</span>
											</div>
										</div>

										<!-- Ep badge -->
										<div class="absolute top-1.5 left-1.5">
											<span
												class="px-1.5 py-0.5 rounded-md text-[8px] font-black text-white backdrop-blur-md"
												style="background: oklch(0 0 0 / 0.55); border: 1px solid oklch(1 0 0 / 0.1);"
											>
												Ep {item.episodeNumber}
											</span>
										</div>
									</a>

									<!-- Info -->
									<a
										href="/anime/{item.animeSlug}/{item.episodeSlug}"
										class="flex-1 min-w-0 flex flex-col justify-between py-0.5"
									>
										<div>
											<p
												class="text-[13px] font-black leading-tight line-clamp-2 mb-0.5"
												style="color: var(--text-primary);"
											>
												{item.animeTitle}
											</p>
											{#if item.episodeTitle}
												<p class="text-[10px] line-clamp-1" style="color: var(--text-faint);">
													{item.episodeTitle}
												</p>
											{/if}
										</div>

										<!-- Progress row -->
										<div>
											<div class="flex items-center justify-between mb-1">
												<span
													class="text-[9px] font-black tabular-nums"
													style="color: {item.progressPct >= 90
														? 'var(--success-text, #065f46)'
														: 'var(--accent)'};"
												>
													{#if item.progressPct >= 90}
														✓ Selesai
													{:else}
														{Math.round(item.progressPct)}% ditonton
													{/if}
												</span>
											</div>
											<div
												class="h-1 rounded-full overflow-hidden"
												style="background: var(--surface-offset);"
											>
												<div
													class="h-full rounded-full transition-all duration-500"
													style="
                                                        width: {item.progressPct}%;
                                                        background: {item.progressPct >= 90
														? 'var(--success-dot, #10b981)'
														: 'var(--accent)'};
                                                    "
												></div>
											</div>
										</div>
									</a>

									<!-- Delete button -->
									<button
										onclick={() => remove(item.episodeId)}
										aria-label="Hapus dari riwayat"
										class="self-start mt-0.5 w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 opacity-40 group-hover:opacity-100"
										style="color: var(--text-faint);"
									>
										<span class="material-symbols-rounded" style="font-size:16px;"> close </span>
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
