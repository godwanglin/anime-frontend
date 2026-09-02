<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import SEO from '$lib/components/SEO.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { saved } from '$lib/stores/saved.svelte';
	import { imageUrl } from '$lib/image-url';

	let removingId = $state<number | null>(null);

	async function unsave(animeId: number) {
		removingId = animeId;
		await saved.unsaveAnime(animeId);
		removingId = null;
	}
</script>

<SEO title="Tersimpan" noindex />

{#if !auth.isLoggedIn}
	<!-- ── NOT LOGGED IN ── -->
	<div class="flex flex-col items-center justify-center py-24 px-6 text-center">
		<div
			class="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
		>
			<AppIcon name="bookmark" style="font-size:28px; color: var(--accent);" />
		</div>
		<h1 class="text-[18px] font-black mb-1.5" style="color: var(--text-primary);">
			Login diperlukan
		</h1>
		<p class="text-[13px] mb-6 max-w-[240px]" style="color: var(--text-muted);">
			Simpan anime favoritmu dan akses dari mana saja.
		</p>
		<button
			onclick={() => goto('/login?redirect=/profile/saved')}
			class="h-12 px-8 rounded-[var(--radius-xl)] text-[13px] font-black text-white transition-all active:scale-[0.97]"
			style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
		>
			Masuk
		</button>
	</div>
{:else}
	<div class="max-w-5xl mx-auto pb-12">
		<!-- Page header -->
		<div class="flex items-end justify-between gap-4 mb-6">
			<div>
				<h1 class="text-[22px] font-black tracking-tight" style="color: var(--text-primary);">
					Tersimpan
				</h1>
				<p class="text-[12px] mt-0.5" style="color: var(--text-faint);">
					{saved.items.length} anime
				</p>
			</div>

			{#if saved.items.length > 0}
				<!-- Sort / filter pill (cosmetic placeholder — extensible) -->
				<div
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
				>
					<AppIcon name="grid_view" style="font-size:13px;" />
					Grid
				</div>
			{/if}
		</div>

		{#if saved.items.length === 0}
			<!-- Empty state -->
			<div class="flex flex-col items-center justify-center py-20 px-6 text-center">
				<div
					class="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
					style="
                        background: var(--surface);
                        border: 1px solid var(--border);
                        box-shadow: var(--shadow-md);
                    "
				>
					<AppIcon name="bookmarks" style="font-size:36px; color: var(--text-faint);" />
				</div>
				<p class="text-[15px] font-black mb-1.5" style="color: var(--text-primary);">
					Belum ada yang tersimpan
				</p>
				<p class="text-[12px] max-w-[220px]" style="color: var(--text-faint);">
					Tap ikon bookmark di halaman anime untuk menyimpannya di sini
				</p>
				<a
					href="/"
					class="mt-6 h-11 px-6 flex items-center gap-2 rounded-[var(--radius-xl)] text-[12px] font-black text-white transition-all active:scale-[0.97]"
					style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
				>
					<AppIcon name="explore" style="font-size:16px;" />
					Jelajahi anime
				</a>
			</div>
		{:else}
			<!-- ── CARD GRID ── -->
			<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
				{#each saved.items as item (item.animeId)}
					<!--
                        iOS-style card:
                        - Thumbnail full bleed, rounded-2xl
                        - Frosted glass info bar di bawah thumbnail (overlay)
                        - Lepas simpan: icon only di pojok kanan atas, frosted
                        - Removing state: opacity + scale down
                    -->
					<div
						class="group relative rounded-[var(--radius-2xl)] overflow-hidden transition-all duration-300"
						style="
                            background: var(--surface);
                            border: 1px solid var(--border);
                            box-shadow: var(--shadow-md);
                            opacity: {removingId === item.animeId ? '0.4' : '1'};
                            transform: scale({removingId === item.animeId ? '0.96' : '1'});
                            pointer-events: {removingId === item.animeId ? 'none' : 'auto'};
                        "
					>
						<!-- Thumbnail — full card, 2:3 ratio -->
						<a
							href="/anime/{item.animeSlug}"
							class="block relative aspect-[2/3] w-full overflow-hidden"
						>
							<img
								src={imageUrl(item.animeThumbnail)}
								alt={item.animeTitle}
								loading="lazy"
								class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
								style="background: var(--surface-offset);"
							/>

							<!-- Gradient overlay bawah untuk teks -->
							<div
								class="absolute inset-0"
								style="background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 70%);"
							></div>

							<!-- Status badge — top left, frosted -->
							<div class="absolute top-2 left-2">
								<span
									class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider backdrop-blur-md"
									style="
                                        background: {item.animeStatus === 'Ongoing'
										? 'oklch(0.5 0.18 160 / 0.3)'
										: 'oklch(0.3 0 0 / 0.4)'};
                                        border: 1px solid {item.animeStatus === 'Ongoing'
										? 'oklch(0.7 0.18 160 / 0.5)'
										: 'oklch(1 0 0 / 0.15)'};
                                        color: {item.animeStatus === 'Ongoing'
										? '#86efac'
										: 'rgba(255,255,255,0.6)'};
                                    "
								>
									{#if item.animeStatus === 'Ongoing'}
										<span class="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
									{/if}
									{item.animeStatus === 'Ongoing' ? 'Tayang' : 'Tamat'}
								</span>
							</div>

							<!-- Unsave button — top right, frosted, muncul saat hover -->
							<button
								onclick={(e) => {
									e.preventDefault();
									unsave(item.animeId);
								}}
								aria-label="Lepas simpan"
								class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-90"
								style="
                                    background: oklch(0 0 0 / 0.45);
                                    border: 1px solid oklch(1 0 0 / 0.15);
                                    color: white;
                                "
							>
								<AppIcon name="bookmark_remove" style="font-size:14px;" />
							</button>

							<!-- Info bar — frosted glass di bawah thumbnail, di dalam link -->
							<div class="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8">
								<p class="text-[11px] font-black leading-tight line-clamp-2 text-white">
									{item.animeTitle}
								</p>
							</div>
						</a>

						<!--
                            Mobile unsave — di luar overlay, di bawah card.
                            Hanya muncul di mobile (md:hidden) karena hover
                            tidak tersedia di touch device.
                        -->
						<button
							onclick={() => unsave(item.animeId)}
							class="md:hidden w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-all"
							style="
                                color: var(--text-faint);
                                border-top: 1px solid var(--border);
                            "
						>
							<AppIcon name="bookmark_remove" style="font-size:13px;" />
							Lepas simpan
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
