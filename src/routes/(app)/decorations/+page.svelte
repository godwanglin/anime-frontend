<script lang="ts">
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import {
		MAX_EQUIPPED_EFFECTS,
		getEffectSrc,
		type DecorationType,
		type EquippedEffect,
		type ShopDecoration
	} from '$lib/decorations';
	import { preloadEffects } from '$lib/effect-preloader';
	import { auth } from '$lib/stores/auth.svelte';
	import { decorations } from '$lib/stores/decorations.svelte';

	const userLevel = $derived(Math.max(1, Number(auth.user?.level ?? 0)));
	const userExp = $derived(Number(auth.user?.exp ?? 0));
	const userAvatar = $derived(
		auth.user?.avatar ||
			(auth.user
				? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.user.username)}&backgroundColor=7c3aed`
				: null)
	);

	let activeTab = $state<DecorationType>('frame');
	let preloadingEffects = $state(false);
	let previewEffect = $state<ShopDecoration | null>(null);
	let confirmingPurchase = $state<ShopDecoration | null>(null);

	const items = $derived(decorations.shop.filter((item) => item.type === activeTab));
	const equippedId = $derived(
		activeTab === 'effect' ? null : (decorations.equipped[activeTab]?.id ?? null)
	);
	const ownedCount = $derived(items.filter((item) => item.isOwned).length);
	const totalCount = $derived(items.length);
	const unlockedCount = $derived(items.filter((item) => item.isUnlocked).length);

	// Pre-fetch & decode semua asset effect supaya saat user buka tab Profile
	// Effect, grid render-nya halus (60fps). Kita fire & forget di background
	// segera setelah shop ter-load.
	$effect(() => {
		const effectSrcs = decorations.shop
			.filter((item) => item.type === 'effect')
			.map((item) => getEffectSrc(item))
			.filter((src): src is string => Boolean(src));
		if (effectSrcs.length === 0) {
			preloadingEffects = false;
			return;
		}
		preloadingEffects = true;
		void preloadEffects(effectSrcs).finally(() => {
			preloadingEffects = false;
		});
	});

	$effect(() => {
		if (!auth.bootstrapped) return;
		decorations.fetchShop();
		if (auth.isLoggedIn) decorations.fetchOwned();
	});

	async function handleEquip(id: number) {
		if (decorations.isMutating) return;
		const target = decorations.shop.find((item) => item.id === id);
		if (!target) return;
		if (target.type === 'effect') {
			if (target.isEquipped) {
				await decorations.unequipById(id);
			} else {
				await decorations.equip(id);
			}
		} else {
			if (equippedId === id) await decorations.unequip(target.type);
			else await decorations.equip(id);
		}
	}

	async function handlePurchase() {
		if (!confirmingPurchase) return;
		const target = confirmingPurchase;
		const result = await decorations.purchase(target.id);
		confirmingPurchase = null;
		if (result) {
			// Auto-equip kalau user mau (kita biarkan flow manual untuk effect — user
			// pilih sendiri di /profile/decorations atau klik "Pasang" di card).
		}
	}

	function startPreview(item: ShopDecoration) {
		previewEffect = item;
	}

	function closePreview() {
		previewEffect = null;
	}

	// User payload sintetik untuk ProfileCard saat preview — combine current user
	// data dengan target effect.
	const previewUser = $derived.by(() => {
		if (!previewEffect || !auth.user) return null;
		const synthetic: EquippedEffect = {
			id: previewEffect.id,
			name: previewEffect.name,
			type: 'effect',
			asset: previewEffect.asset,
			assetUrl: previewEffect.assetUrl,
			config: previewEffect.config
		};
		return {
			...auth.user,
			effects: [synthetic]
		};
	});

	const tabs: { type: DecorationType; label: string; icon: string }[] = [
		{ type: 'frame', label: 'Frame Border', icon: 'filter_frames' },
		{ type: 'nametag', label: 'NameTag', icon: 'badge' },
		{ type: 'effect', label: 'Profile Effect', icon: 'auto_awesome' }
	];

	function expRequirementText(item: ShopDecoration) {
		return `${item.priceExp.toLocaleString('id-ID')} EXP`;
	}
</script>

<SEO title="Toko Dekorasi" description="Buka frame, nametag & profile effect untuk profil kamu" />

<div class="max-w-3xl mx-auto pb-16">
	<header class="mb-5">
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5"
			style="color: var(--text-faint);"
		>
			Toko Dekorasi
		</p>
		<h1 class="text-[22px] font-black leading-tight" style="color: var(--text-primary);">
			{activeTab === 'frame'
				? 'Frame Avatar'
				: activeTab === 'nametag'
					? 'NameTag Spesial'
					: 'Profile Effect'}
		</h1>
		<p class="text-[12px] mt-1.5 leading-relaxed" style="color: var(--text-muted);">
			{#if activeTab === 'effect'}
				Tukar EXP yang sudah kamu kumpulkan dengan profile effect animasi. Bisa pasang sampai
				{MAX_EQUIPPED_EFFECTS} efek sekaligus di profil & komentar.
			{:else}
				Naikkan level dengan menonton anime untuk membuka frame & nametag eksklusif. Yang sudah
				dimiliki bisa dipasang di profil dan komentar.
			{/if}
		</p>
	</header>

	{#if auth.isLoggedIn}
		<div
			class="mb-5 flex items-center gap-3 p-3 rounded-[var(--radius-2xl)]"
			style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
		>
			<AvatarFrame
				src={userAvatar}
				alt={auth.user?.username ?? ''}
				size={56}
				frame={decorations.frame ?? auth.user?.frame ?? null}
				fallbackInitial={auth.user?.username?.[0]}
			/>
			<div class="flex-1 min-w-0">
				<p
					class="text-[10px] font-black uppercase tracking-[0.18em]"
					style="color: var(--text-faint);"
				>
					{activeTab === 'effect' ? 'Saldo EXP' : 'Level kamu'}
				</p>
				<p class="text-[18px] font-black leading-none truncate" style="color: var(--text-primary);">
					{#if activeTab === 'effect'}
						{userExp.toLocaleString('id-ID')} EXP
					{:else}
						<NameTag
							name={auth.user?.username ?? 'User'}
							nametag={decorations.nametag ?? auth.user?.nametag ?? null}
						/>
					{/if}
				</p>
				<p class="text-[11px] mt-1" style="color: var(--text-muted);">
					{#if activeTab === 'effect'}
						{ownedCount} dari {totalCount} efek dimiliki - max
						{MAX_EQUIPPED_EFFECTS} bisa dipasang
					{:else}
						Lv {userLevel} - {unlockedCount} dari {totalCount}
						{activeTab === 'frame' ? 'frame' : 'nametag'} terbuka
					{/if}
				</p>
			</div>
			<a
				href="/profile/decorations"
				class="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-black"
				style="background: var(--accent-surface); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.2);"
			>
				<span class="material-symbols-rounded" style="font-size: 14px;">backpack</span>
				Inventaris
			</a>
		</div>
	{:else}
		<div
			class="mb-5 p-4 rounded-[var(--radius-2xl)] text-center"
			style="background: var(--surface); border: 1px dashed var(--border-strong);"
		>
			<p class="text-[12px] font-bold mb-2" style="color: var(--text-primary);">
				Login untuk membuka & memasang dekorasi.
			</p>
			<a
				href="/login?redirect=/decorations"
				class="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-black text-white"
				style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
			>
				<span class="material-symbols-rounded" style="font-size:14px;">login</span>
				Masuk
			</a>
		</div>
	{/if}

	<div
		class="mb-4 grid grid-cols-3 gap-2 rounded-[var(--radius-2xl)] p-1"
		style="background: var(--surface); border: 1px solid var(--border);"
	>
		{#each tabs as tab (tab.type)}
			<button
				type="button"
				onclick={() => (activeTab = tab.type)}
				class="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-xl)] text-[11px] font-black transition"
				class:active-decoration-tab={activeTab === tab.type}
			>
				<span class="material-symbols-rounded" style="font-size:15px;">{tab.icon}</span>
				<span class="truncate">{tab.label}</span>
			</button>
		{/each}
	</div>

	{#if activeTab === 'effect' && preloadingEffects && items.length > 0}
		<div
			class="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold"
			style="background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);"
		>
			<span
				class="material-symbols-rounded animate-spin"
				style="font-size:14px; color: var(--accent-text);"
			>
				progress_activity
			</span>
			Mempersiapkan asset efek...
		</div>
	{/if}

	{#if decorations.isLoading && items.length === 0}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each Array(6) as _, i (i)}
				<div
					class="aspect-square rounded-[var(--radius-2xl)] animate-pulse"
					style="background: var(--surface-offset);"
				></div>
			{/each}
		</div>
	{:else if items.length === 0}
		<p class="text-center text-[13px] py-12" style="color: var(--text-faint);">
			Belum ada dekorasi tersedia.
		</p>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each items as item (item.id)}
				{@const isEffect = item.type === 'effect'}
				{@const owned = item.isOwned}
				{@const equipped = item.isEquipped}
				{@const lockedByLevel =
					!isEffect && item.priceExp <= 0 && !item.isUnlocked && userLevel < item.requiredLevel}
				{@const lockedByExp = isEffect && !owned && userExp < item.priceExp}
				<div
					class="relative rounded-[var(--radius-2xl)] overflow-hidden flex flex-col p-4 pt-8"
					style="
						background: var(--surface);
						border: 1px solid {equipped ? 'oklch(from var(--accent) l c h / 0.45)' : 'var(--border)'};
						box-shadow: {equipped ? '0 8px 24px var(--accent-glow)' : 'var(--shadow-sm)'};
					"
				>
					<div class="flex items-center justify-center mb-3">
						{#if item.type === 'frame'}
							<AvatarFrame
								src={userAvatar}
								alt={auth.user?.username ?? 'Avatar'}
								size={88}
								frame={{
									id: item.id,
									name: item.name,
									type: item.type,
									asset: item.asset,
									assetUrl: item.assetUrl,
									config: item.config
								}}
								fallbackInitial={auth.user?.username?.[0] ?? 'A'}
							/>
						{:else if item.type === 'nametag'}
							<div
								class="flex h-[88px] w-full items-center justify-center rounded-[var(--radius-xl)] px-3"
								style="background: var(--surface-offset); border: 1px solid var(--border);"
							>
								<NameTag
									name={auth.user?.username ?? 'Denis'}
									nametag={{
										id: item.id,
										name: item.name,
										type: item.type,
										asset: item.asset,
										assetUrl: item.assetUrl,
										config: item.config
									}}
									class="truncate text-[16px]"
								/>
							</div>
						{:else}
							<!-- Effect preview thumbnail: avatar + frame muted + tombol "play" overlay -->
							<button
								type="button"
								onclick={() => startPreview(item)}
								class="effect-thumb relative h-[88px] w-full rounded-[var(--radius-xl)] overflow-hidden flex items-center justify-center"
								style="background: linear-gradient(135deg, oklch(from var(--accent) 0.22 0.12 h / 0.7) 0%, oklch(0.1 0.02 280) 100%); border: 1px solid var(--border);"
								aria-label="Pratinjau efek {item.name}"
							>
								<span
									class="material-symbols-rounded"
									style="font-size: 38px; color: oklch(1 0 0 / 0.85); filter: drop-shadow(0 2px 6px oklch(0 0 0 / 0.5));"
								>
									play_circle
								</span>
								<span
									class="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
									style="background: oklch(0 0 0 / 0.6); color: oklch(1 0 0 / 0.9);"
								>
									<span class="material-symbols-rounded" style="font-size:10px;">visibility</span>
									Pratinjau
								</span>
							</button>
						{/if}
					</div>

					<p class="text-[12px] font-black truncate mb-0.5" style="color: var(--text-primary);">
						{item.type === 'nametag' ? 'Preview Username' : item.name}
					</p>
					<p class="text-[10px]" style="color: var(--text-muted);">
						{#if isEffect}
							{expRequirementText(item)}
						{:else if item.priceExp > 0}
							{expRequirementText(item)}
						{:else}
							{item.isUnlocked ? `Lv ${item.requiredLevel}` : `Buka di Lv ${item.requiredLevel}`}
						{/if}
					</p>

					<div class="mt-3">
						{#if !auth.isLoggedIn}
							<a
								href="/login?redirect=/decorations"
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 text-white"
								style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
							>
								Masuk untuk pakai
							</a>
						{:else if isEffect}
							{#if !owned}
								<button
									type="button"
									onclick={() => (confirmingPurchase = item)}
									disabled={decorations.isMutating || lockedByExp}
									class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
									style="background: {lockedByExp
										? 'var(--surface-offset)'
										: 'var(--accent)'}; color: {lockedByExp
										? 'var(--text-faint)'
										: '#fff'}; box-shadow: {lockedByExp
										? 'none'
										: '0 4px 12px var(--accent-glow)'};"
								>
									<span class="material-symbols-rounded" style="font-size:14px;">
										{lockedByExp ? 'lock' : 'shopping_bag'}
									</span>
									{lockedByExp ? 'EXP kurang' : 'Tukar EXP'}
								</button>
							{:else if equipped}
								<button
									type="button"
									onclick={() => handleEquip(item.id)}
									disabled={decorations.isMutating}
									class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
									style="background: var(--accent-surface); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.3);"
								>
									<span class="material-symbols-rounded" style="font-size:14px;">check_circle</span>
									Terpasang
								</button>
							{:else}
								<button
									type="button"
									onclick={() => handleEquip(item.id)}
									disabled={decorations.isMutating}
									class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
									style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
								>
									<span class="material-symbols-rounded" style="font-size:14px;">checkroom</span>
									Pasang
								</button>
							{/if}
						{:else if lockedByLevel}
							<button
								type="button"
								disabled
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 cursor-not-allowed"
								style="background: var(--surface-offset); color: var(--text-faint); border: 1px solid var(--border);"
							>
								<span class="material-symbols-rounded" style="font-size:14px;">lock</span>
								Terkunci
							</button>
						{:else if equipped}
							<button
								type="button"
								onclick={() => handleEquip(item.id)}
								disabled={decorations.isMutating}
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
								style="background: var(--accent-surface); color: var(--accent-text); border: 1px solid oklch(from var(--accent) l c h / 0.3);"
							>
								<span class="material-symbols-rounded" style="font-size:14px;">check_circle</span>
								Terpasang
							</button>
						{:else}
							<button
								type="button"
								onclick={() => handleEquip(item.id)}
								disabled={decorations.isMutating}
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
								style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
							>
								<span class="material-symbols-rounded" style="font-size:14px;">checkroom</span>
								Pasang
							</button>
						{/if}
					</div>

					{#if isEffect}
						<button
							type="button"
							onclick={() => startPreview(item)}
							class="mt-2 w-full h-8 rounded-full text-[10px] font-black inline-flex items-center justify-center gap-1.5"
							style="background: transparent; color: var(--text-muted); border: 1px solid var(--border);"
						>
							<span class="material-symbols-rounded" style="font-size:13px;">visibility</span>
							Pratinjau di profil
						</button>
					{/if}

					{#if lockedByLevel}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
							style="background: oklch(0 0 0 / 0.55); backdrop-filter: blur(2px);"
						>
							<span
								class="material-symbols-rounded mb-1"
								style="font-size: 28px; color: rgba(255,255,255,0.85);"
							>
								lock
							</span>
							<p class="text-[11px] font-black text-white">Buka di Lv {item.requiredLevel}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if decorations.error}
		<p
			class="mt-4 text-[12px] font-semibold text-center"
			style="color: color-mix(in oklch, #ef4444 70%, var(--text-primary));"
		>
			{decorations.error}
		</p>
	{/if}
</div>

<NavigationBottom />

<!-- Preview ProfileCard untuk efek yang dipilih -->
{#if previewUser && previewEffect}
	<ProfileCard user={previewUser as any} isOpen={true} onClose={closePreview} anchorEl={null} />
{/if}

<!-- Konfirmasi pembelian dengan EXP -->
{#if confirmingPurchase}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-4"
		style="background: oklch(0 0 0 / 0.6);"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-sm rounded-[var(--radius-2xl)] overflow-hidden"
			style="background: var(--surface); border: 1px solid var(--border-strong); box-shadow: 0 24px 64px oklch(0 0 0 / 0.5);"
		>
			<div class="p-5">
				<p class="text-[18px] font-black mb-1.5" style="color: var(--text-primary);">Tukar EXP?</p>
				<p class="text-[12px] mb-3 leading-relaxed" style="color: var(--text-muted);">
					Tukarkan
					<span class="font-black" style="color: var(--text-primary);">
						{confirmingPurchase.priceExp.toLocaleString('id-ID')} EXP
					</span>
					untuk mendapatkan
					<span class="font-black" style="color: var(--text-primary);"
						>{confirmingPurchase.name}</span
					>?
				</p>
				<p class="text-[11px] mb-4" style="color: var(--text-faint);">
					EXP kamu akan berkurang dan level menyesuaikan otomatis. Saldo: {userExp.toLocaleString(
						'id-ID'
					)} EXP.
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (confirmingPurchase = null)}
						disabled={decorations.isMutating}
						class="flex-1 h-10 rounded-full text-[12px] font-black"
						style="background: var(--surface-offset); color: var(--text-muted); border: 1px solid var(--border);"
					>
						Batal
					</button>
					<button
						type="button"
						onclick={handlePurchase}
						disabled={decorations.isMutating}
						class="flex-1 h-10 rounded-full text-[12px] font-black text-white disabled:opacity-60"
						style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
					>
						{decorations.isMutating ? 'Memproses...' : 'Tukar Sekarang'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	button {
		color: var(--text-muted);
	}

	.active-decoration-tab {
		background: var(--accent-surface);
		color: var(--accent-text);
		box-shadow: 0 4px 14px var(--accent-glow);
	}

	.effect-thumb {
		contain: layout paint style;
		transition: transform 160ms ease;
	}
	.effect-thumb:hover,
	.effect-thumb:focus-visible {
		transform: translateY(-1px) scale(1.01);
	}
</style>
