<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type Comment = { id: number; content: string | null; isDeleted: boolean; createdAt: string; user: { username: string }; anime?: { title: string }; episode?: { number: number; title: string } };
	let items = $state<Comment[]>([]);
	let selected = $state<number[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let deleteIds = $state<number[]>([]);
	let hard = $state(false);
	let confirmOpen = $state(false);
	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const deleted = $derived(url.searchParams.get('deleted') ?? '');

	function setParams(next: Record<string, string | number>) {
		goto(`/admin/comments${toQuery({ page: currentPage, search, deleted, ...next })}`, { noScroll: true });
	}

	async function load() {
		isLoading = true;
		const result = await adminApi<Comment[]>(`/comments${toQuery({ page: currentPage, limit: 20, search, deleted })}`);
		items = result.data;
		total = Number(result.meta.total ?? 0);
		isLoading = false;
	}

	function askDelete(ids: number[]) {
		deleteIds = ids;
		confirmOpen = true;
	}

	async function confirmDelete() {
		try {
			if (deleteIds.length > 1) await adminApi('/comments/bulk', { method: 'DELETE', body: JSON.stringify({ ids: deleteIds, hard }) });
			else await adminApi(`/comments/${deleteIds[0]}`, { method: 'DELETE', body: JSON.stringify({ hard }) });
			adminToast.success('Komentar dihapus');
			selected = [];
			await load();
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal hapus komentar');
		} finally {
			confirmOpen = false;
			hard = false;
		}
	}

	async function restore(id: number) {
		await adminApi(`/comments/${id}/restore`, { method: 'POST' });
		adminToast.success('Komentar direstore');
		await load();
	}

	$effect(() => {
		url;
		load();
	});
</script>

<div class="space-y-4">
	<div><h2 class="text-2xl font-black">Moderasi Komentar</h2><p class="text-sm text-zinc-500">Soft delete, hard delete, restore, dan bulk moderation.</p></div>
	<div class="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_180px]">
		<AdminSearchBar value={search} placeholder="Search komentar..." onSearch={(value) => setParams({ search: value, page: 1 })} />
		<select value={deleted} onchange={(e) => setParams({ deleted: e.currentTarget.value, page: 1 })} class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
			<option value="">Semua</option><option value="false">Aktif</option><option value="true">Dihapus</option>
		</select>
	</div>
	{#if selected.length}
		<button onclick={() => askDelete(selected)} class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Hapus Terpilih ({selected.length})</button>
	{/if}
	<AdminTable columns={[{ key: 'content', label: 'Komentar' }, { key: 'user', label: 'User' }, { key: 'anime', label: 'Anime/Episode' }, { key: 'time', label: 'Waktu' }, { key: 'actions', label: 'Aksi' }]} data={items as any} bind:selected selectable {isLoading}>
		{#snippet children(row)}
			<td class="max-w-md px-4 py-3"><p class="line-clamp-2 {row.isDeleted ? 'italic text-zinc-500' : ''}">{row.isDeleted ? '[Komentar dihapus]' : row.content}</p></td>
			<td class="px-4 py-3">{row.user?.username}</td>
			<td class="px-4 py-3"><p>{row.anime?.title ?? '-'}</p>{#if row.episode}<p class="text-xs text-zinc-500">Ep {row.episode.number}</p>{/if}</td>
			<td class="px-4 py-3">{new Date(row.createdAt).toLocaleString('id-ID')}</td>
			<td class="px-4 py-3">
				{#if row.isDeleted}
					<button onclick={() => restore(row.id)} class="mr-2 rounded-lg border border-zinc-700 px-2 py-1">Restore</button>
				{/if}
				<button onclick={() => askDelete([row.id])} class="rounded-lg border border-red-900 px-2 py-1 text-red-400">Hapus</button>
			</td>
		{/snippet}
	</AdminTable>
	<AdminPagination {total} page={currentPage} limit={20} onChange={(page) => setParams({ page })} />
</div>

<AdminModal open={confirmOpen} title="Hapus komentar?" message={`Hapus ${deleteIds.length} komentar. Centang hard delete jika ingin permanen.`} danger onClose={() => (confirmOpen = false)} onConfirm={confirmDelete} />
{#if confirmOpen}
	<div class="fixed left-1/2 top-[calc(50%+70px)] z-[80] -translate-x-1/2">
		<label class="flex items-center gap-2 text-sm font-bold text-zinc-300"><input type="checkbox" bind:checked={hard} class="accent-red-600" /> Hard delete</label>
	</div>
{/if}
