<script lang="ts">
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import type { DecorationType } from '$lib/decorations';
	import { auth } from '$lib/stores/auth.svelte';
	import { decorations } from '$lib/stores/decorations.svelte';

	const userLevel = $derived(Math.max(1, Number(auth.user?.level ?? 0)));
	const userAvatar = $derived(
		auth.user?.avatar ||
			(auth.user
				? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.user.username)}&backgroundColor=7c3aed`
				: null)
	);

	let activeTab = $state<DecorationType>('frame');

	const items = $derived(decorations.shop.filter((item) => item.type === activeTab));
	const equippedId = $derived(decorations.equipped[activeTab]?.id ?? null);

	const unlockedCount = $derived(items.filter((item) => item.isUnlocked).length);
	const totalCount = $derived(items.length);

	$effect(() => {
		// Wait for the auth bootstrap (refresh + /me) before hitting the API,
		// otherwise the request goes out unauthenticated and every frame
		// comes back as locked. Re-runs when auth state flips.
		if (!auth.bootstrapped) return;
		decorations.fetchShop();
		if (auth.isLoggedIn) decorations.fetchOwned();
	});

	async function handleEquip(id: number) {
		if (decorations.isMutating) return;
		if (equippedId === id) {
			await decorations.unequip(activeTab);
		} else {
			await decorations.equip(id);
		}
	}

	const tabs: { type: DecorationType; label: string; icon: string }[] = [
		{ type: 'frame', label: 'Frame Border', icon: 'filter_frames' },
		{ type: 'nametag', label: 'NameTag', icon: 'badge' }
	];
</script>

<SEO title="Toko Dekorasi" description="Buka frame avatar dengan menaikkan level kamu" />

<div class="max-w-3xl mx-auto pb-16">
	<header class="mb-5">
		<p
			class="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5"
			style="color: var(--text-faint);"
		>
			Toko Dekorasi
		</p>
		<h1 class="text-[22px] font-black leading-tight" style="color: var(--text-primary);">
			Frame Avatar
		</h1>
		<p class="text-[12px] mt-1.5 leading-relaxed" style="color: var(--text-muted);">
			Naikkan level dengan menonton anime untuk membuka frame eksklusif. Frame yang dimiliki bisa
			dipasang di profil dan komentar.
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
					Level kamu
				</p>
				<p class="text-[18px] font-black leading-none" style="color: var(--text-primary);">
					<NameTag
						name={auth.user?.username ?? 'User'}
						nametag={decorations.nametag ?? auth.user?.nametag ?? null}
					/>
				</p>
				<p class="text-[11px] mt-1" style="color: var(--text-muted);">
					Lv {userLevel} - {unlockedCount} dari {totalCount}
					{activeTab === 'frame' ? 'frame' : 'nametag'} terbuka
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
				Login untuk membuka & memasang frame.
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
		class="mb-4 grid grid-cols-2 gap-2 rounded-[var(--radius-2xl)] p-1"
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
				{tab.label}
			</button>
		{/each}
	</div>

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
				{@const locked = !item.isUnlocked}
				{@const equipped = item.isEquipped}
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
						{:else}
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
						{/if}
					</div>

					<p class="text-[12px] font-black truncate mb-0.5" style="color: var(--text-primary);">
						{item.type === 'nametag' ? 'Preview Username' : item.name}
					</p>
					<p class="text-[10px]" style="color: var(--text-muted);">
						{locked ? `Buka di Lv ${item.requiredLevel}` : `Lv ${item.requiredLevel}`}
					</p>

					<div class="mt-3">
						{#if locked}
							<button
								type="button"
								disabled
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 cursor-not-allowed"
								style="background: var(--surface-offset); color: var(--text-faint); border: 1px solid var(--border);"
							>
								<span class="material-symbols-rounded" style="font-size:14px;">lock</span>
								Terkunci
							</button>
						{:else if !auth.isLoggedIn}
							<a
								href="/login?redirect=/decorations"
								class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 text-white"
								style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
							>
								Masuk untuk pakai
							</a>
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

					{#if locked}
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

<style>
	button {
		color: var(--text-muted);
	}

	.active-decoration-tab {
		background: var(--accent-surface);
		color: var(--accent-text);
		box-shadow: 0 4px 14px var(--accent-glow);
	}
</style>
