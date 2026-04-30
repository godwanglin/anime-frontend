<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import AdminSlideOver from '$lib/components/admin/AdminSlideOver.svelte';
	import AdminStatusBadge from '$lib/components/admin/AdminStatusBadge.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { displayUserName, userInitial } from '$lib/user-display';

	type User = {
		id: number;
		username: string;
		fullName?: string | null;
		email: string;
		avatar?: string;
		role: string;
		isVerified: boolean;
		exp: number;
		level: number;
		lastExpGainAt?: string | null;
		createdAt: string;
		stats?: { watchCount: number; savedCount: number; commentCount: number };
	};
	let users = $state<User[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let selectedUser = $state<User | null>(null);
	let deleteId = $state<number | null>(null);
	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const role = $derived(url.searchParams.get('role') ?? '');

	function setParams(next: Record<string, string | number>) {
		goto(`/admin/users${toQuery({ page: currentPage, search, role, ...next })}`, { noScroll: true });
	}

	async function load() {
		isLoading = true;
		const result = await adminApi<User[]>(`/users${toQuery({ page: currentPage, limit: 20, search, role })}`);
		users = result.data;
		total = Number(result.meta.total ?? 0);
		isLoading = false;
	}

	async function openUser(id: number) {
		selectedUser = (await adminApi<User>(`/users/${id}`)).data;
	}

	function formatExp(value: number) {
		return Number(value ?? 0).toLocaleString('id-ID');
	}

	function formatJoined(value: string) {
		const date = new Date(value);
		return `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		})}`;
	}

	async function saveUser() {
		if (!selectedUser) return;
		selectedUser = (
			await adminApi<User>(`/users/${selectedUser.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					role: selectedUser.role,
					isVerified: selectedUser.isVerified,
					level: Number(selectedUser.level),
					exp: Number(selectedUser.exp)
				})
			})
		).data;
		adminToast.success('Data user diperbarui');
		await load();
	}

	async function deleteUser() {
		if (!deleteId) return;
		await adminApi(`/users/${deleteId}`, { method: 'DELETE' });
		adminToast.success('User dihapus');
		deleteId = null;
		selectedUser = null;
		await load();
	}

	$effect(() => {
		url;
		load();
	});
</script>

<div class="space-y-4">
	<div><h2 class="text-2xl font-black">Manajemen User</h2><p class="text-sm text-zinc-500">Kelola akun, role, dan statistik user.</p></div>
	<div class="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_180px]">
		<AdminSearchBar value={search} placeholder="Search user..." onSearch={(value) => setParams({ search: value, page: 1 })} />
		<select value={role} onchange={(e) => setParams({ role: e.currentTarget.value, page: 1 })} class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm">
			<option value="">Semua role</option><option value="user">User</option><option value="admin">Admin</option>
		</select>
	</div>
	<AdminTable columns={[{ key: 'user', label: 'User' }, { key: 'email', label: 'Email' }, { key: 'level', label: 'Level' }, { key: 'exp', label: 'EXP' }, { key: 'role', label: 'Role' }, { key: 'joined', label: 'Bergabung' }, { key: 'actions', label: 'Aksi' }]} data={users as any} {isLoading}>
		{#snippet children(row)}
			<td class="px-4 py-3"><button onclick={() => openUser(row.id)} class="flex items-center gap-3 text-left"><img src={row.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayUserName(row))}`} alt={displayUserName(row)} class="h-10 w-10 rounded-full" /><span class="inline-flex items-center gap-1.5 font-bold">{displayUserName(row)}{#if row.isVerified}<img src="/badges/verify.png" alt="Verified" class="h-4 w-4 object-contain" />{/if}</span></button></td>
			<td class="px-4 py-3">{row.email}</td>
			<td class="px-4 py-3"><span class="rounded-full border border-violet-900/60 bg-violet-950/40 px-2.5 py-1 text-xs font-black text-violet-200">Lv {row.level ?? 1}</span></td>
			<td class="px-4 py-3 font-semibold text-zinc-300">{formatExp(row.exp)} EXP</td>
			<td class="px-4 py-3"><AdminStatusBadge status={row.role} /></td>
			<td class="px-4 py-3">{formatJoined(row.createdAt)}</td>
			<td class="px-4 py-3"><button onclick={() => openUser(row.id)} class="mr-2 rounded-lg border border-zinc-700 px-2 py-1">Edit</button><button onclick={() => (deleteId = row.id)} class="rounded-lg border border-red-900 px-2 py-1 text-red-400">Hapus</button></td>
		{/snippet}
	</AdminTable>
	<AdminPagination {total} page={currentPage} limit={20} onChange={(page) => setParams({ page })} />
</div>

<AdminSlideOver open={Boolean(selectedUser)} title="Detail User" onClose={() => (selectedUser = null)}>
	{#if selectedUser}
		<div class="space-y-5">
			<div class="text-center">
				<img src={selectedUser.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayUserName(selectedUser))}`} alt={displayUserName(selectedUser)} class="mx-auto h-24 w-24 rounded-full bg-zinc-800" />
				<h3 class="mt-3 inline-flex items-center justify-center gap-2 text-xl font-black">
					{displayUserName(selectedUser) || userInitial(selectedUser)}
					{#if selectedUser.isVerified}
						<img src="/badges/verify.png" alt="Verified" class="h-5 w-5 object-contain" />
					{/if}
				</h3>
				<p class="text-sm text-zinc-500">{selectedUser.email}</p>
			</div>
			<label class="block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">Role</span><select bind:value={selectedUser.role} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"><option value="user">user</option><option value="admin">admin</option></select></label>
			<label class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
				<span>
					<span class="block text-sm font-black text-zinc-100">Verified user</span>
					<span class="text-xs text-zinc-500">Tampilkan badge verify di profil dan komentar.</span>
				</span>
				<input bind:checked={selectedUser.isVerified} type="checkbox" class="h-5 w-5 accent-violet-600" />
			</label>
			<div class="grid grid-cols-2 gap-3">
				<label class="block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">Level</span><input bind:value={selectedUser.level} type="number" min="1" step="1" class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" /></label>
				<label class="block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">EXP</span><input bind:value={selectedUser.exp} type="number" min="0" step="1" class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm" /></label>
			</div>
			<div class="rounded-xl border border-violet-900/50 bg-violet-950/30 p-3">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-bold text-zinc-400">Progress user</p>
					<span class="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-black text-white">Lv {selectedUser.level}</span>
				</div>
				<p class="mt-1 text-sm font-black text-white">{formatExp(selectedUser.exp)} EXP</p>
				{#if selectedUser.lastExpGainAt}
					<p class="mt-1 text-xs text-zinc-500">EXP terakhir: {new Date(selectedUser.lastExpGainAt).toLocaleString('id-ID')}</p>
				{/if}
			</div>
			<div class="grid grid-cols-3 gap-2 text-center">
				<div class="rounded-xl bg-zinc-900 p-3"><p class="text-lg font-black">{selectedUser.stats?.watchCount ?? 0}</p><p class="text-xs text-zinc-500">Tontonan</p></div>
				<div class="rounded-xl bg-zinc-900 p-3"><p class="text-lg font-black">{selectedUser.stats?.savedCount ?? 0}</p><p class="text-xs text-zinc-500">Tersimpan</p></div>
				<div class="rounded-xl bg-zinc-900 p-3"><p class="text-lg font-black">{selectedUser.stats?.commentCount ?? 0}</p><p class="text-xs text-zinc-500">Komentar</p></div>
			</div>
			<button onclick={saveUser} class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">Simpan User</button>
			<button onclick={() => (deleteId = selectedUser?.id ?? null)} class="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white">Hapus Akun</button>
		</div>
	{/if}
</AdminSlideOver>

<AdminModal open={Boolean(deleteId)} title="Hapus user?" message="Semua data user akan dihapus permanen." danger onClose={() => (deleteId = null)} onConfirm={deleteUser} />
