<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { onMount } from 'svelte';
	import { adminApi, toQuery } from '$lib/admin/api';
	import {
		listEpisodes,
		type EpisodeListParams,
		type EpisodeSummary
	} from '$lib/admin/subtitle-studio';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type AnimeOption = { id: number; title: string; slug: string };

	const limit = 20;

	let episodes = $state<EpisodeSummary[]>([]);
	let animeOptions = $state<AnimeOption[]>([]);
	let total = $state(0);
	let isLoading = $state(true);

	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const filterAnimeId = $derived(url.searchParams.get('animeId') ?? '');
	const episodeNumber = $derived(url.searchParams.get('episodeNumber') ?? '');
	const numberFrom = $derived(url.searchParams.get('numberFrom') ?? '');
	const numberTo = $derived(url.searchParams.get('numberTo') ?? '');
	const filterStatus = $derived(url.searchParams.get('status') ?? '');
	const hasVideo = $derived(url.searchParams.get('hasVideo') ?? 'true');
	const hasSubtitle = $derived(url.searchParams.get('hasSubtitle') ?? '');
	const sortBy = $derived(url.searchParams.get('sortBy') ?? 'latest');

	let draftAnimeId = $state('');
	let draftSearch = $state('');
	let draftEpisodeNumber = $state('');
	let draftNumberFrom = $state('');
	let draftNumberTo = $state('');
	let draftStatus = $state('');
	let draftHasVideo = $state('true');
	let draftHasSubtitle = $state('');
	let draftSortBy = $state('latest');

	const activeFilters = $derived(
		[
			filterAnimeId &&
				`Anime: ${animeOptions.find((anime) => String(anime.id) === filterAnimeId)?.title ?? filterAnimeId}`,
			search && `Cari: ${search}`,
			episodeNumber && `Ep: ${episodeNumber}`,
			(numberFrom || numberTo) && `Range: ${numberFrom || '-'}-${numberTo || '-'}`,
			filterStatus && `Status: ${filterStatus}`,
			hasVideo !== '' && `Video: ${hasVideo === 'true' ? 'Ada' : 'Kosong'}`,
			hasSubtitle && `Subtitle: ${hasSubtitle === 'true' ? 'Ada' : 'Belum ada'}`,
			sortBy !== 'latest' && `Sort: ${sortBy === 'oldest' ? 'Terlama' : 'Most viewed'}`
		].filter(Boolean) as string[]
	);

	function syncDraftsFromUrl() {
		draftAnimeId = filterAnimeId;
		draftSearch = search;
		draftEpisodeNumber = episodeNumber;
		draftNumberFrom = numberFrom;
		draftNumberTo = numberTo;
		draftStatus = filterStatus;
		draftHasVideo = hasVideo;
		draftHasSubtitle = hasSubtitle;
		draftSortBy = sortBy;
	}

	function buildParams(page = currentPage): EpisodeListParams {
		return {
			page,
			limit,
			search,
			animeId: filterAnimeId,
			episodeNumber,
			numberFrom,
			numberTo,
			status: filterStatus,
			hasVideo,
			hasSubtitle,
			sortBy
		};
	}

	function filterQuery(page = currentPage) {
		return toQuery(buildParams(page));
	}

	function applyFilters() {
		goto(
			`/admin/subtitle-studio${toQuery({
				page: 1,
				limit,
				search: draftSearch.trim(),
				animeId: draftAnimeId,
				episodeNumber: draftEpisodeNumber,
				numberFrom: draftNumberFrom,
				numberTo: draftNumberTo,
				status: draftStatus,
				hasVideo: draftHasVideo,
				hasSubtitle: draftHasSubtitle,
				sortBy: draftSortBy
			})}`,
			{ noScroll: true }
		);
	}

	function resetFilters() {
		goto('/admin/subtitle-studio', { noScroll: true });
	}

	async function loadAnimeOptions() {
		try {
			const result = await adminApi<AnimeOption[]>('/anime?limit=100&sort=title');
			animeOptions = result.data;
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat daftar anime');
		}
	}

	async function load() {
		isLoading = true;
		try {
			const result = await listEpisodes(buildParams());
			episodes = result.data;
			total = Number(result.meta.total ?? 0);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal memuat episode');
		} finally {
			isLoading = false;
		}
	}

	function formatDate(value?: string) {
		if (!value) return '-';
		return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(
			new Date(value)
		);
	}

	$effect(() => {
		url;
		syncDraftsFromUrl();
		load();
	});

	onMount(loadAnimeOptions);
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<h2 class="text-2xl font-black">Subtitle Studio</h2>
			<p class="text-sm text-zinc-500">Pilih episode untuk mengatur subtitle per video server.</p>
		</div>
	</div>

	<section class="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Anime</span>
				<select bind:value={draftAnimeId} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
					<option value="">Semua anime</option>
					{#each animeOptions as anime}
						<option value={String(anime.id)}>{anime.title}</option>
					{/each}
				</select>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Cari judul</span>
				<input bind:value={draftSearch} onkeydown={(event) => event.key === 'Enter' && applyFilters()} placeholder="Judul episode..." class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" />
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Episode tepat</span>
				<input bind:value={draftEpisodeNumber} type="number" placeholder="Contoh: 12" class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" />
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Urutan</span>
				<select bind:value={draftSortBy} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
					<option value="latest">Terbaru</option>
					<option value="oldest">Terlama</option>
					<option value="mostViewed">Most viewed</option>
				</select>
			</label>
		</div>

		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Range episode dari</span>
				<input bind:value={draftNumberFrom} type="number" placeholder="Min" class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" />
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Range episode sampai</span>
				<input bind:value={draftNumberTo} type="number" placeholder="Max" class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" />
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Status episode</span>
				<select bind:value={draftStatus} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
					<option value="">Semua status</option>
					<option value="published">Published</option>
					<option value="draft">Draft</option>
				</select>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Video source</span>
				<select bind:value={draftHasVideo} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
					<option value="">Semua</option>
					<option value="true">Ada video</option>
					<option value="false">Belum ada video</option>
				</select>
			</label>
		</div>

		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Subtitle track</span>
				<select bind:value={draftHasSubtitle} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
					<option value="">Semua</option>
					<option value="true">Sudah ada subtitle</option>
					<option value="false">Belum ada subtitle</option>
				</select>
			</label>
		</div>

		<div class="flex flex-col gap-3 border-t border-zinc-800 pt-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex flex-wrap gap-2">
				{#each activeFilters as filter}
					<span class="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200">{filter}</span>
				{:else}
					<span class="text-xs font-semibold text-zinc-500">Tidak ada filter aktif</span>
				{/each}
			</div>
			<div class="flex gap-2">
				<button onclick={resetFilters} class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">Reset Filter</button>
				<button onclick={applyFilters} class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Apply Filter</button>
			</div>
		</div>
	</section>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900">
		{#if isLoading}
			<div class="p-8 text-center text-zinc-400">Memuat episode...</div>
		{:else if episodes.length}
			<div class="divide-y divide-zinc-800">
				{#each episodes as episode}
					<a
						href="/admin/subtitle-studio/{episode.id}"
						class="grid gap-3 px-4 py-4 transition hover:bg-zinc-800/70 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
					>
						<div class="min-w-0">
							<p class="font-black">Episode {episode.number ?? episode.id} - {episode.title}</p>
							<p class="truncate text-xs text-zinc-500">
								{episode.anime?.title ?? `Anime ID ${episode.animeId ?? '-'}`}
								{episode.slug ? ` - ${episode.slug}` : ''}
							</p>
							<p class="mt-1 text-xs text-zinc-600">Update: {formatDate(episode.updatedAt ?? episode.createdAt)}</p>
						</div>
						<div class="flex flex-wrap gap-2 text-xs font-bold lg:justify-end">
							<span class="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{episode.status ?? 'published'}</span>
							<span class="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{episode._count?.servers ?? 0} server</span>
							<span class="rounded-full bg-violet-500/15 px-2 py-1 text-violet-200">{episode._count?.subtitleTracks ?? episode._count?.subtitles ?? 0} track</span>
							<span class="rounded-full bg-zinc-800 px-2 py-1 text-zinc-300">{Number(episode.views ?? 0).toLocaleString('id-ID')} views</span>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="p-8 text-center">
				<p class="font-black">Episode tidak ditemukan</p>
				<p class="mt-1 text-sm text-zinc-500">
					Coba ubah filter atau tambahkan video server dulu.
				</p>
			</div>
		{/if}
	</section>

	<AdminPagination {total} page={currentPage} {limit} onChange={(page) => goto(`/admin/subtitle-studio${filterQuery(page)}`, { noScroll: true })} />
</div>
