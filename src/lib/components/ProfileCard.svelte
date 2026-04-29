<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut, quintOut } from 'svelte/easing';
	import { auth, type PublicUser } from '$lib/stores/auth.svelte';
	import { getEffectSrc, getEffectLoop, getEffectDuration } from '$lib/decorations';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import AvatarFrame from './AvatarFrame.svelte';
	import NameTag from './NameTag.svelte';
	import ProfileEffect from './ProfileEffect.svelte';
	import { displayUserName, userInitial } from '$lib/user-display';

	const {
		user,
		isOpen,
		onClose,
		anchorEl = null,
		allowLoop = false
	}: {
		user: PublicUser;
		isOpen: boolean;
		onClose?: () => void;
		allowLoop?: boolean;
		anchorEl?: HTMLElement | null;
	} = $props();

	let isMobile = $state(false);
	let popoverStyle = $state('');
	let popoverEl = $state<HTMLDivElement | null>(null);
	let sheetEl = $state<HTMLDivElement | null>(null);
	let placement = $state<'right' | 'left' | 'bottom' | 'top'>('right');
	let repositionTick = $state(0);
	let isDraggingSheet = $state(false);

	let sheetDragOffset = 0;
	let pendingSheetDragOffset = 0;
	let sheetDragFrame: number | null = null;
	let sheetDragPointerId: number | null = null;
	let sheetDragStartY = 0;
	let sheetDragLastY = 0;
	let sheetDragLastAt = 0;
	let sheetDragVelocity = 0;
	let sheetResetTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

	$effect(() => {
		if (isOpen) {
			clearSheetResetTimer();
			resetSheetDrag();
		}
	});

	$effect(() => {
		return () => {
			clearSheetResetTimer();
			if (sheetDragFrame !== null) cancelAnimationFrame(sheetDragFrame);
		};
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

	async function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			resetSheetDrag();
			onClose?.();
			// profileEffects = await assetLoader(baseProfileEffects);
		}
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
			duration: 320,
			css: (t: number) => {
				const eased = quintOut(t);
				return `
					opacity: ${Math.max(0.001, eased)};
					transform: translate3d(0, ${(1 - eased) * 108}%, 0);
				`;
			}
		};
	}

	function clearSheetResetTimer() {
		if (sheetResetTimeoutId !== null) {
			clearTimeout(sheetResetTimeoutId);
			sheetResetTimeoutId = null;
		}
	}

	function setSheetDragOffset(nextOffset: number) {
		sheetDragOffset = nextOffset;
		pendingSheetDragOffset = nextOffset;

		if (sheetDragFrame !== null) return;
		sheetDragFrame = requestAnimationFrame(() => {
			sheetDragFrame = null;
			sheetEl?.style.setProperty('--sheet-drag-y', `${pendingSheetDragOffset}px`);
		});
	}

	function resetSheetDrag() {
		if (sheetDragFrame !== null) {
			cancelAnimationFrame(sheetDragFrame);
			sheetDragFrame = null;
		}
		sheetDragPointerId = null;
		sheetDragStartY = 0;
		sheetDragLastY = 0;
		sheetDragLastAt = 0;
		sheetDragVelocity = 0;
		sheetDragOffset = 0;
		pendingSheetDragOffset = 0;
		isDraggingSheet = false;
		sheetEl?.style.setProperty('--sheet-drag-y', '0px');
	}

	function resetSheetDragAfterClose() {
		clearSheetResetTimer();
		sheetResetTimeoutId = setTimeout(() => {
			sheetResetTimeoutId = null;
			resetSheetDrag();
		}, 340);
	}

	function handleSheetPointerDown(event: PointerEvent) {
		if (!isMobile || event.button !== 0) return;
		clearSheetResetTimer();

		const target = event.target as HTMLElement | null;
		const fromHandle = Boolean(target?.closest('[data-sheet-drag-handle]'));
		if (!fromHandle && (sheetEl?.scrollTop ?? 0) > 0) return;

		if (sheetDragFrame !== null) {
			cancelAnimationFrame(sheetDragFrame);
			sheetDragFrame = null;
		}

		sheetDragPointerId = event.pointerId;
		sheetDragStartY = event.clientY;
		sheetDragLastY = event.clientY;
		sheetDragLastAt = performance.now();
		sheetDragVelocity = 0;
		sheetEl?.setPointerCapture(event.pointerId);
	}

	function handleSheetPointerMove(event: PointerEvent) {
		if (sheetDragPointerId !== event.pointerId) return;

		const now = performance.now();
		const elapsed = Math.max(1, now - sheetDragLastAt);
		const deltaY = event.clientY - sheetDragStartY;
		const nextOffset = Math.max(0, deltaY);

		sheetDragVelocity = (event.clientY - sheetDragLastY) / elapsed;
		sheetDragLastY = event.clientY;
		sheetDragLastAt = now;

		if (nextOffset < 6) return;
		if ((sheetEl?.scrollTop ?? 0) > 0 && !isDraggingSheet) return;

		if (event.cancelable) event.preventDefault();
		isDraggingSheet = true;
		setSheetDragOffset(nextOffset * 0.82);
	}

	function handleSheetPointerEnd(event: PointerEvent) {
		if (sheetDragPointerId !== event.pointerId) return;

		if (sheetEl?.hasPointerCapture(event.pointerId)) {
			sheetEl.releasePointerCapture(event.pointerId);
		}
		const closeDistance = Math.min(150, window.innerHeight * 0.2);
		const shouldClose = sheetDragOffset > closeDistance || sheetDragVelocity > 0.75;

		if (shouldClose && onClose) {
			onClose?.();
			resetSheetDragAfterClose();
			return;
		}

		resetSheetDrag();
	}

	function handleSheetPointerCancel(event: PointerEvent) {
		if (sheetDragPointerId !== event.pointerId) return;
		resetSheetDrag();
	}

	// Profile effects diambil langsung dari user data (dari backend), bukan
	// hardcoded. Helper getEffectSrc/Loop/Duration handle struktur EquippedEffect.
	type ResolvedEffect = {
		id: number;
		src: string;
		loop: boolean;
		duration?: number;
		blob?: string;
	};

	let profileEffects = $derived(
		(user?.effects ?? []).flatMap((effect): ResolvedEffect[] => {
			const src = getEffectSrc(effect);
			if (!src) return [];

			return [
				{
					id: effect.id,
					src,
					blob: effect.config?.blob,
					loop: getEffectLoop(effect),
					duration: getEffectDuration(effect)
				}
			];
		})
	);

	// let profileEffects = $state<ResolvedEffect[]>([]);

	// onMount(async () => {
	// 	profileEffects = await assetLoader(baseProfileEffects);
	// });

	// console.log('Efekk', user?.effects);

	const userExp = $derived(Math.max(0, Number(user?.exp ?? 0)));
	const userLevel = $derived(Math.max(1, Number(user?.level ?? 1)));
	const profileBadge = $derived(user?.badge ?? getCultivationBadge(userLevel));
	const levelProgress = $derived(user?.levelProgress ?? getLevelProgress(userExp, userLevel));
	const profileTitle = $derived(
		user?.username?.toLowerCase() === 'weebinai' ? 'Weebin Assistant' : 'Anime Watcher'
	);
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
		onclick={async () => {
			resetSheetDrag();
			onClose?.();
			// profileEffects = await assetLoader(baseProfileEffects);
		}}
		tabindex="-1"
		aria-label="Tutup"
		transition:fade={{ duration: 220 }}
	></button>

	{#if isMobile}
		<!-- Bottom sheet -->
		<div class="mobile-sheet-shell fixed bottom-0 left-0 right-0 z-50" transition:sheetTransition>
			<div
				bind:this={sheetEl}
				class="mobile-sheet rounded-t-[28px] overflow-hidden"
				class:sheet-dragging={isDraggingSheet}
				style="max-height: 92dvh; overflow-y: auto;"
				role="dialog"
				aria-modal="true"
				aria-label="Profil pengguna"
				tabindex="-1"
				onpointerdown={handleSheetPointerDown}
				onpointermove={handleSheetPointerMove}
				onpointerup={handleSheetPointerEnd}
				onpointercancel={handleSheetPointerCancel}
			>
				<!-- Container efek + konten -->
				<div class="relative overflow-hidden" style="min-height: 260px;">
					{@render profileEffectOverlay()}
					{@render gradientBackground()}
					<div class="relative z-10 px-5 pb-8 pt-5">
						{@render cardContent()}
					</div>
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
		class="absolute inset-0 pointer-events-none z-50 overflow-hidden"
		style="contain: layout paint style; transform: translateZ(0);"
	>
		{#each profileEffects as effect}
			<ProfileEffect
				src={effect.src}
				loop={allowLoop}
				duration={10000}
				blob={effect.blob}
				class="pc-effect-fill"
			/>
		{/each}
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
	{#if isMobile}
		<div
			data-sheet-drag-handle
			class="mobile-sheet-header sticky top-0 z-[80] flex justify-center"
			aria-hidden="true"
		>
			<div class="h-1.5 w-11 rounded-full bg-white/30 shadow-sm shadow-black/20"></div>
		</div>
	{/if}

	<div class="flex items-center gap-4 mb-6 mt-8">
		<div class="relative shrink-0">
			{#if auth.user?.id !== user?.id}
				<a href="/profile/@{user?.username?.replaceAll(' ', '')}-{user?.exp}-{user?.id}">
					<AvatarFrame
						src={user.avatar}
						alt={displayUserName(user, 'Avatar')}
						size={60}
						frame={{
							id: user.frame?.id as any,
							name: user.frame?.name as any,
							type: user.frame?.type as any,
							asset: user.frame?.asset as any,
							assetUrl: user.frame?.assetUrl as any,
							config: user.frame?.config as any
						}}
						fallbackInitial={userInitial(user)}
					/>
				</a>
			{:else}
				<AvatarFrame
					src={user.avatar}
					alt={displayUserName(user, 'Avatar')}
					size={60}
					frame={{
						id: user.frame?.id as any,
						name: user.frame?.name as any,
						type: user.frame?.type as any,
						asset: user.frame?.asset as any,
						assetUrl: user.frame?.assetUrl as any,
						config: user.frame?.config as any
					}}
					fallbackInitial={userInitial(user)}
				/>
			{/if}
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
				{profileTitle}
			</p>
			<div class="mb-1 flex min-w-0 items-center gap-2">
				<h1 class="truncate text-[22px] font-black leading-none text-white">
					<NameTag name={displayUserName(user)} nametag={user.nametag ?? null} />
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

<style>
	.mobile-sheet-shell {
		contain: layout paint style;
		will-change: transform, opacity;
		backface-visibility: hidden;
	}

	.mobile-sheet {
		--sheet-drag-y: 0px;
		background: oklch(0.06 0.01 180);
		box-shadow:
			0 -28px 80px oklch(0 0 0 / 0.48),
			0 0 0 1px oklch(1 0 0 / 0.08);
		overscroll-behavior: contain;
		transform: translate3d(0, var(--sheet-drag-y), 0);
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform;
		backface-visibility: hidden;
		touch-action: pan-y;
	}

	.mobile-sheet.sheet-dragging {
		transition: none;
		cursor: grabbing;
	}

	.mobile-sheet [data-sheet-drag-handle] {
		touch-action: none;
	}

	.mobile-sheet-header {
		position: sticky;
	}

	.mobile-sheet-header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -18px;
		height: 18px;
		pointer-events: none;
	}

	/* Override default ProfileEffect mobile rule (yang force `width: 100vw` +
	   `object-fit: contain` untuk halaman patternUser). Di ProfileCard kita
	   pengen efek mengisi penuh lebar card, bukan dipotong ke ukuran viewport
	   atau dikecilkan oleh aspect-ratio image. */
	:global(.pc-effect-fill.effect-layer) {
		left: 0 !important;
		right: 0 !important;
		width: 100% !important;
		transform: translateZ(0) !important;
	}
	:global(.pc-effect-fill .effect-img) {
		object-fit: cover !important;
		object-position: top center !important;
	}
</style>
