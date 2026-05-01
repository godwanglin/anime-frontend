<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { onMount } from 'svelte';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type Episode = {
		id: number;
		animeId: number;
		number: number;
		title: string;
		slug: string;
		sub?: string;
		date?: string;
		status?: string;
		views?: number;
		skipIntroSeconds?: number | null;
		skipOutroSeconds?: number | null;
		createdAt?: string;
		updatedAt?: string;
		_count?: { servers: number };
		anime?: { id: number; title: string };
	};
	type AnimeOption = { id: number; title: string; slug: string };

	let items = $state<Episode[]>([]);
	let animeOptions = $state<AnimeOption[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let deleteId = $state<number | null>(null);
	let showCreate = $state(false);

	let animeId = $state<number | null>(Number(pageState.url.searchParams.get('animeId')) || null);
	let slug = $state('');
	let number = $state<number | null>(null);
	let title = $state('');
	let sub = $state('Sub');
	let date = $state('');
	let status = $state('published');
	let skipIntroSeconds = $state<string | number | null>(null);
	let skipOutroSeconds = $state<string | number | null>(null);

	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const filterAnimeId = $derived(url.searchParams.get('animeId') ?? '');
	const episodeNumber = $derived(url.searchParams.get('episodeNumber') ?? '');
	const numberFrom = $derived(url.searchParams.get('numberFrom') ?? '');
	const numberTo = $derived(url.searchParams.get('numberTo') ?? '');
	const filterStatus = $derived(url.searchParams.get('status') ?? '');
	const hasVideo = $derived(url.searchParams.get('hasVideo') ?? '');
	const createdFrom = $derived(url.searchParams.get('createdFrom') ?? '');
	const createdTo = $derived(url.searchParams.get('createdTo') ?? '');
	const updatedFrom = $derived(url.searchParams.get('updatedFrom') ?? '');
	const updatedTo = $derived(url.searchParams.get('updatedTo') ?? '');
	const sortBy = $derived(url.searchParams.get('sortBy') ?? 'latest');

	let draftAnimeId = $state('');
	let draftSearch = $state('');
	let draftEpisodeNumber = $state('');
	let draftNumberFrom = $state('');
	let draftNumberTo = $state('');
	let draftStatus = $state('');
	let draftHasVideo = $state('');
	let draftCreatedFrom = $state('');
	let draftCreatedTo = $state('');
	let draftUpdatedFrom = $state('');
	let draftUpdatedTo = $state('');
	let draftSortBy = $state('latest');

	const activeFilters = $derived(
		[
			filterAnimeId &&
				`Anime: ${animeOptions.find((anime) => String(anime.id) === filterAnimeId)?.title ?? filterAnimeId}`,
			search && `Cari: ${search}`,
			episodeNumber && `Ep: ${episodeNumber}`,
			(numberFrom || numberTo) && `Range: ${numberFrom || '-'}-${numberTo || '-'}`,
			filterStatus && `Status: ${filterStatus}`,
			hasVideo && `Video: ${hasVideo === 'true' ? 'Ada' : 'Kosong'}`,
			createdFrom && `Dibuat dari ${createdFrom}`,
			createdTo && `Dibuat sampai ${createdTo}`,
			updatedFrom && `Update dari ${updatedFrom}`,
			updatedTo && `Update sampai ${updatedTo}`,
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
		draftCreatedFrom = createdFrom;
		draftCreatedTo = createdTo;
		draftUpdatedFrom = updatedFrom;
		draftUpdatedTo = updatedTo;
		draftSortBy = sortBy;
	}

	function filterQuery(page = currentPage) {
		return toQuery({
			page,
			limit: 20,
			search,
			animeId: filterAnimeId,
			episodeNumber,
			numberFrom,
			numberTo,
			status: filterStatus,
			hasVideo,
			createdFrom,
			createdTo,
			updatedFrom,
			updatedTo,
			sortBy
		});
	}

	function applyFilters() {
		goto(
			`/admin/episodes${toQuery({
				page: 1,
				search: draftSearch.trim(),
				animeId: draftAnimeId,
				episodeNumber: draftEpisodeNumber,
				numberFrom: draftNumberFrom,
				numberTo: draftNumberTo,
				status: draftStatus,
				hasVideo: draftHasVideo,
				createdFrom: draftCreatedFrom,
				createdTo: draftCreatedTo,
				updatedFrom: draftUpdatedFrom,
				updatedTo: draftUpdatedTo,
				sortBy: draftSortBy
			})}`,
			{ noScroll: true }
		);
	}

	function resetFilters() {
		goto('/admin/episodes', { noScroll: true });
	}

	async function loadAnimeOptions() {
		const result = await adminApi<AnimeOption[]>('/anime?limit=100&sort=title');
		animeOptions = result.data;
	}

	async function load() {
		isLoading = true;
		try {
			const result = await adminApi<Episode[]>(`/episodes${filterQuery()}`);
			items = result.data;
			total = Number(result.meta.total ?? 0);
		} finally {
			isLoading = false;
		}
	}

	async function createEpisode() {
		try {
			await adminApi('/episodes', {
				method: 'POST',
				body: JSON.stringify({
					animeId,
					slug,
					number,
					title,
					sub,
					date,
					status,
					skipIntroSeconds,
					skipOutroSeconds
				})
			});
			adminToast.success('Episode dibuat');
			showCreate = false;
			await load();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal membuat episode');
		}
	}

	async function deleteEpisode() {
		if (!deleteId) return;
		await adminApi(`/episodes/${deleteId}`, { method: 'DELETE' });
		adminToast.success('Episode dihapus');
		deleteId = null;
		await load();
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
			<h2 class="text-2xl font-black">Manajemen Episode</h2>
			<p class="text-sm text-zinc-500">
				Filter episode dari server berdasarkan anime, status, video, tanggal, dan urutan.
			</p>
		</div>
		<button
			onclick={() => (showCreate = !showCreate)}
			class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">Tambah Episode</button
		>
	</div>

	{#if showCreate}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				createEpisode();
			}}
			class="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-3"
		>
			<AdminFormInput label="Anime ID" name="animeId" type="number" bind:value={animeId} required />
			<AdminFormInput label="Slug" name="slug" bind:value={slug} required />
			<AdminFormInput label="Nomor" name="number" type="number" bind:value={number} required />
			<AdminFormInput label="Judul" name="title" bind:value={title} required />
			<AdminFormInput label="Sub/Dub" name="sub" bind:value={sub} />
			<label class="block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span>
				<select
					bind:value={status}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="published">Published</option>
					<option value="draft">Draft</option>
				</select>
			</label>
			<AdminFormInput label="Tanggal" name="date" bind:value={date} />
			<AdminFormInput
				label="Skip intro (mm:ss / detik)"
				name="skipIntroSeconds"
				bind:value={skipIntroSeconds}
			/>
			<AdminFormInput
				label="Skip outro mulai (mm:ss / detik)"
				name="skipOutroSeconds"
				bind:value={skipOutroSeconds}
			/>
			<button class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white md:col-span-3"
				>Simpan Episode</button
			>
		</form>
	{/if}

	<section class="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Anime</span>
				<select
					bind:value={draftAnimeId}
					onchange={applyFilters}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="">Semua anime</option>
					{#each animeOptions as anime}
						<option value={String(anime.id)}>{anime.title}</option>
					{/each}
				</select>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Cari judul</span>
				<input
					bind:value={draftSearch}
					onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					placeholder="Judul episode..."
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Episode tepat</span>
				<input
					bind:value={draftEpisodeNumber}
					type="number"
					placeholder="Contoh: 12"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Urutan</span>
				<select
					bind:value={draftSortBy}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="latest">Latest</option>
					<option value="oldest">Oldest</option>
					<option value="mostViewed">Most viewed</option>
				</select>
			</label>
		</div>

		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Range episode dari</span>
				<input
					bind:value={draftNumberFrom}
					type="number"
					placeholder="Min"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Range episode sampai</span>
				<input
					bind:value={draftNumberTo}
					type="number"
					placeholder="Max"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span>
				<select
					bind:value={draftStatus}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="">Semua status</option>
					<option value="published">Published</option>
					<option value="draft">Draft</option>
				</select>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Video source</span>
				<select
					bind:value={draftHasVideo}
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				>
					<option value="">Semua</option>
					<option value="true">Ada video</option>
					<option value="false">Belum ada video</option>
				</select>
			</label>
		</div>

		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Created from</span>
				<input
					bind:value={draftCreatedFrom}
					type="date"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Created to</span>
				<input
					bind:value={draftCreatedTo}
					type="date"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Updated from</span>
				<input
					bind:value={draftUpdatedFrom}
					type="date"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
			<label>
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Updated to</span>
				<input
					bind:value={draftUpdatedTo}
					type="date"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>
		</div>

		<div
			class="flex flex-col gap-3 border-t border-zinc-800 pt-4 lg:flex-row lg:items-center lg:justify-between"
		>
			<div class="flex flex-wrap gap-2">
				{#each activeFilters as filter}
					<span class="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-200"
						>{filter}</span
					>
				{:else}
					<span class="text-xs font-semibold text-zinc-500">Tidak ada filter aktif</span>
				{/each}
			</div>
			<div class="flex gap-2">
				<button
					onclick={resetFilters}
					class="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800"
					>Reset Filter</button
				>
				<button
					onclick={applyFilters}
					class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
					>Apply Filter</button
				>
			</div>
		</div>
	</section>

	<AdminTable
		columns={[
			{ key: 'episode', label: 'Episode' },
			{ key: 'anime', label: 'Anime' },
			{ key: 'status', label: 'Status' },
			{ key: 'video', label: 'Video' },
			{ key: 'views', label: 'Views' },
			{ key: 'actions', label: 'Aksi' }
		]}
		data={items as any}
		{isLoading}
	>
		{#snippet children(row)}
			<td class="px-4 py-3"
				><p class="font-bold">Ep {row.number} - {row.title}</p>
				<p class="text-xs text-zinc-500">{row.slug}</p></td
			>
			<td class="px-4 py-3">{row.anime?.title ?? row.animeId}</td>
			<td class="px-4 py-3"
				><span
					class="rounded-full px-2 py-1 text-xs font-bold {row.status === 'draft'
						? 'bg-amber-500/15 text-amber-300'
						: 'bg-emerald-500/15 text-emerald-300'}">{row.status ?? 'published'}</span
				></td
			>
			<td class="px-4 py-3">{row._count?.servers ? `${row._count.servers} server` : '-'}</td>
			<td class="px-4 py-3">{Number(row.views ?? 0).toLocaleString('id-ID')}</td>
			<td class="px-4 py-3">
				<div class="flex flex-wrap gap-2">
					<a
						href="/admin/episodes/{row.id}/upload"
						class="inline-flex items-center gap-1 rounded-lg border border-violet-500/60 px-2 py-1 text-violet-200 hover:bg-violet-500/10"
					>
						<AppIcon name="cloud_upload" class="text-[16px]" />
						Upload
					</a>
					<a href="/admin/episodes/{row.id}" class="rounded-lg border border-zinc-700 px-2 py-1"
						>Edit</a
					>
					<button
						onclick={() => (deleteId = row.id)}
						class="rounded-lg border border-red-900 px-2 py-1 text-red-400">Hapus</button
					>
				</div>
			</td>
		{/snippet}
	</AdminTable>

	<AdminPagination
		{total}
		page={currentPage}
		limit={20}
		onChange={(page) => goto(`/admin/episodes${filterQuery(page)}`, { noScroll: true })}
	/>
</div>

<AdminModal
	open={Boolean(deleteId)}
	title="Hapus episode?"
	message="Episode akan dihapus permanen."
	danger
	onClose={() => (deleteId = null)}
	onConfirm={deleteEpisode}
/>
