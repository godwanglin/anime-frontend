<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut, quintOut } from 'svelte/easing';
	import type { PublicUser } from '$lib/stores/auth.svelte';
	import { getEffectSrc, getEffectLoop, getEffectDuration } from '$lib/decorations';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import AvatarFrame from './AvatarFrame.svelte';
	import NameTag from './NameTag.svelte';
	import ProfileEffect from './ProfileEffect.svelte';

	const {
		user,
		isOpen,
		onClose,
		anchorEl = null
	}: {
		user: PublicUser;
		isOpen: boolean;
		onClose?: () => void;
		anchorEl?: HTMLElement | null;
	} = $props();

	let isMobile = $state(false);
	let popoverStyle = $state('');
	let popoverEl = $state<HTMLDivElement | null>(null);
	let placement = $state<'right' | 'left' | 'bottom' | 'top'>('right');
	let repositionTick = $state(0);

	// Deteksi mobile / desktop
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	// Reposisi saat scroll / resize — di-throttle ke rAF supaya tidak fire setiap event
	$effect(() => {
		if (!isOpen || isMobile) return;
		let rafId: number | null = null;
		const handler = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				repositionTick++;
			});
		};
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	// Hitung posisi popover + auto flip
	$effect(() => {
		void repositionTick;
		void popoverEl;

		if (!isOpen || isMobile) return;
		if (!anchorEl) {
			popoverStyle = 'top: 64px; right: 16px;';
			placement = 'bottom';
			return;
		}

		const rect = anchorEl.getBoundingClientRect();
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const w = popoverEl?.offsetWidth || 360;
		const h = popoverEl?.offsetHeight || 420;

		const spaceRight = vw - rect.right;
		const spaceLeft = rect.left;
		const spaceBelow = vh - rect.bottom;
		const spaceAbove = rect.top;

		let left: number;
		let top: number;
		let nextPlacement: typeof placement;

		if (spaceRight >= w + margin) {
			left = rect.right + margin;
			top = clamp(rect.top, margin, vh - h - margin);
			nextPlacement = 'right';
		} else if (spaceLeft >= w + margin) {
			left = rect.left - w - margin;
			top = clamp(rect.top, margin, vh - h - margin);
			nextPlacement = 'left';
		} else if (spaceBelow >= h + margin) {
			top = rect.bottom + margin;
			left = clamp(rect.left + rect.width / 2 - w / 2, margin, vw - w - margin);
			nextPlacement = 'bottom';
		} else if (spaceAbove >= h + margin) {
			top = rect.top - h - margin;
			left = clamp(rect.left + rect.width / 2 - w / 2, margin, vw - w - margin);
			nextPlacement = 'top';
		} else {
			left = clamp(rect.right + margin, margin, vw - w - margin);
			top = clamp(rect.top, margin, vh - h - margin);
			nextPlacement = spaceRight >= spaceLeft ? 'right' : 'left';
		}

		popoverStyle = `top: ${top}px; left: ${left}px;`;
		placement = nextPlacement;
	});

	function clamp(v: number, min: number, max: number) {
		return Math.max(min, Math.min(max, v));
	}

	const transformOrigin = $derived(
		placement === 'right'
			? 'top left'
			: placement === 'left'
				? 'top right'
				: placement === 'bottom'
					? 'top center'
					: 'bottom center'
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose?.();
	}

	function popoverTransition(node: HTMLElement) {
		const origin = transformOrigin;
		const offsetY = placement === 'top' ? 12 : -12;
		return {
			duration: 280,
			css: (t: number) => {
				const eased = cubicOut(t);
				return `
                    opacity: ${eased};
                    transform: scale(${0.88 + 0.12 * eased}) translateY(${(1 - eased) * offsetY}px);
                    transform-origin: ${origin};
                `;
			}
		};
	}

	function sheetTransition(node: HTMLElement) {
		return {
			duration: 500,
			css: (t: number) => {
				const eased = quintOut(t);
				return `transform: translateY(${(1 - eased) * 110}%);`;
			}
		};
	}

	// Profile effects diambil langsung dari user data (dari backend), bukan
	// hardcoded. Helper getEffectSrc/Loop/Duration handle struktur EquippedEffect.
	type ResolvedEffect = { id: number; src: string; loop: boolean; duration?: number };
	const profileEffects = $derived(
		(user?.effects ?? []).flatMap((effect): ResolvedEffect[] => {
			const src = getEffectSrc(effect);
			if (!src) return [];
			return [
				{
					id: effect.id,
					src,
					loop: getEffectLoop(effect),
					duration: getEffectDuration(effect)
				}
			];
		})
	);

	const userExp = $derived(Math.max(0, Number(user?.exp ?? 0)));
	const userLevel = $derived(Math.max(1, Number(user?.level ?? 1)));
	const profileBadge = $derived(user?.badge ?? getCultivationBadge(userLevel));
	const levelProgress = $derived(user?.levelProgress ?? getLevelProgress(userExp, userLevel));
	const profileStats = $derived({
		episodeCount: Math.max(0, Number(user?.profileStats?.episodeCount ?? 0)),
		watchHours: Math.max(
			0,
			Number(
				user?.profileStats?.watchHours ??
					Math.floor(Number(user?.profileStats?.watchSeconds ?? 0) / 3600)
			)
		),
		savedCount: Math.max(0, Number(user?.profileStats?.savedCount ?? 0))
	});
	const statItems = $derived([
		{ label: 'Episode', value: profileStats.episodeCount, icon: 'play_circle' },
		{ label: 'Jam nonton', value: profileStats.watchHours, icon: 'schedule' },
		{ label: 'Tersimpan', value: profileStats.savedCount, icon: 'bookmark' }
	]);

	function formatNumber(value: number) {
		return value.toLocaleString('id-ID');
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-40"
		style="background: oklch(0 0 0 / {isMobile ? '0.6' : '0.35'});"
		onclick={onClose}
		role="button"
		tabindex="-1"
		aria-label="Tutup"
		transition:fade={{ duration: 220 }}
	></button>

	{#if isMobile}
		<!-- Bottom sheet -->
		<div
			class="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] overflow-hidden"
			style="background: var(--page-bg, var(--surface)); max-height: 92dvh; overflow-y: auto;"
			transition:sheetTransition
		>
			<div
				class="sticky top-0 flex justify-center pt-3 pb-2 z-10"
				style="background: var(--page-bg, var(--surface));"
			>
				<div class="w-10 h-[5px] rounded-full" style="background: oklch(0.5 0 0 / 0.3);"></div>
			</div>

			<!-- Container efek + konten -->
			<div class="relative overflow-hidden" style="min-height: 260px;">
				{@render profileEffectOverlay()}
				{@render gradientBackground()}
				<div class="relative z-10 px-5 pt-8 pb-8">
					{@render cardContent()}
				</div>
			</div>
		</div>
	{:else}
		<!-- Popover desktop -->
		<div
			bind:this={popoverEl}
			class="fixed z-50 w-[360px] rounded-[var(--radius-2xl)] overflow-hidden shadow-2xl"
			style="
				{popoverStyle}
				box-shadow: 0 24px 64px oklch(0 0 0 / 0.45), 0 0 0 1px oklch(1 0 0 / 0.07);
				contain: layout paint style;
				will-change: transform;
				transform: translateZ(0);
			"
			transition:popoverTransition
		>
			<!-- Container efek + konten -->
			<div class="relative overflow-hidden" style="min-height: 260px;">
				{@render profileEffectOverlay()}
				{@render gradientBackground()}
				<div class="relative z-10 px-5 pt-8 pb-7">
					{@render cardContent()}
				</div>
			</div>
		</div>
	{/if}
{/if}

{#snippet profileEffectOverlay()}
	<!-- Overlay efek ala Discord: tidak ganggu click.
	     z-50 wajib di sini — `contain: paint` + `transform` bikin stacking context baru,
	     jadi z-index dari .effect-layer di dalam tidak bisa "tembus" ke atas cardContent (z-10). -->
	<div
		class="absolute inset-0 pointer-events-none z-50"
		style="contain: layout paint style; transform: translateZ(0);"
	>
		{#each profileEffects as effect}
			<ProfileEffect src={effect.src} loop={effect.loop} duration={effect.duration} />
		{/each}
		<!-- <ProfileEffect
			src="https://cdn.discordapp.com/assets/content/3507e936802583b79c956d08db8babd92b183f7006a28457aba9f778910e7201"
		/> -->
		<!-- <ProfileEffect
			src="https://cdn.discordapp.com/assets/content/05a494f1ee6675d460c9b8e98b1cfd1d6405b0b7cab6a11b421143d165e853b1"
			loop
		/>
		<ProfileEffect
			src="https://cdn.discordapp.com/assets/content/6898a8357b824710c262b697192bc8240eb9280b5c2e2d86ed1f8401bd78cee9"
			loop
		/> -->
	</div>
{/snippet}

{#snippet gradientBackground()}
	<div
		class="absolute inset-0 pointer-events-none"
		style="background: linear-gradient(135deg,
            oklch(from var(--accent) 0.2 0.15 h / 0.85) 0%,
            oklch(0.08 0.02 280 / 0.9) 60%,
            oklch(0.06 0.01 180 / 0.95) 100%);"
	></div>
	<div
		class="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
		style="background: linear-gradient(to bottom, transparent, var(--page-bg, var(--surface)));"
	></div>
{/snippet}

{#snippet userBadge()}
	<div class="mb-1 flex items-center gap-2">
		<span
			class="relative inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-[10px] font-black text-white"
			style="background: {profileBadge.color}; box-shadow: 0 8px 24px oklch(0 0 0 / 0.22);"
		>
			<span class="material-symbols-rounded" style="font-size:12px;">workspace_premium</span>
			<span class="truncate">{profileBadge.name}</span>
			<span class="badge-shine" aria-hidden="true"></span>
		</span>
	</div>
{/snippet}

{#snippet cardContent()}
	<div class="flex items-center gap-4 mb-6">
		<div class="relative shrink-0">
			<AvatarFrame
				src={user.avatar}
				alt={user.username ?? 'Avatar'}
				size={60}
				frame={{
					id: user.frame?.id as any,
					name: user.frame?.name as any,
					type: user.frame?.type as any,
					asset: user.frame?.asset as any,
					assetUrl: user.frame?.assetUrl as any,
					config: user.frame?.config as any
				}}
				fallbackInitial={user.username?.[0] ?? 'A'}
			/>
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
				<h1 class="truncate text-[22px] font-black leading-none text-white">
					<NameTag name={user.username ?? 'User'} nametag={user.nametag ?? null} />
				</h1>
				{#if user.isVerified}
					<img src="/badges/verify.png" alt="Verified" class="h-5 w-5 shrink-0 object-contain" />
				{/if}
			</div>
		</div>
	</div>

	<div
		class="mb-3 rounded-[var(--radius-xl)] p-3 backdrop-blur-md"
		style="background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.12);"
	>
		<div class="mb-2.5 flex items-center justify-between gap-3">
			<div class="min-w-0">
				{@render userBadge()}
				<p class="text-[11px] font-semibold" style="color: oklch(1 0 0 / 0.58);">
					{formatNumber(userExp)} EXP
					<span style="color: oklch(1 0 0 / 0.35);">
						/ {formatNumber(levelProgress.nextLevelExp)} EXP
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
				style="
                    width: {levelProgress.progress}%;
                    background: linear-gradient(90deg, #8b5cf6, #d946ef, #a855f7);
                    box-shadow: 0 0 18px oklch(from var(--accent) l c h / 0.55);
                "
			></div>
		</div>

		<div class="mt-2 flex items-center justify-between gap-3">
			<p class="text-[10px] font-semibold" style="color: oklch(1 0 0 / 0.45);">
				Sisa {formatNumber(levelProgress.remainingExp)} EXP ke level berikutnya
			</p>
		</div>
	</div>

	<div class="grid grid-cols-3 gap-2">
		{#each statItems as stat}
			<div
				class="flex flex-col items-center py-3 px-2 rounded-[var(--radius-xl)] backdrop-blur-md"
				style="background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.1);"
			>
				<span
					class="material-symbols-rounded mb-1"
					style="font-size:18px; color: oklch(from var(--accent) 0.8 0.12 h);"
				>
					{stat.icon}
				</span>
				<p class="text-[20px] font-black text-white leading-none tabular-nums">
					{formatNumber(stat.value)}
				</p>
				<p class="text-[9px] font-semibold mt-0.5" style="color: oklch(1 0 0 / 0.45);">
					{stat.label}
				</p>
			</div>
		{/each}
	</div>
{/snippet}
