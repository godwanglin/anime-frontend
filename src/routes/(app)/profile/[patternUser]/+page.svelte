<script lang="ts">
	import { page } from '$app/stores';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import ProfileEffect from '$lib/components/ProfileEffect.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import config from '$lib/config';
	import { getEffectDuration, getEffectLoop, getEffectSrc } from '$lib/decorations';
	import { getCultivationBadge, getLevelProgress } from '$lib/exp';
	import type { PublicUser } from '$lib/stores/auth.svelte';

	type ApiEnvelope<T> = {
		status: number;
		message: string | null;
		errorCode: string | null;
		data: T;
		meta?: Record<string, unknown>;
	};

	const patternUser = $derived($page.params.patternUser);
	const userId = $derived.by(() => {
		const match = patternUser?.match(/-(\d+)$/);
		const id = Number(match?.[1]);
		return Number.isInteger(id) && id > 0 ? id : null;
	});

	let user = $state<PublicUser | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');

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
	const statItems = $derived([
		{ label: 'Episode', value: profileStats.episodeCount, icon: 'play_circle' },
		{ label: 'Jam nonton', value: profileStats.watchHours, icon: 'schedule' },
		{ label: 'Tersimpan', value: profileStats.savedCount, icon: 'bookmark' }
	]);
	const joinedText = $derived(formatJoined(user?.createdAt));

	$effect(() => {
		const id = userId;
		if (!id) {
			user = null;
			isLoading = false;
			errorMessage = 'Profil tidak valid';
			return;
		}

		const controller = new AbortController();
		isLoading = true;
		errorMessage = '';

		fetchUser(id, controller.signal);

		return () => controller.abort();
	});

	async function fetchUser(id: number, signal: AbortSignal) {
		try {
			const response = await fetch(`${config.API_BASE_URL}/api/users/${id}`, { signal });
			const json = (await response.json().catch(() => null)) as ApiEnvelope<PublicUser> | null;

			if (!response.ok) {
				throw new Error(json?.message ?? 'Gagal memuat profil');
			}

			user = json?.data ?? null;
			if (!user) throw new Error('Profil tidak ditemukan');
		} catch (error) {
			if (signal.aborted) return;
			user = null;
			errorMessage = error instanceof Error ? error.message : 'Gagal memuat profil';
		} finally {
			if (!signal.aborted) isLoading = false;
		}
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
					<ProfileEffect src={effect.src} loop={effect.loop} duration={effect.duration} />
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
