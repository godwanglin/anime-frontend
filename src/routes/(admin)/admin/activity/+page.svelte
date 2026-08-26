<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminApi, toQuery } from '$lib/admin/api';
	import { imageUrl } from '$lib/image-url';
	import { onMount } from 'svelte';

	type ActivityUser = {
		user: {
			id: number;
			email: string;
			username: string;
			fullName: string | null;
			avatar: string | null;
			role: string;
			createdAt: string;
		};
		online: boolean;
		lastSeenAt: string | null;
		current: {
			path: string | null;
			title: string | null;
			watching: {
				animeTitle: string | null;
				episodeTitle: string | null;
				episodeNumber: number | null;
			} | null;
		} | null;
		counts: { history: number; saved: number; comments: number };
		lastComment: {
			content: string | null;
			createdAt: string;
			anime: { title: string; slug: string } | null;
			episode: { title: string; slug: string; number: number } | null;
		} | null;
		recentSaved: {
			animeTitle: string;
			animeSlug: string;
			animeThumbnail: string;
			savedAt: string;
		}[];
		recentHistory: {
			animeTitle: string;
			animeSlug: string;
			episodeTitle: string;
			episodeSlug: string;
			episodeNumber: number;
			progressPct: number;
			updatedAt: string;
		}[];
	};

	type ActivityResponse = {
		rows: ActivityUser[];
		summary: {
			online: number;
			watching: number;
			tracked: number;
			pollingSeconds: number;
			onlineWindowSeconds: number;
		};
	};

	let rows = $state<ActivityUser[]>([]);
	let summary = $state<ActivityResponse['summary'] | null>(null);
	let loading = $state(true);
	let error = $state('');
	let q = $state('');
	let onlineOnly = $state(false);
	let lastRefreshAt = $state<Date | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;

	async function load() {
		error = '';
		try {
			const query = toQuery({ q, onlineOnly, limit: 60 });
			const response = await adminApi<ActivityResponse>(`/activity/users${query}`);
			rows = response.data.rows;
			summary = response.data.summary;
			lastRefreshAt = new Date();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat aktivitas user';
		} finally {
			loading = false;
		}
	}

	function displayName(item: ActivityUser) {
		return item.user.fullName || item.user.username;
	}

	function initials(item: ActivityUser) {
		return displayName(item).slice(0, 1).toUpperCase();
	}

	function timeAgo(value?: string | null) {
		if (!value) return 'Belum terlacak';
		const diff = Date.now() - new Date(value).getTime();
		const minutes = Math.max(0, Math.floor(diff / 60_000));
		if (minutes < 1) return 'Baru saja';
		if (minutes < 60) return `${minutes} menit lalu`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} jam lalu`;
		return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
	}

	function watchingLabel(item: ActivityUser) {
		const watching = item.current?.watching;
		if (!watching) return null;
		const episode = watching.episodeNumber ? ` Ep ${watching.episodeNumber}` : '';
		return `${watching.animeTitle ?? 'Anime'}${episode}`;
	}

	onMount(() => {
		load();
		timer = setInterval(load, 60_000);
		return () => {
			if (timer) clearInterval(timer);
		};
	});
</script>

<section class="space-y-5">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.18em] text-violet-400">Live ringan</p>
			<h2 class="mt-1 text-2xl font-black text-zinc-50">Aktivitas User</h2>
			<p class="mt-1 text-sm text-zinc-500">
				Heartbeat user dan data akun dipoll tiap 60 detik, tanpa koneksi realtime berat.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<label
				class="flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-bold text-zinc-300"
			>
				<input bind:checked={onlineOnly} onchange={load} type="checkbox" class="accent-violet-500" />
				Online saja
			</label>
			<button
				type="button"
				onclick={load}
				class="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500"
			>
				<AppIcon name="refresh" class="text-[18px]" />
				Refresh
			</button>
		</div>
	</div>

	<div class="grid gap-3 md:grid-cols-4">
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold text-zinc-500">Online</p>
			<p class="mt-2 text-2xl font-black text-emerald-300">{summary?.online ?? 0}</p>
		</div>
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold text-zinc-500">Sedang Nonton</p>
			<p class="mt-2 text-2xl font-black text-violet-300">{summary?.watching ?? 0}</p>
		</div>
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold text-zinc-500">User Ditampilkan</p>
			<p class="mt-2 text-2xl font-black text-zinc-100">{summary?.tracked ?? rows.length}</p>
		</div>
		<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<p class="text-xs font-bold text-zinc-500">Update Terakhir</p>
			<p class="mt-2 text-sm font-black text-zinc-100">{timeAgo(lastRefreshAt?.toISOString())}</p>
		</div>
	</div>

	<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
		<form class="flex gap-2" onsubmit={(event) => { event.preventDefault(); load(); }}>
			<div class="relative flex-1">
				<AppIcon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-600" />
				<input
					bind:value={q}
					placeholder="Cari username, nama, atau email"
					class="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-sm font-semibold text-zinc-100 outline-none focus:border-violet-500"
				/>
			</div>
			<button class="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-black text-zinc-200 hover:bg-zinc-900">
				Cari
			</button>
		</form>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
			{error}
		</div>
	{/if}

	<div class="space-y-3">
		{#if loading}
			<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-center text-sm font-bold text-zinc-500">
				Memuat aktivitas...
			</div>
		{:else if rows.length === 0}
			<div class="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
				<AppIcon name="person_search" class="mx-auto text-[34px] text-zinc-600" />
				<p class="mt-2 text-sm font-black text-zinc-300">Belum ada aktivitas yang cocok</p>
				<p class="mt-1 text-xs text-zinc-500">User akan muncul setelah login dan app mengirim heartbeat.</p>
			</div>
		{:else}
			{#each rows as item}
				<article class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
					<div class="grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(300px,1fr)_minmax(300px,1fr)]">
						<div class="min-w-0">
							<div class="flex items-center gap-3">
								{#if item.user.avatar}
									<img src={imageUrl(item.user.avatar)} alt={displayName(item)} class="h-11 w-11 rounded-full object-cover" />
								{:else}
									<div class="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
										{initials(item)}
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="h-2.5 w-2.5 rounded-full {item.online ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
										<p class="truncate text-sm font-black text-zinc-50">{displayName(item)}</p>
									</div>
									<p class="truncate text-xs text-zinc-500">@{item.user.username} · {item.user.email}</p>
								</div>
							</div>
							<div class="mt-4 grid grid-cols-3 gap-2 text-center">
								<div class="rounded-lg bg-zinc-950 px-2 py-2">
									<p class="text-sm font-black text-zinc-100">{item.counts.history}</p>
									<p class="text-[10px] font-bold text-zinc-600">History</p>
								</div>
								<div class="rounded-lg bg-zinc-950 px-2 py-2">
									<p class="text-sm font-black text-zinc-100">{item.counts.saved}</p>
									<p class="text-[10px] font-bold text-zinc-600">Simpan</p>
								</div>
								<div class="rounded-lg bg-zinc-950 px-2 py-2">
									<p class="text-sm font-black text-zinc-100">{item.counts.comments}</p>
									<p class="text-[10px] font-bold text-zinc-600">Komentar</p>
								</div>
							</div>
						</div>

						<div class="min-w-0 rounded-lg bg-zinc-950 p-3">
							<p class="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">Saat Ini</p>
							{#if watchingLabel(item)}
								<p class="line-clamp-1 text-sm font-black text-violet-200">{watchingLabel(item)}</p>
							{:else}
								<p class="line-clamp-1 text-sm font-black text-zinc-200">{item.current?.title ?? 'Tidak sedang menonton'}</p>
							{/if}
							<p class="mt-1 line-clamp-1 text-xs text-zinc-500">{item.current?.path ?? 'Belum ada halaman aktif'}</p>
							<p class="mt-3 text-xs font-bold {item.online ? 'text-emerald-300' : 'text-zinc-500'}">
								{item.online ? 'Online' : 'Offline'} · {timeAgo(item.lastSeenAt)}
							</p>

							<div class="mt-4">
								<p class="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">Komentar Terakhir</p>
								{#if item.lastComment}
									<p class="line-clamp-2 text-xs leading-5 text-zinc-300">{item.lastComment.content}</p>
									<p class="mt-1 text-[11px] font-bold text-zinc-600">
										{item.lastComment.anime?.title ?? 'Anime'} · {timeAgo(item.lastComment.createdAt)}
									</p>
								{:else}
									<p class="text-xs text-zinc-600">Belum ada komentar.</p>
								{/if}
							</div>
						</div>

						<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
							<div class="rounded-lg bg-zinc-950 p-3">
								<p class="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">History</p>
								<div class="space-y-2">
									{#each item.recentHistory.slice(0, 3) as history}
										<a href={`/anime/${history.animeSlug}/${history.episodeSlug}`} class="block rounded-md px-2 py-1.5 hover:bg-zinc-900">
											<p class="line-clamp-1 text-xs font-black text-zinc-200">
												{history.animeTitle} Ep {history.episodeNumber}
											</p>
											<p class="text-[11px] text-zinc-600">{Math.round(history.progressPct)}% · {timeAgo(history.updatedAt)}</p>
										</a>
									{:else}
										<p class="text-xs text-zinc-600">Kosong.</p>
									{/each}
								</div>
							</div>
							<div class="rounded-lg bg-zinc-950 p-3">
								<p class="mb-2 text-[11px] font-black uppercase tracking-widest text-zinc-500">Disimpan</p>
								<div class="space-y-2">
									{#each item.recentSaved.slice(0, 3) as saved}
										<a href={`/anime/${saved.animeSlug}`} class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-900">
											<img src={imageUrl(saved.animeThumbnail)} alt={saved.animeTitle} class="h-8 w-8 rounded object-cover" />
											<div class="min-w-0">
												<p class="line-clamp-1 text-xs font-black text-zinc-200">{saved.animeTitle}</p>
												<p class="text-[11px] text-zinc-600">{timeAgo(saved.savedAt)}</p>
											</div>
										</a>
									{:else}
										<p class="text-xs text-zinc-600">Kosong.</p>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</article>
			{/each}
		{/if}
	</div>
</section>
