<script lang="ts">
	import { page } from '$app/stores';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import ProfileEffect from '$lib/components/ProfileEffect.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import config from '$lib/config';
	import {
		getEffectDuration,
		getEffectLoop,
		getEffectSrc,
		getFrameAssetUrl
	} from '$lib/decorations';
	import { preloadEffects, resolveEffectFetchUrl } from '$lib/effect-preloader';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import type { PublicUser } from '$lib/stores/auth.svelte';

	type ApiEnvelope<T> = {
		status: number;
		message: string | null;
		errorCode: string | null;
		data: T;
		meta?: Record<string, unknown>;
	};

	type HistoryItem = {
		id: number;
		animeId: number;
		animeSlug: string;
		animeTitle: string;
		animeThumbnail: string;
		episodeId: number;
		episodeSlug: string;
		episodeNumber: number;
		episodeTitle: string;
		progressPct: number;
		watchedAt: string;
	};

	type SavedItem = {
		id: number;
		animeId: number;
		animeSlug: string;
		animeTitle: string;
		animeThumbnail: string;
		animeStatus: string;
		savedAt: string;
	};

	type CommentItem = {
		id: number;
		content: string | null;
		isEdited: boolean;
		createdAt: string;
		likeCount: number;
		dislikeCount: number;
		replyCount: number;
		parentId: number | null;
		anime: { id: number; slug: string; title: string; thumbnail: string | null } | null;
		episode: { id: number; slug: string; number: number; title: string } | null;
	};

	type TabKey = 'history' | 'comments' | 'saved';

	const patternUser = $derived($page.params.patternUser);
	const userId = $derived.by(() => {
		const match = patternUser?.match(/-(\d+)$/);
		const id = Number(match?.[1]);
		return Number.isInteger(id) && id > 0 ? id : null;
	});

	let user = $state<PublicUser | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let activeTab = $state<TabKey>('history');

	let historyItems = $state<HistoryItem[]>([]);
	let historyLoaded = $state(false);
	let historyLoading = $state(false);
	let historyError = $state('');

	let commentItems = $state<CommentItem[]>([]);
	let commentsLoaded = $state(false);
	let commentsLoading = $state(false);
	let commentsError = $state('');

	let savedItems = $state<SavedItem[]>([]);
	let savedLoaded = $state(false);
	let savedLoading = $state(false);
	let savedError = $state('');

	const avatar = $derived(
		user?.avatar ||
			`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.username ?? 'Anime')}&backgroundColor=7c3aed`
	);
	const userExp = $derived(Math.max(0, Number(user?.exp ?? 0)));
	const userLevel = $derived(Math.max(1, Number(user?.level ?? 1)));
	const userBadge = $derived(user?.badge ?? getCultivationBadge(userLevel));
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
	const profileEffects = $derived(
		(user?.effects ?? []).flatMap((effect) => {
			const src = getEffectSrc(effect);
			// const blob = get(effect);
			if (!src) return [];
			// console.log(user?.effects);

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

	const effectPreloadUrls = $derived(
		profileEffects
			.map((effect) => resolveEffectFetchUrl(effect.src))
			.filter((url): url is string => typeof url === 'string' && url.length > 0)
	);
	const frameAssetUrl = $derived(getFrameAssetUrl(user?.frame ?? null));

	const statItems = $derived([
		{ label: 'Episode', value: profileStats.episodeCount, icon: 'play_circle' },
		{ label: 'Jam nonton', value: profileStats.watchHours, icon: 'schedule' },
		{ label: 'Tersimpan', value: profileStats.savedCount, icon: 'bookmark' }
	]);
	const tabs: Array<{ key: TabKey; icon: string; label: string }> = [
		{ key: 'history', icon: 'history', label: 'Riwayat' },
		{ key: 'comments', icon: 'chat_bubble', label: 'Komentar' },
		{ key: 'saved', icon: 'bookmark', label: 'Tersimpan' }
	];
	const joinedText = $derived(formatJoined(user?.createdAt));

	let activeFetchUserId: number | null = null;

	$effect(() => {
		const id = userId;
		if (!id) {
			user = null;
			isLoading = false;
			errorMessage = 'Profil tidak valid';
			activeFetchUserId = null;
			return;
		}

		if (activeFetchUserId === id) return;
		activeFetchUserId = id;

		isLoading = true;
		errorMessage = '';

		historyItems = [];
		historyLoaded = false;
		historyError = '';
		commentItems = [];
		commentsLoaded = false;
		commentsError = '';
		savedItems = [];
		savedLoaded = false;
		savedError = '';
		activeTab = 'history';

		fetchUser(id);
		loadTab('history', id);
	});

	function warmDecorationAssets(next: PublicUser | null) {
		if (!next || typeof window === 'undefined') return;

		const effectSrcs = (next.effects ?? [])
			.map((effect) => getEffectSrc(effect))
			.filter((src): src is string => typeof src === 'string' && src.length > 0);
		if (effectSrcs.length > 0) {
			void preloadEffects(effectSrcs);
		}

		const frameUrl = getFrameAssetUrl(next.frame ?? null);
		if (frameUrl) {
			const img = new Image();
			img.decoding = 'async';
			img.src = frameUrl;
		}
	}

	async function fetchUser(id: number) {
		try {
			const response = await fetch(`${config.API_BASE_URL}/api/users/${id}`);
			const json = (await response.json().catch(() => null)) as ApiEnvelope<PublicUser> | null;

			if (activeFetchUserId !== id) return;

			if (!response.ok) {
				throw new Error(json?.message ?? 'Gagal memuat profil');
			}

			const nextUser = json?.data ?? null;
			if (!nextUser) throw new Error('Profil tidak ditemukan');

			// Kick off asset preload BEFORE assigning state so the network fetch
			// starts in the same microtask, in parallel with Svelte's render
			// flush. ProfileEffect's mount-time preloadEffect call will reuse the
			// inflight promise, so the user sees the effect the moment the asset
			// is decoded — not after a second round-trip.
			warmDecorationAssets(nextUser);
			user = nextUser;
		} catch (error) {
			if (activeFetchUserId !== id) return;
			user = null;
			errorMessage = error instanceof Error ? error.message : 'Gagal memuat profil';
		} finally {
			if (activeFetchUserId === id) isLoading = false;
		}
	}

	async function loadTab(tab: TabKey, id: number) {
		if (tab === 'history') {
			if (historyLoaded || historyLoading) return;
			historyLoading = true;
			historyError = '';
			try {
				const response = await fetch(`${config.API_BASE_URL}/api/users/${id}/history?limit=10`);
				const json = (await response.json().catch(() => null)) as ApiEnvelope<HistoryItem[]> | null;
				if (activeFetchUserId !== id) return;
				if (!response.ok) throw new Error(json?.message ?? 'Gagal memuat riwayat');
				historyItems = json?.data ?? [];
				historyLoaded = true;
			} catch (error) {
				if (activeFetchUserId !== id) return;
				historyError = error instanceof Error ? error.message : 'Gagal memuat riwayat';
			} finally {
				if (activeFetchUserId === id) historyLoading = false;
			}
		} else if (tab === 'comments') {
			if (commentsLoaded || commentsLoading) return;
			commentsLoading = true;
			commentsError = '';
			try {
				const response = await fetch(`${config.API_BASE_URL}/api/users/${id}/comments?limit=10`);
				const json = (await response.json().catch(() => null)) as ApiEnvelope<CommentItem[]> | null;
				if (activeFetchUserId !== id) return;
				if (!response.ok) throw new Error(json?.message ?? 'Gagal memuat komentar');
				commentItems = json?.data ?? [];
				commentsLoaded = true;
			} catch (error) {
				if (activeFetchUserId !== id) return;
				commentsError = error instanceof Error ? error.message : 'Gagal memuat komentar';
			} finally {
				if (activeFetchUserId === id) commentsLoading = false;
			}
		} else if (tab === 'saved') {
			if (savedLoaded || savedLoading) return;
			savedLoading = true;
			savedError = '';
			try {
				const response = await fetch(`${config.API_BASE_URL}/api/users/${id}/saved?limit=10`);
				const json = (await response.json().catch(() => null)) as ApiEnvelope<SavedItem[]> | null;
				if (activeFetchUserId !== id) return;
				if (!response.ok) throw new Error(json?.message ?? 'Gagal memuat tersimpan');
				savedItems = json?.data ?? [];
				savedLoaded = true;
			} catch (error) {
				if (activeFetchUserId !== id) return;
				savedError = error instanceof Error ? error.message : 'Gagal memuat tersimpan';
			} finally {
				if (activeFetchUserId === id) savedLoading = false;
			}
		}
	}

	function selectTab(tab: TabKey) {
		activeTab = tab;
		const id = userId;
		if (id) loadTab(tab, id);
	}

	function formatRelativeDate(value: string | null | undefined) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		const diff = Math.floor((Date.now() - date.getTime()) / 1000);
		if (diff < 60) return 'baru saja';
		if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
		if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
		if (diff < 2592000) return `${Math.floor(diff / 604800)} mgg lalu`;
		return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function commentLink(item: CommentItem) {
		if (!item.anime?.slug) return null;
		if (item.episode?.slug) return `/anime/${item.anime.slug}/${item.episode.slug}`;
		return `/anime/${item.anime.slug}`;
	}

	function formatNumber(value: number) {
		return value.toLocaleString('id-ID');
	}

	function formatJoined(value: string | null | undefined) {
		if (!value) return null;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return null;
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<SEO title={user ? `${user.username} - Profil` : 'Profil User'} noindex />

<svelte:head>
	{#if frameAssetUrl}
		<link rel="preload" as="image" href={frameAssetUrl} fetchpriority="high" />
	{/if}
	{#each effectPreloadUrls as url}
		<link rel="preload" as="fetch" href={url} crossorigin="anonymous" fetchpriority="high" />
	{/each}
</svelte:head>

{#if isLoading}
	<div class="max-w-2xl mx-auto pb-16">
		<div
			class="-mx-4 -mt-4 mb-6 min-h-[260px] overflow-hidden md:mx-0 md:mt-0 md:rounded-[var(--radius-2xl)]"
			style="background: linear-gradient(135deg, oklch(from var(--accent) 0.2 0.15 h / 0.75), oklch(0.08 0.02 280 / 0.92));"
		>
			<div class="px-5 pt-8 pb-7">
				<div class="mb-6 flex items-end gap-4">
					<div class="h-[60px] w-[60px] animate-pulse rounded-full bg-white/15"></div>
					<div class="flex-1 space-y-2 pb-2">
						<div class="h-3 w-24 animate-pulse rounded-full bg-white/15"></div>
						<div class="h-7 w-44 animate-pulse rounded-full bg-white/15"></div>
					</div>
				</div>
				<div class="h-28 animate-pulse rounded-[var(--radius-xl)] bg-white/10"></div>
			</div>
		</div>
	</div>
{:else if errorMessage || !user}
	<div class="flex flex-col items-center justify-center px-6 py-24 text-center">
		<div
			class="mb-5 flex h-20 w-20 items-center justify-center rounded-[var(--radius-2xl)]"
			style="background: var(--accent-surface); border: 1px solid oklch(from var(--accent) l c h / 0.2); box-shadow: var(--shadow-md);"
		>
			<span class="material-symbols-rounded" style="font-size:36px; color: var(--accent);">
				person_off
			</span>
		</div>
		<h1 class="mb-2 text-[20px] font-black" style="color: var(--text-primary);">
			Profil tidak ditemukan
		</h1>
		<p class="max-w-[280px] text-[13px] leading-relaxed" style="color: var(--text-muted);">
			{errorMessage || 'User ini tidak tersedia.'}
		</p>
	</div>
{:else}
	<div class="relative max-w-2xl mx-auto pb-16 min-h-[80vh]">
		{#if profileEffects.length > 0}
			<div
				class="absolute inset-y-0 -left-4 -right-4 z-50 pointer-events-none overflow-hidden md:left-0 md:right-0"
				style="contain: layout paint style; transform: translateZ(0);"
			>
				{#each profileEffects as effect}
					<ProfileEffect
						src={effect.src}
						// loop={effect.loop}
						duration={effect.duration}
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
								(effect.duration ?? 5000) > 5000 ? (effect.duration ?? 5000) : 5000
							);
						}}
					/>
				{/each}
			</div>
		{/if}

		<div
			class="-mx-4 -mt-4 md:mx-0 md:mt-0 md:rounded-[var(--radius-2xl)] overflow-hidden mb-6 relative"
			style="min-height: 260px;"
		>
			<div
				class="absolute inset-0"
				style="background: linear-gradient(135deg,
					oklch(from var(--accent) 0.2 0.15 h / 0.85) 0%,
					oklch(0.08 0.02 280 / 0.9) 60%,
					oklch(0.06 0.01 180 / 0.95) 100%);"
			></div>
			<div
				class="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
				style="background: linear-gradient(to bottom, transparent, var(--page-bg, var(--surface)));"
			></div>

			<div class="relative z-10 px-5 pt-8 pb-7">
				<div class="mb-6 flex items-end gap-4">
					<div class="relative shrink-0">
						<AvatarFrame
							src={avatar}
							alt={user.username ?? 'Avatar'}
							size={60}
							frame={user.frame ?? null}
							fallbackInitial={user.username?.[0] ?? 'A'}
						/>
						<div
							class="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2"
							style="background: #22c55e; border-color: oklch(0.1 0.01 280);"
						></div>
					</div>

					<div class="min-w-0 flex-1 pb-1">
						<p
							class="mb-1 text-[9px] font-black uppercase tracking-[0.22em]"
							style="color: oklch(1 0 0 / 0.4);"
						>
							Profil Publik
						</p>
						<div class="mb-1 flex min-w-0 items-center gap-2">
							<h1 class="truncate text-[22px] font-black leading-none text-white md:text-[26px]">
								<NameTag name={user.username ?? 'User'} nametag={user.nametag ?? null} />
							</h1>
							{#if user.isVerified}
								<img
									src="/badges/verify.png"
									alt="Verified"
									class="h-5 w-5 shrink-0 object-contain"
								/>
							{/if}
						</div>
						{#if joinedText}
							<p class="truncate text-[11px]" style="color: oklch(1 0 0 / 0.45);">
								Bergabung {joinedText}
							</p>
						{/if}
					</div>
				</div>

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
									<span class="material-symbols-rounded" style="font-size:12px;">
										workspace_premium
									</span>
									<span class="truncate">{userBadge.name}</span>
									<span class="badge-shine" aria-hidden="true"></span>
								</span>
							</div>
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
							<p class="text-[28px] font-black leading-none text-white tabular-nums">
								{userLevel}
							</p>
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
							Sisa {formatNumber(levelProgress.remainingExp)} EXP ke level berikutnya
						</p>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-2">
					{#each statItems as stat}
						<div
							class="flex flex-col items-center rounded-[var(--radius-xl)] px-2 py-3 backdrop-blur-md"
							style="background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.1);"
						>
							<span
								class="material-symbols-rounded mb-1"
								style="font-size:18px; color: oklch(from var(--accent) 0.8 0.12 h);"
							>
								{stat.icon}
							</span>
							<p class="text-[20px] font-black leading-none text-white tabular-nums">
								{formatNumber(stat.value)}
							</p>
							<p class="mt-0.5 text-[9px] font-semibold" style="color: oklch(1 0 0 / 0.45);">
								{stat.label}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div
			class="sticky top-0 z-30 -mx-4 mb-4 backdrop-blur-md md:mx-0 md:rounded-[var(--radius-xl)]"
			style="background: oklch(from var(--surface) l c h / 0.85); border-bottom: 1px solid var(--border);"
		>
			<div class="flex items-center justify-around" role="tablist" aria-label="Aktivitas user">
				{#each tabs as tab}
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === tab.key}
						onclick={() => selectTab(tab.key)}
						class="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-all active:scale-95"
						style="color: {activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-faint)'};"
					>
						<span class="material-symbols-rounded" style="font-size:20px;">
							{tab.icon}
						</span>
						<span class="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
						{#if activeTab === tab.key}
							<span
								class="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full"
								style="background: var(--accent); box-shadow: 0 0 12px var(--accent-glow);"
							></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="px-1">
			{#if activeTab === 'history'}
				{#if historyLoading && !historyLoaded}
					<div class="space-y-2.5">
						{#each Array(4) as _}
							<div
								class="flex gap-3 p-2.5 rounded-[var(--radius-2xl)] animate-pulse"
								style="background: var(--surface); border: 1px solid var(--border);"
							>
								<div class="h-[68px] w-[120px] rounded-[var(--radius-xl)] bg-white/10"></div>
								<div class="flex-1 space-y-2 py-1">
									<div class="h-3 w-3/4 rounded-full bg-white/10"></div>
									<div class="h-2.5 w-1/2 rounded-full bg-white/10"></div>
									<div class="h-1.5 w-full rounded-full bg-white/5"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else if historyError}
					<div class="py-12 text-center">
						<p class="text-[13px]" style="color: var(--text-muted);">{historyError}</p>
					</div>
				{:else if historyItems.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<div
							class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
							style="background: var(--surface); border: 1px solid var(--border);"
						>
							<span
								class="material-symbols-rounded"
								style="font-size:24px; color: var(--text-faint);"
							>
								history
							</span>
						</div>
						<p class="text-[13px] font-bold" style="color: var(--text-muted);">
							Belum ada riwayat tontonan
						</p>
					</div>
				{:else}
					<div class="space-y-2.5">
						{#each historyItems as item (item.episodeId)}
							<a
								href="/anime/{item.animeSlug}/{item.episodeSlug}"
								class="group flex items-stretch gap-3 p-2.5 rounded-[var(--radius-2xl)] transition-all"
								style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
							>
								<div
									class="relative shrink-0 rounded-[var(--radius-xl)] overflow-hidden"
									style="width: 120px; aspect-ratio: 16/9;"
								>
									<OptimizedImage
										src={item.animeThumbnail}
										alt={item.animeTitle}
										className="h-full w-full"
										imageClass="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										sizes="120px"
									/>
									<div
										class="absolute bottom-0 left-0 right-0 h-[3px] z-[2]"
										style="background: oklch(0 0 0 / 0.3);"
									>
										<div
											class="h-full rounded-full"
											style="width: {item.progressPct}%; background: var(--accent); box-shadow: 0 0 6px var(--accent-glow);"
										></div>
									</div>
									<div class="absolute top-1.5 left-1.5 z-[2]">
										<span
											class="px-1.5 py-0.5 rounded-md text-[8px] font-black text-white backdrop-blur-md"
											style="background: oklch(0 0 0 / 0.55); border: 1px solid oklch(1 0 0 / 0.1);"
										>
											Ep {item.episodeNumber}
										</span>
									</div>
								</div>
								<div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
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
									<div class="flex items-center justify-between gap-2">
										<span
											class="text-[9px] font-black tabular-nums"
											style="color: {item.progressPct >= 90 ? '#10b981' : 'var(--accent)'};"
										>
											{#if item.progressPct >= 90}
												✓ Selesai
											{:else}
												{Math.round(item.progressPct)}% ditonton
											{/if}
										</span>
										<span class="text-[9px]" style="color: var(--text-faint);">
											{formatRelativeDate(item.watchedAt)}
										</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'comments'}
				{#if commentsLoading && !commentsLoaded}
					<div class="space-y-2.5">
						{#each Array(4) as _}
							<div
								class="p-3 rounded-[var(--radius-2xl)] animate-pulse space-y-2"
								style="background: var(--surface); border: 1px solid var(--border);"
							>
								<div class="h-2.5 w-1/3 rounded-full bg-white/10"></div>
								<div class="h-3 w-full rounded-full bg-white/10"></div>
								<div class="h-3 w-2/3 rounded-full bg-white/10"></div>
							</div>
						{/each}
					</div>
				{:else if commentsError}
					<div class="py-12 text-center">
						<p class="text-[13px]" style="color: var(--text-muted);">{commentsError}</p>
					</div>
				{:else if commentItems.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<div
							class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
							style="background: var(--surface); border: 1px solid var(--border);"
						>
							<span
								class="material-symbols-rounded"
								style="font-size:24px; color: var(--text-faint);"
							>
								chat_bubble
							</span>
						</div>
						<p class="text-[13px] font-bold" style="color: var(--text-muted);">
							Belum ada komentar
						</p>
					</div>
				{:else}
					<div class="space-y-2.5">
						{#each commentItems as item (item.id)}
							{@const link = commentLink(item)}
							<svelte:element
								this={link ? 'a' : 'div'}
								href={link ?? undefined}
								class="block p-3 rounded-[var(--radius-2xl)] transition-all"
								style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
							>
								{#if item.anime}
									<div class="mb-2 flex items-center gap-2">
										{#if item.anime.thumbnail}
											<OptimizedImage
												src={item.anime.thumbnail}
												alt=""
												className="h-8 w-8 rounded-lg shrink-0"
												imageClass="h-full w-full object-cover"
												sizes="32px"
											/>
										{/if}
										<div class="min-w-0 flex-1">
											<p
												class="text-[11px] font-black truncate"
												style="color: var(--text-primary);"
											>
												{item.anime.title}
											</p>
											{#if item.episode}
												<p class="text-[9px] truncate" style="color: var(--text-faint);">
													Ep {item.episode.number}
													{#if item.episode.title}
														· {item.episode.title}
													{/if}
												</p>
											{/if}
										</div>
										{#if item.parentId !== null}
											<span
												class="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider"
												style="background: var(--accent-surface); color: var(--accent);"
											>
												Reply
											</span>
										{/if}
									</div>
								{/if}
								<p
									class="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
									style="color: var(--text-primary);"
								>
									{item.content ?? '[Komentar dihapus]'}
								</p>
								<div
									class="mt-2 flex items-center gap-3 text-[10px]"
									style="color: var(--text-faint);"
								>
									<span class="flex items-center gap-1">
										<span class="material-symbols-rounded" style="font-size:13px;">favorite</span>
										{item.likeCount}
									</span>
									<span class="flex items-center gap-1">
										<span class="material-symbols-rounded" style="font-size:13px;">reply</span>
										{item.replyCount}
									</span>
									<span class="ml-auto">
										{formatRelativeDate(item.createdAt)}
										{#if item.isEdited}
											· diedit
										{/if}
									</span>
								</div>
							</svelte:element>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'saved'}
				{#if savedLoading && !savedLoaded}
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
						{#each Array(6) as _}
							<div
								class="aspect-[2/3] rounded-[var(--radius-2xl)] animate-pulse"
								style="background: var(--surface); border: 1px solid var(--border);"
							></div>
						{/each}
					</div>
				{:else if savedError}
					<div class="py-12 text-center">
						<p class="text-[13px]" style="color: var(--text-muted);">{savedError}</p>
					</div>
				{:else if savedItems.length === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<div
							class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
							style="background: var(--surface); border: 1px solid var(--border);"
						>
							<span
								class="material-symbols-rounded"
								style="font-size:24px; color: var(--text-faint);"
							>
								bookmarks
							</span>
						</div>
						<p class="text-[13px] font-bold" style="color: var(--text-muted);">
							Belum ada anime tersimpan
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
						{#each savedItems as item (item.animeId)}
							<a
								href="/anime/{item.animeSlug}"
								class="group relative block overflow-hidden rounded-[var(--radius-2xl)] transition-all"
								style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
							>
								<div class="relative aspect-[2/3] w-full overflow-hidden">
									<OptimizedImage
										src={item.animeThumbnail}
										alt={item.animeTitle}
										className="h-full w-full"
										imageClass="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
									/>
									<div
										class="absolute inset-0 z-[2]"
										style="background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 70%);"
									></div>
									<div class="absolute top-1.5 left-1.5 z-[3]">
										<span
											class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider backdrop-blur-md"
											style="background: {item.animeStatus === 'Ongoing'
												? 'oklch(0.5 0.18 160 / 0.4)'
												: 'oklch(0 0 0 / 0.45)'}; color: {item.animeStatus === 'Ongoing'
												? '#86efac'
												: 'rgba(255,255,255,0.7)'};"
										>
											{#if item.animeStatus === 'Ongoing'}
												<span class="h-1 w-1 rounded-full bg-green-400 animate-pulse"></span>
											{/if}
											{item.animeStatus === 'Ongoing' ? 'Tayang' : 'Tamat'}
										</span>
									</div>
									<div class="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6 z-[3]">
										<p class="text-[10px] font-black leading-tight line-clamp-2 text-white">
											{item.animeTitle}
										</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<NavigationBottom />

<style>
	.badge-shine {
		position: absolute;
		inset: -45% auto -45% -35%;
		width: 30%;
		transform: rotate(18deg);
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
		animation: badge-shine 3.4s ease-in-out infinite;
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
