<script lang="ts">
	import { goto } from '$app/navigation';
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
		type OwnedDecoration
	} from '$lib/decorations';
	import { preloadEffects } from '$lib/effect-preloader';
	import { auth } from '$lib/stores/auth.svelte';
	import { decorations } from '$lib/stores/decorations.svelte';
	import { displayUserName, userInitial } from '$lib/user-display';

	const displayName = $derived(displayUserName(auth.user));
	const userAvatar = $derived(
		auth.user?.avatar ||
			(auth.user
				? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=7c3aed`
				: null)
	);
	let activeTab = $state<DecorationType>('frame');
	let preloadingEffects = $state(false);
	let previewEffect = $state<OwnedDecoration | null>(null);

	const singleEquipped = $derived(
		activeTab === 'frame' ? decorations.frame : activeTab === 'nametag' ? decorations.nametag : null
	);
	const equippedId = $derived(singleEquipped?.id ?? null);
	const items = $derived(decorations.owned.filter((item) => item.type === activeTab));
	const equippedEffects = $derived(decorations.effects);
	const equippedEffectCount = $derived(equippedEffects.length);

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

	$effect(() => {
		if (!auth.isLoggedIn) return;
		const effectSrcs = decorations.owned
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

	async function toggle(id: number) {
		if (decorations.isMutating) return;
		const target = decorations.owned.find((item) => item.id === id);
		if (!target) return;
		if (target.type === 'effect') {
			if (target.isEquipped) await decorations.unequipById(id);
			else await decorations.equip(id);
		} else if (equippedId === id) {
			await decorations.unequip(target.type);
		} else {
			await decorations.equip(id);
		}
	}

	function startPreview(item: OwnedDecoration) {
		if (item.type === 'effect') previewEffect = item;
	}

	function closePreview() {
		previewEffect = null;
	}

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
				{activeTab === 'frame'
					? 'Frame milikku'
					: activeTab === 'nametag'
						? 'NameTag milikku'
						: 'Profile Effect milikku'}
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
				{tab.label}
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

	{#if activeTab === 'effect' && equippedEffectCount > 0}
		<div
			class="mb-5 rounded-[var(--radius-2xl)] p-3"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.25);"
		>
			<div class="mb-3 flex items-center justify-between gap-3">
				<div class="min-w-0">
					<p
						class="text-[10px] font-black uppercase tracking-[0.18em]"
						style="color: var(--accent-text);"
					>
						Sedang dipasang
					</p>
					<p class="text-[15px] font-black truncate" style="color: var(--text-primary);">
						{equippedEffectCount} / {MAX_EQUIPPED_EFFECTS} profile effect aktif
					</p>
				</div>
				<button
					type="button"
					onclick={() => decorations.unequip('effect')}
					disabled={decorations.isMutating}
					class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black disabled:opacity-60"
					style="background: var(--surface); color: var(--text-primary); border: 1px solid var(--border-strong);"
				>
					<span class="material-symbols-rounded" style="font-size:14px;">close</span>
					Lepas semua
				</button>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each equippedEffects as effect (effect.id)}
					<button
						type="button"
						onclick={() => decorations.unequipById(effect.id)}
						disabled={decorations.isMutating}
						class="inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black disabled:opacity-60"
						style="background: var(--surface); color: var(--text-primary); border: 1px solid var(--border);"
						title="Lepas {effect.name}"
					>
						<span class="material-symbols-rounded" style="font-size:12px;">auto_awesome</span>
						<span class="truncate">{effect.name}</span>
						<span class="material-symbols-rounded" style="font-size:12px;">close</span>
					</button>
				{/each}
			</div>
		</div>
	{:else if singleEquipped}
		<div
			class="mb-5 flex items-center gap-3 p-3 rounded-[var(--radius-2xl)]"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.25);"
		>
			{#if activeTab === 'frame'}
				<AvatarFrame
					src={userAvatar}
					alt={displayName}
					size={64}
					frame={decorations.frame}
					fallbackInitial={userInitial(auth.user)}
				/>
			{:else}
				<div
					class="flex h-16 min-w-24 items-center justify-center rounded-[var(--radius-xl)] px-3"
					style="background: var(--surface); border: 1px solid var(--border);"
				>
					<NameTag
						name={displayName}
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
					{singleEquipped.name}
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
				Belum ada {activeTab === 'frame'
					? 'frame'
					: activeTab === 'nametag'
						? 'nametag'
						: 'profile effect'} yang dimiliki.
			</p>
			<p class="text-[11px] mb-3" style="color: var(--text-muted);">
				{#if activeTab === 'effect'}
					Buka toko untuk menukar EXP dengan effect animasi.
				{:else}
					Tonton anime untuk naik level, atau buka toko untuk melihat dekorasi yang menanti.
				{/if}
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
				{@const isEffect = item.type === 'effect'}
				{@const equipped = item.isEquipped}
				{@const maxEffectReached =
					isEffect && !equipped && equippedEffectCount >= MAX_EQUIPPED_EFFECTS}
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
								alt={displayName}
								size={88}
								frame={{
									id: item.id,
									name: item.name,
									type: item.type,
									asset: item.asset,
									assetUrl: item.assetUrl,
									config: item.config
								}}
								fallbackInitial={userInitial(auth.user)}
							/>
						{:else if item.type === 'nametag'}
							<div
								class="flex h-[88px] w-full items-center justify-center rounded-[var(--radius-xl)] px-3"
								style="background: var(--surface-offset); border: 1px solid var(--border);"
							>
								<NameTag
									name={displayName}
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
							<button
								type="button"
								onclick={() => startPreview(item)}
								class="effect-thumb relative flex h-[88px] w-full items-center justify-center overflow-hidden rounded-[var(--radius-xl)]"
								style="background: linear-gradient(135deg, oklch(from var(--accent) 0.22 0.12 h / 0.7) 0%, oklch(0.1 0.02 280) 100%); border: 1px solid var(--border);"
								aria-label="Pratinjau efek {item.name}"
							>
								<span
									class="material-symbols-rounded"
									style="font-size: 38px; color: oklch(1 0 0 / 0.85); filter: drop-shadow(0 2px 6px oklch(0 0 0 / 0.5));"
								>
									play_circle
								</span>
							</button>
						{/if}
					</div>
					<p class="text-[12px] font-black truncate mb-0.5" style="color: var(--text-primary);">
						{item.type === 'nametag' ? 'Preview Username' : item.name}
					</p>
					<p class="text-[10px]" style="color: var(--text-muted);">
						{#if isEffect}
							{equipped ? 'Aktif di profil' : `Slot ${equippedEffectCount}/${MAX_EQUIPPED_EFFECTS}`}
						{:else}
							Level {item.requiredLevel}
						{/if}
					</p>
					<div class="mt-3">
						<button
							type="button"
							onclick={() => toggle(item.id)}
							disabled={decorations.isMutating || maxEffectReached}
							class="w-full h-9 rounded-full text-[11px] font-black inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
							style="
								background: {equipped || maxEffectReached ? 'var(--accent-surface)' : 'var(--accent)'};
								color: {equipped || maxEffectReached ? 'var(--accent-text)' : '#fff'};
								border: 1px solid {equipped || maxEffectReached
								? 'oklch(from var(--accent) l c h / 0.3)'
								: 'transparent'};
								box-shadow: {equipped || maxEffectReached ? 'none' : '0 4px 12px var(--accent-glow)'};
							"
						>
							<span class="material-symbols-rounded" style="font-size:14px;">
								{equipped ? 'check_circle' : maxEffectReached ? 'block' : 'checkroom'}
							</span>
							{equipped ? 'Lepas' : maxEffectReached ? 'Max 3 aktif' : 'Pasang'}
						</button>
					</div>
					{#if isEffect}
						<button
							type="button"
							onclick={() => startPreview(item)}
							class="mt-2 w-full h-8 rounded-full text-[10px] font-black inline-flex items-center justify-center gap-1.5"
							style="background: transparent; color: var(--text-muted); border: 1px solid var(--border);"
						>
							<span class="material-symbols-rounded" style="font-size:13px;">visibility</span>
							Pratinjau
						</button>
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

{#if previewUser && previewEffect}
	<ProfileCard
		user={previewUser as any}
		allowLoop
		isOpen={true}
		onClose={closePreview}
		anchorEl={null}
	/>
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
