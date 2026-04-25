<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import AdminStatusBadge from '$lib/components/admin/AdminStatusBadge.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type Anime = {
		id: number;
		title: string;
		slug: string;
		thumbnail?: string;
		type?: string;
		status?: string;
		rating?: number;
		totalEpisodes?: number;
		_count?: { episodes: number };
	};
	let items = $state<Anime[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let selected = $state<number[]>([]);
	let confirmOpen = $state(false);
	let deleteIds = $state<number[]>([]);

	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const status = $derived(url.searchParams.get('status') ?? '');
	const type = $derived(url.searchParams.get('type') ?? '');

	function setParams(next: Record<string, string | number>) {
		goto(`/admin/anime${toQuery({ page: currentPage, search, status, type, ...next })}`, {
			noScroll: true
		});
	}

	async function load() {
		isLoading = true;
		try {
			const result = await adminApi<Anime[]>(
				`/anime${toQuery({ page: currentPage, limit: 20, search, status, type })}`
			);
			items = result.data;
			total = Number(result.meta.total ?? 0);
		} finally {
			isLoading = false;
		}
	}

	function askDelete(ids: number[]) {
		deleteIds = ids;
		confirmOpen = true;
	}

	async function confirmDelete() {
		try {
			if (deleteIds.length > 1)
				await adminApi('/anime/bulk-delete', {
					method: 'POST',
					body: JSON.stringify({ ids: deleteIds })
				});
			else await adminApi(`/anime/${deleteIds[0]}`, { method: 'DELETE' });
			adminToast.success('Anime berhasil dihapus');
			selected = [];
			await load();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal hapus anime');
		} finally {
			confirmOpen = false;
		}
	}

	$effect(() => {
		url;
		load();
	});
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<div>
			<h2 class="text-2xl font-black">Manajemen Anime</h2>
			<p class="text-sm text-zinc-500">Kelola katalog, metadata, genre, dan episode.</p>
		</div>
		<a
			href="/admin/anime/new"
			class="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
		>
			<span class="material-symbols-rounded text-[18px]">add</span>
			Tambah Anime
		</a>
	</div>

	<div
		class="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 lg:grid-cols-[1fr_180px_180px]"
	>
		<AdminSearchBar
			value={search}
			placeholder="Cari anime..."
			onSearch={(value) => setParams({ search: value, page: 1 })}
		/>
		<select
			value={status}
			onchange={(e) => setParams({ status: e.currentTarget.value, page: 1 })}
			class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
		>
			<option value="">Semua status</option>
			<option value="Ongoing">Ongoing</option>
			<option value="Completed">Completed</option>
		</select>
		<select
			value={type}
			onchange={(e) => setParams({ type: e.currentTarget.value, page: 1 })}
			class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
		>
			<option value="">Semua type</option>
			<option value="Anime">Anime</option>
			<option value="Movie">Movie</option>
			<option value="Donghua">Donghua</option>
		</select>
	</div>

	{#if selected.length}
		<button
			onclick={() => askDelete(selected)}
			class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
			>Hapus Terpilih ({selected.length})</button
		>
	{/if}

	<AdminTable
		columns={[
			{ key: 'anime', label: 'Anime' },
			{ key: 'type', label: 'Type' },
			{ key: 'status', label: 'Status' },
			{ key: 'episodes', label: 'Episodes' },
			{ key: 'rating', label: 'Rating' },
			{ key: 'actions', label: 'Aksi' }
		]}
		data={items as any}
		bind:selected
		selectable
		{isLoading}
	>
		{#snippet children(row)}
			<td class="px-4 py-3">
				<button
					onclick={() => goto(`/admin/anime/${row.id}`)}
					class="flex items-center gap-3 text-left"
				>
					<img
						src={row.thumbnail ?? '/icon.png'}
						alt={row.title}
						class="h-12 w-10 rounded-lg object-cover"
					/>
					<div>
						<p class="font-bold text-zinc-100">{row.title}</p>
						<p class="text-xs text-zinc-500">{row.slug}</p>
					</div>
				</button>
			</td>
			<td class="px-4 py-3">{row.type ?? '-'}</td>
			<td class="px-4 py-3"><AdminStatusBadge status={row.status} /></td>
			<td class="px-4 py-3">{row._count?.episodes ?? row.totalEpisodes ?? 0}</td>
			<td class="px-4 py-3">{row.rating ?? '-'}</td>
			<td class="px-4 py-3">
				<div class="flex gap-2">
					<a
						href="/admin/anime/{row.id}"
						class="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-800"
						><span class="material-symbols-rounded text-[18px]">edit</span></a
					>
					<button
						onclick={() => askDelete([row.id])}
						class="rounded-lg border border-red-900/60 p-2 text-red-400 hover:bg-red-950"
						><span class="material-symbols-rounded text-[18px]">delete</span></button
					>
				</div>
			</td>
		{/snippet}
	</AdminTable>

	<AdminPagination {total} page={currentPage} limit={20} onChange={(page) => setParams({ page })} />
</div>

<AdminModal
	open={confirmOpen}
	title="Hapus anime?"
	message={`Hapus ${deleteIds.length} anime? Episode terkait ikut terhapus.`}
	danger
	onClose={() => (confirmOpen = false)}
	onConfirm={confirmDelete}
/>
