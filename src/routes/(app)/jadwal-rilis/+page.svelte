<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import config from '$lib/config';
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import OptimizedImage from '$lib/components/OptimizedImage.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import type { PageData } from './$types';
	import './jadwal-rilis.css';

	type ScheduleEpisode = {
		id: number;
		animeId: number;
		animeTitle: string;
		animeSlug: string;
		title: string;
		episode: string;
		episodeNumber: number;
		thumbnail: string | null;
		href: string;
		scheduledAt: string;
		releasedAt: string;
		releaseTime: string;
		scheduleStatus: 'upcoming' | 'released' | 'cancelled';
		scheduleSource: string;
		notificationSent: boolean;
		animeStatus: string | null;
		animeType: string | null;
	};

	type ScheduleGroup = {
		date: string;
		count: number;
		episodes: ScheduleEpisode[];
	};

	type RangeFilter = 'rolling' | 'today' | 'week';
	type StatusFilter = 'all' | 'upcoming' | 'released';

	const { data }: { data: PageData } = $props();

	let groups = $state<ScheduleGroup[]>((data.groups ?? []) as ScheduleGroup[]);
	let activeDays = $state(Number(data.days ?? 7));
	let activeRange = $state<RangeFilter>((data.range ?? 'rolling') as RangeFilter);
	let activeStatus = $state<StatusFilter>((data.status ?? 'all') as StatusFilter);
	let isLoading = $state(false);
	let loadError = $state<string | null>(data.error ?? null);

	const totalEpisodes = $derived(groups.reduce((sum, group) => sum + group.count, 0));
	const totalUpcoming = $derived(
		groups.reduce(
			(sum, group) =>
				sum + group.episodes.filter((item) => item.scheduleStatus === 'upcoming').length,
			0
		)
	);
	const totalReleased = $derived(
		groups.reduce(
			(sum, group) =>
				sum + group.episodes.filter((item) => item.scheduleStatus === 'released').length,
			0
		)
	);
	const totalSokuja = $derived(
		groups.reduce(
			(sum, group) =>
				sum + group.episodes.filter((item) => item.scheduleSource === 'sokuja.schedule').length,
			0
		)
	);
	const todayKey = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());

	const dayOptions = [
		{ value: 7, label: '7 Hari' },
		{ value: 14, label: '14 Hari' },
		{ value: 30, label: '30 Hari' }
	];
	const rangeOptions = [
		{ value: 'rolling', label: 'Rolling' },
		{ value: 'today', label: 'Hari ini' },
		{ value: 'week', label: 'Minggu ini' }
	];
	const statusOptions = [
		{ value: 'all', label: 'Semua' },
		{ value: 'upcoming', label: 'Akan tayang' },
		{ value: 'released', label: 'Sudah rilis' }
	];

	function formatDateLabel(value: string) {
		const [year, month, day] = value.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			day: '2-digit',
			month: 'long'
		}).format(date);
	}

	async function loadSchedule(next: { days?: number; range?: RangeFilter; status?: StatusFilter }) {
		const days = next.days ?? activeDays;
		const range = next.range ?? activeRange;
		const status = next.status ?? activeStatus;
		const params = new URLSearchParams({
			days: String(days),
			range,
			status,
			limit: '240'
		});

		activeDays = days;
		activeRange = range;
		activeStatus = status;
		isLoading = true;
		loadError = null;

		try {
			const response = await fetch(`${config.API_BASE_URL}/api/episodes/schedule?${params.toString()}`);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(json.message ?? 'Gagal memuat jadwal rilis');
			groups = (json.data ?? []) as ScheduleGroup[];
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Gagal memuat jadwal rilis';
			groups = [];
		} finally {
			isLoading = false;
		}
	}

	function statusLabel(status: ScheduleEpisode['scheduleStatus']) {
		if (status === 'upcoming') return 'Akan tayang';
		if (status === 'cancelled') return 'Batal';
		return 'Sudah rilis';
	}

	function statusStyle(status: ScheduleEpisode['scheduleStatus']) {
		if (status === 'upcoming') return 'background: rgba(59,130,246,.14); color: rgb(147,197,253);';
		if (status === 'cancelled') return 'background: rgba(239,68,68,.14); color: rgb(248,113,113);';
		return 'background: var(--accent-surface); color: var(--accent-text);';
	}

	function sourceLabel(source: string) {
		if (source === 'sokuja.schedule') return 'Jadwal Sokuja';
		if (source === 'anichin.schedule') return 'Jadwal Weebin';
		if (source === 'manual') return 'Catatan Weebin';
		if (source === 'episode' || source === 'published') return 'Sudah tersedia';
		return 'Info Weebin';
	}
</script>

<SEO
	title="Kalender Rilis Episode"
	description="Jadwal rilis episode anime per hari, lengkap dengan link langsung ke episode terbaru."
/>

<div class="mx-auto max-w-6xl pb-24">
	<section
		class="mb-6 overflow-hidden rounded-[28px] bg-zinc-950 text-white ring-1 ring-white/10 shadow-2xl shadow-black/25"
	>
		<div class="relative min-h-[300px]">
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(139,92,246,0.36),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.22),transparent_28%),linear-gradient(135deg,#09090b,#141019_58%,#050505)]"></div>
			<div class="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black to-transparent"></div>

			<div class="relative z-10 flex min-h-[300px] flex-col justify-end gap-5 p-5 md:p-8">
				<div class="max-w-2xl">
					<div class="mb-3 flex flex-wrap items-center gap-2">
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/80 ring-1 ring-white/15"
						>
							<AppIcon name="calendar_month" class="text-[13px]" />
							Kalender Rilis
						</span>
						<span
							class="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-100 ring-1 ring-emerald-300/20"
						>
							{totalEpisodes} jadwal terdata
						</span>
					</div>
					<h1 class="text-2xl font-black leading-tight md:text-4xl">
						Jadwal rilis episode per hari
					</h1>
					<p class="mt-2 max-w-xl text-sm leading-relaxed text-white/68 md:text-[15px]">
						Cek anime yang sebentar lagi tayang dan episode yang sudah bisa ditonton. Jadwal
						diambil dari pantauan Weebin dan ikut diperbarui saat episode baru masuk.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each dayOptions as option}
						<button
							type="button"
							onclick={() => loadSchedule({ days: option.value })}
							disabled={isLoading}
							class="rounded-full px-4 py-2 text-[12px] font-black transition active:scale-[0.97]
								{activeDays === option.value
								? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
								: 'bg-white/10 text-white/70 ring-1 ring-white/12 hover:bg-white/15'} disabled:opacity-60"
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="sticky top-[64px] z-20 -mx-1 mb-5 px-1 py-2 backdrop-blur-xl md:static md:backdrop-blur-none">
		<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
			{#each rangeOptions as option}
				<button
					type="button"
					onclick={() => loadSchedule({ range: option.value as RangeFilter })}
					disabled={isLoading}
					class="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black transition active:scale-[0.97]"
					style={activeRange === option.value
						? 'background: var(--accent); color: #fff; box-shadow: 0 4px 14px var(--accent-glow);'
						: 'background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);'}
				>
					{option.label}
				</button>
			{/each}
			<span class="w-px shrink-0" style="background: var(--border);"></span>
			{#each statusOptions as option}
				<button
					type="button"
					onclick={() => loadSchedule({ status: option.value as StatusFilter })}
					disabled={isLoading}
					class="shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black transition active:scale-[0.97]"
					style={activeStatus === option.value
						? 'background: var(--surface); border: 1px solid var(--accent); color: var(--accent);'
						: 'background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);'}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</section>

	<section
		class="mb-6 flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
		style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
	>
		<div>
			<p
				class="text-[9px] font-black uppercase tracking-[0.2em]"
				style="color: var(--text-faint);"
			>
				Notifikasi
			</p>
			<p class="mt-1 text-[13px] font-bold" style="color: var(--text-primary);">
				{totalUpcoming} jadwal akan tayang, {totalReleased} episode sudah rilis, dan {totalSokuja}
				data aktif bersumber dari Sokuja. Kalau ada episode baru, notifikasi dikirim sekali ke
				user yang relevan.
			</p>
		</div>
		<a
			href="/profile/preferences"
			class="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-black text-white transition active:scale-[0.97]"
			style="background: var(--accent); box-shadow: 0 4px 14px var(--accent-glow);"
		>
			<AppIcon name="notifications_active" class="text-[17px]" />
			Atur Notifikasi
		</a>
	</section>

	{#if loadError}
		<div
			class="rounded-2xl p-5 text-center"
			style="background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);"
		>
			<p class="text-sm font-bold">{loadError}</p>
		</div>
	{:else if isLoading}
		<div
			class="rounded-2xl p-5 text-center"
			style="background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);"
		>
			<p class="text-sm font-bold">Memuat jadwal...</p>
		</div>
	{:else if groups.length}
		<div class="space-y-5">
			{#each groups as group}
				<section>
					<div class="mb-3 flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-2">
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
								style="background: {group.date === todayKey ? 'var(--accent-surface)' : 'var(--surface)'}; border: 1px solid var(--border);"
							>
								<AppIcon name={group.date === todayKey ? 'today' : 'event'} class="text-[20px]"
									style="color: {group.date === todayKey ? 'var(--accent)' : 'var(--text-faint)'};" />
							</div>
							<div class="min-w-0">
								<p
									class="text-[9px] font-black uppercase tracking-[0.18em]"
									style="color: var(--text-faint);"
								>
									{group.date === todayKey ? 'Hari Ini' : group.date}
								</p>
								<h2 class="truncate text-base font-black md:text-xl" style="color: var(--text-primary);">
									{formatDateLabel(group.date)}
								</h2>
							</div>
						</div>
						<span
							class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
							style="background: var(--surface); border: 1px solid var(--border); color: var(--text-muted);"
						>
							{group.count} episode
						</span>
					</div>

					<div class="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
						{#each group.episodes as item}
							<a
								href={item.href}
								class="schedule-card group flex gap-3 rounded-2xl p-2.5 transition active:scale-[0.99] md:hover:-translate-y-0.5"
								style="background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);"
							>
								<div class="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
									{#if item.thumbnail}
										<OptimizedImage
											src={item.thumbnail}
											alt={item.animeTitle}
											className="h-full w-full"
											imageClass="h-full w-full object-cover transition duration-300 md:group-hover:scale-[1.04]"
											loading="lazy"
											fetchpriority="low"
											sizes="128px"
											data-sync-asset-context="episode"
											data-sync-asset-id={String(item.id)}
											data-sync-asset-field="thumbnail"
										/>
									{:else}
										<div class="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
											<AppIcon name="videocam_off" class="text-2xl" />
										</div>
									{/if}
									<div class="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent"></div>
									<span
										class="absolute bottom-1.5 left-1.5 rounded-lg bg-black/65 px-2 py-0.5 text-[9px] font-black text-white ring-1 ring-white/10"
									>
										{item.episodeNumber > 0 ? item.episode : (item.animeType ?? 'Anime')}
									</span>
								</div>

								<div class="min-w-0 flex-1 py-0.5">
									<div class="mb-1 flex items-center gap-1.5">
										<span
											class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
											style={statusStyle(item.scheduleStatus)}
										>
											<AppIcon name={item.scheduleStatus === 'released' ? 'play_circle' : 'event_available'} class="text-[10px]" />
											{statusLabel(item.scheduleStatus)}
										</span>
										<span
											class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
											style="background: var(--surface-offset); color: var(--text-muted);"
										>
											<AppIcon name="schedule" class="text-[10px]" />
											{item.releaseTime}
										</span>
									</div>
									<p class="line-clamp-2 text-[13px] font-black leading-snug" style="color: var(--text-primary);">
										{item.animeTitle}
									</p>
									<p class="mt-1 line-clamp-1 text-[11px] font-semibold" style="color: var(--text-muted);">
										{item.episodeNumber > 0 ? item.title || `${item.episode} tersedia` : 'Jadwal tayang terbaru'}
									</p>
									<div class="mt-2 flex items-center gap-2 text-[9px] font-bold" style="color: var(--text-faint);">
										{#if item.animeType}
											<span>{item.animeType}</span>
										{/if}
										<span>{sourceLabel(item.scheduleSource)}</span>
									</div>
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{:else}
		<div
			class="rounded-2xl py-16 text-center"
			style="background: var(--surface); border: 1px solid var(--border);"
		>
			<AppIcon name="event_busy" class="text-[54px]" style="color: var(--text-faint);" />
			<p class="mt-2 font-bold" style="color: var(--text-primary);">Belum ada jadwal rilis</p>
			<a href="/episode-baru" class="mt-3 inline-flex text-sm font-bold" style="color: var(--accent);">
				Lihat episode baru
			</a>
		</div>
	{/if}
</div>

<NavigationBottom />
