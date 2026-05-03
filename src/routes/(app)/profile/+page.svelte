<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import appConfig from '$lib/config';
	// import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import ProfileEffect from '$lib/components/ProfileEffect.svelte';
	import SEO from '$lib/components/SEO.svelte';
	// import config from '$lib/config';
	// import { getFrameTweak } from '$lib/decorations';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';
	import { saved } from '$lib/stores/saved.svelte';
	import { displayUserName, userInitial } from '$lib/user-display';

	const displayName = $derived(displayUserName(auth.user));
	const avatar = $derived(
		auth.user?.avatar ||
			`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=7c3aed`
	);
	const watchedHours = $derived(
		Math.round(history.items.reduce((total, item) => total + item.progressSec, 0) / 3600)
	);
	const userExp = $derived(Number(auth.user?.exp ?? 0));
	const userLevel = $derived(Math.max(1, Number(auth.user?.level ?? 1)));
	const userBadge = $derived(auth.user?.badge ?? getCultivationBadge(userLevel));
	const levelProgress = $derived(auth.user?.levelProgress ?? getLevelProgress(userExp, userLevel));
	const effects = $derived(auth.user?.effects ?? []);
	// const framePct = $derived(Math.round(frameTweak.scale * 100));
	// const frameOffsetX = $derived(frameTweak.offsetX ?? 0);
	// const frameOffsetY = $derived(frameTweak.offsetY ?? 0);

	// Pick a recent thumbnail for the blurred hero bg
	// const heroBg = $derived(
	// 	history.items[0]?.animeThumbnail || saved.items[0]?.animeThumbnail || null
	// );
	// console.log(heroBg);
	// console.log(auth.user);
</script>

<SEO title="Profil" noindex />

{#if !auth.isLoggedIn}
	<!-- ── NOT LOGGED IN ── -->
	<div class="flex flex-col items-center justify-center py-24 px-6 text-center">
		<div
			class="w-20 h-20 rounded-[var(--radius-2xl)] flex items-center justify-center mb-5"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2); box-shadow: var(--shadow-md);"
		>
			<AppIcon name="person" style="font-size:36px; color: var(--accent);" />
		</div>
		<h1 class="text-[20px] font-black mb-2" style="color: var(--text-primary);">Masuk ke akunmu</h1>
		<p class="text-[13px] mb-7 max-w-[260px] leading-relaxed" style="color: var(--text-muted);">
			Profil, riwayat tontonan, dan daftar tersimpan akan muncul di sini setelah kamu login.
		</p>
		<button
			onclick={() => goto('/login?redirect=/profile')}
			class="h-12 px-10 rounded-[var(--radius-xl)] text-[14px] font-black text-white transition-all active:scale-[0.97]"
			style="background: var(--accent); box-shadow: 0 6px 20px var(--accent-glow);"
		>
			Masuk
		</button>
	</div>
{:else}
	<div class="relative w-full max-w-full md:max-w-2xl mx-auto pb-16">
		{#if effects.length > 0}
			<div
				class="absolute inset-y-0 -left-4 -right-4 z-50 pointer-events-none overflow-hidden md:left-0 md:right-0"
				style="contain: layout paint style; transform: translateZ(0);"
			>
				{#each effects as effect}
					{#if effect.config.src}
						<ProfileEffect
							src={effect.config.src}
							// loop={effect.config.loop}
							duration={effect.config.duration}
							onFinishLoaded={(img) => {
								const fadeTimeoutId = setTimeout(
									() => {
										clearTimeout(fadeTimeoutId);
										img.style.transition = 'opacity 0.8s ease-out';
										img.style.opacity = '0';
										const removeTimeoutId = setTimeout(() => {
											clearTimeout(removeTimeoutId);
											img.remove();
										}, 800);
									},
									(effect.config.duration ?? 5000) > 5000 ? (effect.config.duration ?? 5000) : 5000
								);
							}}
						/>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- ══════════════════════════════════════
             HERO CARD — full bleed, blurred bg
        ══════════════════════════════════════ -->

		<div
			class="-mx-4 -mt-4 md:mx-0 md:mt-0 md:rounded-[var(--radius-2xl)] overflow-hidden mb-6 relative"
			style="min-height: 260px;"
		>
			<!-- Accent gradient overlay (always present, dims the bg) -->
			<div
				class="absolute inset-0"
				style="background: linear-gradient(135deg,
                    oklch(from var(--accent) 0.2 0.15 h / 0.85) 0%,
                    oklch(0.08 0.02 280 / 0.9) 60%,
                    oklch(0.06 0.01 180 / 0.95) 100%);"
			></div>
			<!-- Bottom fade to page bg -->
			<div
				class="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
				style="background: linear-gradient(to bottom, transparent, var(--page-bg, var(--surface)));"
			></div>

			<!-- Content -->
			<div class="relative z-10 px-5 pt-8 pb-7">
				<!-- Avatar + name -->
				<div class="flex items-end gap-4 mb-6">
					<!--
                        Avatar ring: double ring — inner white/10, outer accent/30.
                        Creates an iOS-style "selected" appearance.
                    -->
					<div class="relative shrink-0">
						<AvatarFrame
							src={avatar}
							alt={displayName}
							size={60}
							frame={{
								id: auth.user?.frame?.id as any,
								name: auth.user?.frame?.name as any,
								type: auth.user?.frame?.type as any,
								asset: auth.user?.frame?.asset as any,
								assetUrl: auth.user?.frame?.assetUrl as any,
								config: auth.user?.frame?.config as any
							}}
							fallbackInitial={userInitial(auth.user)}
						/>

						<!-- Online dot -->
						<div
							class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2"
							style="background: #22c55e; border-color: oklch(0.1 0.01 280);"
						></div>
					</div>

					<div class="min-w-0 flex-1 pb-1">
						<p
							class="text-[9px] font-black uppercase tracking-[0.22em] mb-1"
							style="color: oklch(1 0 0 / 0.4);"
						>
							Anime Watcher
						</p>
						<div class="mb-1 flex min-w-0 items-center gap-2">
							<h1 class="truncate text-[22px] font-black leading-none text-white md:text-[26px]">
								<NameTag
									name={displayName}
									nametag={auth.user?.nametag ?? null}
								/>
							</h1>
							{#if auth.user?.isVerified}
								<img
									src="/badges/verify.png"
									alt="Verified"
									class="h-5 w-5 shrink-0 object-contain"
								/>
							{/if}
						</div>
						<p class="text-[11px] truncate" style="color: oklch(1 0 0 / 0.45);">
							{auth.user?.email}
						</p>
					</div>

					<!-- Edit profile button -->
					<a
						href="/profile/settings"
						class="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black backdrop-blur-md transition-all active:scale-95 mb-1"
						style="
                            background: oklch(1 0 0 / 0.1);
                            border: 1px solid oklch(1 0 0 / 0.15);
                            color: oklch(1 0 0 / 0.7);
                        "
					>
						<AppIcon name="edit" style="font-size:12px;" />
						Edit
					</a>
				</div>

				<!-- Stats row — frosted glass pills -->
				<div
					class="mb-3 rounded-[var(--radius-xl)] p-3 backdrop-blur-md"
					style="background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.12);"
				>
					<div class="mb-2.5 flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="mb-1 flex items-center gap-2">
								<span
									class="relative inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-black text-white"
									style="background: {userBadge.color}; box-shadow: 0 8px 24px oklch(0 0 0 / 0.22);"
								>
									<AppIcon name="workspace_premium" style="font-size:12px;" />
									<span class="truncate">{userBadge.name}</span>
									<span class="badge-shine" aria-hidden="true"></span>
								</span>
							</div>
							<p class="text-[11px] font-semibold" style="color: oklch(1 0 0 / 0.58);">
								{userExp.toLocaleString('id-ID')} EXP
								<span style="color: oklch(1 0 0 / 0.35);">
									/ {levelProgress.nextLevelExp.toLocaleString('id-ID')} EXP
								</span>
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p
								class="text-[9px] font-black uppercase tracking-[0.18em]"
								style="color: oklch(1 0 0 / 0.42);"
							>
								Level
							</p>
							<p class="text-[28px] font-black leading-none text-white tabular-nums">{userLevel}</p>
						</div>
					</div>
					<div class="h-2 overflow-hidden rounded-full" style="background: oklch(0 0 0 / 0.28);">
						<div
							class="h-full rounded-full transition-all duration-700"
							style="width: {levelProgress.progress}%; background: linear-gradient(90deg, #8b5cf6, #d946ef, #a855f7); box-shadow: 0 0 18px oklch(from var(--accent) l c h / 0.55);"
						></div>
					</div>
					<div class="mt-2 flex items-center justify-between gap-3">
						<p class="text-[10px] font-semibold" style="color: oklch(1 0 0 / 0.45);">
							Sisa {levelProgress.remainingExp.toLocaleString('id-ID')} EXP ke level berikutnya
						</p>
						<a
							href="/exp"
							class="shrink-0 rounded-full px-3 py-1 text-[10px] font-black transition-all active:scale-95"
							style="background: oklch(1 0 0 / 0.12); color: white; border: 1px solid oklch(1 0 0 / 0.14);"
						>
							Cara mendapatkan EXP
						</a>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-2">
					{#each [{ label: 'Episode', value: history.items.length, icon: 'play_circle' }, { label: 'Jam nonton', value: watchedHours, icon: 'schedule' }, { label: 'Tersimpan', value: saved.items.length, icon: 'bookmark' }] as stat}
						<div
							class="flex flex-col items-center py-3 px-2 rounded-[var(--radius-xl)] backdrop-blur-md"
							style="
                                background: oklch(1 0 0 / 0.07);
                                border: 1px solid oklch(1 0 0 / 0.1);
                            "
						>
							<AppIcon name={stat.icon} class="mb-1"
								style="font-size:18px; color: oklch(from var(--accent) 0.8 0.12 h);" />
							<p class="text-[20px] font-black text-white leading-none tabular-nums">
								{stat.value}
							</p>
							<p class="text-[9px] font-semibold mt-0.5" style="color: oklch(1 0 0 / 0.45);">
								{stat.label}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		{#if appConfig.ENABLE_PREMIUM_FEATURE && !auth.isPremium}
			<a
				href="/premium?redirect=/profile"
				class="mb-6 flex items-center gap-3 rounded-[var(--radius-2xl)] p-4 transition-all active:scale-[0.99]"
				style="
					background:
						linear-gradient(135deg, oklch(from var(--accent) 0.32 0.18 h / 0.55), transparent 58%),
						linear-gradient(180deg, oklch(1 0 0 / 0.09), oklch(1 0 0 / 0.045));
					border: 1px solid oklch(from var(--accent) l c h / 0.28);
					box-shadow: var(--shadow-sm), inset 0 1px 0 oklch(1 0 0 / 0.08);
				"
			>
				<div
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-xl)]"
					style="background: oklch(1 0 0 / 0.12); border: 1px solid oklch(1 0 0 / 0.12);"
				>
					<AppIcon name="workspace_premium" style="font-size:24px; color: #facc15;" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="mb-1 flex flex-wrap items-center gap-2">
						<p class="text-[14px] font-black leading-tight" style="color: var(--text-primary);">
							Premium Rp5.000/bulan
						</p>
						<span
							class="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]"
							style="background: oklch(from var(--accent) l c h / 0.18); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.22);"
						>
							Upgrade
						</span>
					</div>
					<p class="text-[11px] font-semibold leading-relaxed" style="color: var(--text-muted);">
						Buka 1080p, bebas iklan, dan benefit premium lainnya.
					</p>
				</div>
				<AppIcon
					name="chevron_right"
					class="shrink-0"
					style="font-size:22px; color: var(--accent);"
				/>
			</a>
		{/if}

		<!-- ══════════════════════════════════════
             CONTINUE WATCHING — last 3 items
        ══════════════════════════════════════ -->
		{#if history.items.length > 0}
			<div class="mb-6 md:px-0">
				<div class="flex items-center justify-between mb-3">
					<p
						class="text-[9px] font-black uppercase tracking-[0.2em]"
						style="color: var(--text-faint);"
					>
						Lanjutkan menonton
					</p>
					<a
						href="/profile/history"
						class="text-[10px] font-black transition-colors"
						style="color: var(--accent);"
					>
						Lihat semua
					</a>
				</div>

				<div
					class="flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5"
					style="scrollbar-width: none;"
				>
					{#each history.items.slice(0, 5) as item (item.episodeId)}
						<a
							href="/anime/{item.animeSlug}/{item.episodeSlug}"
							class="relative shrink-0 rounded-[var(--radius-xl)] overflow-hidden group"
							style="width: 140px; aspect-ratio: 16/9;"
						>
							<img
								src={item.animeThumbnail}
								alt={item.animeTitle}
								loading="lazy"
								class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
								style="background: var(--surface-offset);"
							/>
							<!-- Gradient -->
							<div
								class="absolute inset-0"
								style="background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%);"
							></div>
							<!-- Progress bar -->
							<div
								class="absolute bottom-0 left-0 right-0 h-[3px]"
								style="background: oklch(0 0 0 / 0.4);"
							>
								<div
									class="h-full"
									style="width: {item.progressPct}%; background: var(--accent);"
								></div>
							</div>
							<!-- Ep label -->
							<p class="absolute bottom-2 left-2 text-[9px] font-black text-white leading-none">
								Ep {item.episodeNumber}
							</p>
							<!-- Play on hover -->
							<div
								class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
								style="background: oklch(0 0 0 / 0.3);"
							>
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm"
									style="background: oklch(1 0 0 / 0.2); border: 1px solid oklch(1 0 0 / 0.3);"
								>
									<AppIcon name="play_arrow" class="text-white" style="font-size:18px;" />
								</div>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ══════════════════════════════════════
             MENU LIST
        ══════════════════════════════════════ -->
		<div class="md:px-0 mb-6">
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em] mb-2.5"
				style="color: var(--text-faint);"
			>
				Menu
			</p>
			<div
				class="rounded-[var(--radius-2xl)] overflow-hidden"
				style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
			>
				{#each [{ href: '/profile/history', icon: 'history', label: 'Riwayat Menonton', desc: 'Lanjutkan episode terakhir', badge: history.items.length || null }, { href: '/profile/saved', icon: 'bookmark', label: 'Anime Tersimpan', desc: 'Daftar anime favoritmu', badge: saved.items.length || null }, { href: '/exp', icon: 'workspace_premium', label: 'Level & EXP', desc: 'Cara naik level dan badge kultivasi', badge: `Lv ${userLevel}` }, { href: '/decorations', icon: 'auto_awesome', label: 'Toko Dekorasi', desc: 'Buka & pasang frame dari level kamu', badge: null }, { href: '/profile/decorations', icon: 'backpack', label: 'Inventaris Dekorasi', desc: 'Frame yang sudah kamu miliki', badge: null }, { href: '/profile/preferences', icon: 'tune', label: 'Preferensi', desc: 'Tema, kualitas, volume, subtitle, notifikasi', badge: null }, { href: '/notifications', icon: 'notifications', label: 'Notifikasi', desc: 'Inbox personal masuk', badge: null }, { href: '/profile/settings', icon: 'manage_accounts', label: 'Pengaturan Akun', desc: 'Nama, avatar, password', badge: null }] as item, i}
					<a
						href={item.href}
						class="flex items-center gap-3 px-4 py-3.5 transition-colors"
						style="
                            border-bottom: {i < 7 ? '1px solid var(--border)' : 'none'};
                        "
					>
						<!-- Icon box -->
						<div
							class="w-9 h-9 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0"
							style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.15);"
						>
							<AppIcon name={item.icon} style="font-size:18px; color: var(--accent);" />
						</div>

						<div class="flex-1 min-w-0">
							<p class="text-[13px] font-black leading-tight" style="color: var(--text-primary);">
								{item.label}
							</p>
							<p class="text-[10px]" style="color: var(--text-faint);">
								{item.desc}
							</p>
						</div>

						<!-- Badge count -->
						{#if item.badge}
							<span
								class="px-2 py-0.5 rounded-full text-[9px] font-black"
								style="
                                    background: var(--accent-surface);
                                    color: var(--accent-text);
                                    border: 1px solid oklch(from var(--accent) l c h / 0.2);
                                "
							>
								{item.badge}
							</span>
						{/if}

						<AppIcon name="chevron_right" class="shrink-0"
							style="font-size:18px; color: var(--text-faint);" />
					</a>
				{/each}
			</div>
		</div>

		<!-- ══════════════════════════════════════
             LOGOUT
        ══════════════════════════════════════ -->
		<div class="md:px-0">
			<button
				onclick={async () => {
					await auth.logout();
					goto('/');
				}}
				class="w-full h-12 rounded-[var(--radius-xl)] flex items-center justify-center gap-2 text-[13px] font-black transition-all active:scale-[0.98]"
				style="
                    background: color-mix(in oklch, #ef4444 8%, var(--surface));
                    border: 1px solid color-mix(in oklch, #ef4444 20%, var(--border));
                    color: color-mix(in oklch, #ef4444 75%, var(--text-primary));
                    box-shadow: var(--shadow-sm);
                "
			>
				<AppIcon name="logout" style="font-size:18px;" />
				Keluar dari akun
			</button>
		</div>
	</div>
{/if}

<NavigationBottom />

<style>
	:global(.profile-hero-bg) {
		filter: blur(18px) brightness(0.35) saturate(150%);
	}

	.badge-shine {
		position: absolute;
		inset: -45% auto -45% -35%;
		width: 30%;
		transform: rotate(18deg);
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
		animation: badge-shine 3.4s ease-in-out infinite;
	}

	@media (min-width: 768px) {
		:global(.profile-hero-bg) {
			filter: blur(28px) brightness(0.35) saturate(160%);
		}
	}

	@media (hover: none), (prefers-reduced-motion: reduce) {
		.badge-shine {
			animation: none;
			opacity: 0.45;
		}
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
