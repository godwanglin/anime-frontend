<script lang="ts">
	import { goto } from '$app/navigation';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import type { DecorationType } from '$lib/decorations';
	import { auth } from '$lib/stores/auth.svelte';
	import { decorations } from '$lib/stores/decorations.svelte';

	const userAvatar = $derived(
		auth.user?.avatar ||
			(auth.user
				? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(auth.user.username)}&backgroundColor=7c3aed`
				: null)
	);
	let activeTab = $state<DecorationType>('frame');

	const equippedId = $derived(decorations.equipped[activeTab]?.id ?? null);
	const items = $derived(decorations.owned.filter((item) => item.type === activeTab));

	let redirected = $state(false);

	$effect(() => {
		// Defer the login redirect until auth has finished its refresh + /me
		// cycle — otherwise reloading lands here while accessToken is still
		// null and we bounce to /login despite a valid session.
		if (!auth.bootstrapped) return;
		if (!auth.isLoggedIn) {
			if (!redirected) {
				redirected = true;
				goto('/login?redirect=/profile/decorations');
			}
			return;
		}
		decorations.fetchOwned();
	});

	async function toggle(id: number) {
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

<SEO title="Inventaris Dekorasi" noindex />

<div class="max-w-3xl mx-auto pb-16">
	<header class="mb-5 flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5"
				style="color: var(--text-faint);"
			>
				Inventaris
			</p>
			<h1 class="text-[22px] font-black leading-tight" style="color: var(--text-primary);">
				Frame milikku
			</h1>
		</div>
		<a
			href="/decorations"
			class="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-black"
			style="background: var(--surface); color: var(--text-primary); border: 1px solid var(--border-strong);"
		>
			<span class="material-symbols-rounded" style="font-size:14px;">storefront</span>
			Toko
		</a>
	</header>

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

	{#if decorations.equipped[activeTab]}
		<div
			class="mb-5 flex items-center gap-3 p-3 rounded-[var(--radius-2xl)]"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.25);"
		>
			{#if activeTab === 'frame'}
				<AvatarFrame
					src={userAvatar}
					alt={auth.user?.username ?? ''}
					size={64}
					frame={decorations.frame}
					fallbackInitial={auth.user?.username?.[0]}
				/>
			{:else}
				<div
					class="flex h-16 min-w-24 items-center justify-center rounded-[var(--radius-xl)] px-3"
					style="background: var(--surface); border: 1px solid var(--border);"
				>
					<NameTag
						name={auth.user?.username ?? 'User'}
						nametag={decorations.nametag}
						class="text-[15px]"
					/>
				</div>
			{/if}
			<div class="flex-1 min-w-0">
				<p
					class="text-[10px] font-black uppercase tracking-[0.18em]"
					style="color: var(--accent-text);"
				>
					Sedang dipasang
				</p>
				<p class="text-[15px] font-black truncate" style="color: var(--text-primary);">
					{decorations.equipped[activeTab]?.name}
				</p>
			</div>
			<button
				type="button"
				onclick={() => decorations.unequip(activeTab)}
				disabled={decorations.isMutating}
				class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black disabled:opacity-60"
				style="background: var(--surface); color: var(--text-primary); border: 1px solid var(--border-strong);"
			>
				<span class="material-symbols-rounded" style="font-size:14px;">close</span>
				Lepas
			</button>
		</div>
	{/if}

	{#if decorations.isLoading && items.length === 0}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each Array(4) as _, i (i)}
				<div
					class="aspect-square rounded-[var(--radius-2xl)] animate-pulse"
					style="background: var(--surface-offset);"
				></div>
			{/each}
		</div>
	{:else if items.length === 0}
		<div
			class="rounded-[var(--radius-2xl)] p-6 text-center"
			style="background: var(--surface); border: 1px dashed var(--border-strong);"
		>
			<span
				class="material-symbols-rounded inline-block mb-2"
				style="font-size: 32px; color: var(--text-faint);"
			>
				inventory_2
			</span>
			<p class="text-[13px] font-bold mb-1" style="color: var(--text-primary);">
				Belum ada {activeTab === 'frame' ? 'frame' : 'nametag'} yang terbuka.
			</p>
			<p class="text-[11px] mb-3" style="color: var(--text-muted);">
				Tonton anime untuk naik level, atau buka toko untuk melihat dekorasi yang menanti.
			</p>
			<a
				href="/decorations"
				class="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-black text-white"
				style="background: var(--accent); box-shadow: 0 4px 12px var(--accent-glow);"
			>
				Buka toko
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each items as item (item.id)}
				{@const equipped = item.isEquipped}
				<div
					class="rounded-[var(--radius-2xl)] overflow-hidden flex flex-col p-4 pt-8"
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
									name={auth.user?.username ?? 'User'}
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
						Level {item.requiredLevel}
					</p>
					<div class="mt-3">
						<button
							type="button"
							onclick={() => toggle(item.id)}
							disabled={decorations.isMutating}
							class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
							style="
								background: {equipped ? 'var(--accent-surface)' : 'var(--accent)'};
								color: {equipped ? 'var(--accent-text)' : '#fff'};
								border: 1px solid {equipped ? 'oklch(from var(--accent) l c h / 0.3)' : 'transparent'};
								box-shadow: {equipped ? 'none' : '0 4px 12px var(--accent-glow)'};
							"
						>
							<span class="material-symbols-rounded" style="font-size:14px;">
								{equipped ? 'check_circle' : 'checkroom'}
							</span>
							{equipped ? 'Lepas' : 'Pasang'}
						</button>
					</div>
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
