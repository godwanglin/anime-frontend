<script lang="ts">
	import { goto } from '$app/navigation';
	import { page as pageState } from '$app/state';
	import { adminApi, toQuery } from '$lib/admin/api';
	import AdminModal from '$lib/components/admin/AdminModal.svelte';
	import AdminPagination from '$lib/components/admin/AdminPagination.svelte';
	import AdminSearchBar from '$lib/components/admin/AdminSearchBar.svelte';
	import AdminSlideOver from '$lib/components/admin/AdminSlideOver.svelte';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import NameTag from '$lib/components/NameTag.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type DecorationRow = {
		id: number;
		name: string;
		type: 'frame' | 'nametag' | string;
		asset: string | null;
		config: Record<string, unknown> | null;
		requiredLevel: number;
		sortOrder: number;
		isActive: boolean;
		createdAt: string;
		updatedAt: string;
		_count?: { ownedBy: number };
	};

	type DecorationForm = {
		id?: number;
		name: string;
		type: 'frame' | 'nametag';
		asset: string;
		style: string;
		requiredLevel: number;
		sortOrder: number;
		isActive: boolean;
	};

	const NAMETAG_STYLES = [
		{ value: 'aura', label: 'Aura' },
		{ value: 'glitch', label: 'Glitch' },
		{ value: 'cosmic', label: 'Cosmic' },
		{ value: 'glitch-glasses', label: 'Glitch Glasses' },
		{ value: 'blood-god', label: 'Blood God' },
		{ value: 'royal', label: 'Royal Crest' }
	];

	const FRAME_BASE_PATH = '/frame-border';

	let items = $state<DecorationRow[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let isMutating = $state(false);
	let editing = $state<DecorationForm | null>(null);
	let deleteId = $state<number | null>(null);

	const url = $derived(pageState.url);
	const currentPage = $derived(Number(url.searchParams.get('page') ?? 1));
	const search = $derived(url.searchParams.get('search') ?? '');
	const typeFilter = $derived(url.searchParams.get('type') ?? '');
	const statusFilter = $derived(url.searchParams.get('status') ?? '');

	function setParams(next: Record<string, string | number>) {
		goto(
			`/admin/decorations${toQuery({
				page: currentPage,
				search,
				type: typeFilter,
				status: statusFilter,
				...next
			})}`,
			{ noScroll: true }
		);
	}

	async function load() {
		isLoading = true;
		try {
			const result = await adminApi<DecorationRow[]>(
				`/decorations${toQuery({ page: currentPage, limit: 20, search, type: typeFilter, status: statusFilter })}`
			);
			items = result.data;
			total = Number(result.meta.total ?? 0);
		} catch (error) {
			adminToast.error((error as Error).message ?? 'Gagal memuat decorations');
		} finally {
			isLoading = false;
		}
	}

	function rowToForm(row: DecorationRow): DecorationForm {
		const type = row.type === 'nametag' ? 'nametag' : 'frame';
		const style =
			type === 'nametag' && row.config && typeof row.config === 'object'
				? String((row.config as { style?: unknown }).style ?? '')
				: '';
		return {
			id: row.id,
			name: row.name,
			type,
			asset: row.asset ?? '',
			style,
			requiredLevel: row.requiredLevel,
			sortOrder: row.sortOrder,
			isActive: row.isActive
		};
	}

	function newDraft(): DecorationForm {
		return {
			name: '',
			type: 'frame',
			asset: '',
			style: '',
			requiredLevel: 1,
			sortOrder: 0,
			isActive: true
		};
	}

	function openCreate() {
		editing = newDraft();
	}

	function openEdit(row: DecorationRow) {
		editing = rowToForm(row);
	}

	function buildPayload(form: DecorationForm) {
		const isNameTag = form.type === 'nametag';
		const asset = isNameTag
			? form.style
				? `nametag-${form.style}`
				: null
			: form.asset.trim() || null;
		const config = isNameTag ? { style: form.style } : {};
		return {
			name: form.name.trim(),
			type: form.type,
			asset,
			config,
			requiredLevel: Math.max(1, Math.floor(Number(form.requiredLevel) || 1)),
			sortOrder: Math.floor(Number(form.sortOrder) || 0),
			isActive: form.isActive
		};
	}

	function validate(form: DecorationForm): string | null {
		if (!form.name.trim()) return 'Nama wajib diisi';
		if (form.type === 'nametag' && !form.style) return 'Pilih style nametag';
		if (form.type === 'frame' && !form.asset.trim())
			return 'Asset (filename) wajib diisi untuk frame';
		return null;
	}

	async function save() {
		if (!editing) return;
		const error = validate(editing);
		if (error) {
			adminToast.error(error);
			return;
		}
		isMutating = true;
		try {
			const payload = buildPayload(editing);
			if (editing.id) {
				await adminApi(`/decorations/${editing.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				adminToast.success('Decoration diperbarui');
			} else {
				await adminApi(`/decorations`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				adminToast.success('Decoration dibuat');
			}
			editing = null;
			await load();
		} catch (error) {
			adminToast.error((error as Error).message ?? 'Gagal menyimpan');
		} finally {
			isMutating = false;
		}
	}

	async function toggleActive(row: DecorationRow) {
		try {
			await adminApi(`/decorations/${row.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !row.isActive })
			});
			adminToast.success(row.isActive ? 'Dinonaktifkan' : 'Diaktifkan');
			await load();
		} catch (error) {
			adminToast.error((error as Error).message ?? 'Gagal update status');
		}
	}

	async function confirmDelete() {
		if (!deleteId) return;
		try {
			await adminApi(`/decorations/${deleteId}`, { method: 'DELETE' });
			adminToast.success('Decoration dihapus');
			deleteId = null;
			editing = null;
			await load();
		} catch (error) {
			adminToast.error((error as Error).message ?? 'Gagal menghapus');
		}
	}

	function previewFrame(form: DecorationForm) {
		return {
			id: form.id ?? 0,
			name: form.name || 'Preview',
			type: 'frame' as const,
			asset: form.asset || null,
			assetUrl: form.asset ? `${FRAME_BASE_PATH}/${form.asset}` : null,
			config: {}
		};
	}

	function previewNameTag(form: DecorationForm) {
		if (!form.style) return null;
		return {
			id: form.id ?? 0,
			name: form.name || 'Preview',
			type: 'nametag' as const,
			asset: `nametag-${form.style}`,
			assetUrl: null,
			config: { style: form.style as any }
		};
	}

	function rowFramePreview(row: DecorationRow) {
		return {
			id: row.id,
			name: row.name,
			type: 'frame' as const,
			asset: row.asset,
			assetUrl: row.asset ? `${FRAME_BASE_PATH}/${row.asset}` : null,
			config: {}
		};
	}

	function rowNameTagPreview(row: DecorationRow) {
		const style =
			row.config && typeof row.config === 'object'
				? String((row.config as { style?: unknown }).style ?? '')
				: '';
		if (!style) return null;
		return {
			id: row.id,
			name: row.name,
			type: 'nametag' as const,
			asset: row.asset,
			assetUrl: null,
			config: { style: style as any }
		};
	}

	$effect(() => {
		url;
		load();
	});
</script>

<div class="space-y-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="text-2xl font-black">Decorations</h2>
			<p class="text-sm text-zinc-500">
				Kelola frame avatar dan nametag yang bisa diunlock user via level.
			</p>
		</div>
		<button
			onclick={openCreate}
			class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
		>
			<span class="material-symbols-rounded text-[18px]">add</span>
			Tambah
		</button>
	</div>

	<div
		class="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[1fr_180px_180px]"
	>
		<AdminSearchBar
			value={search}
			placeholder="Search nama..."
			onSearch={(value) => setParams({ search: value, page: 1 })}
		/>
		<select
			value={typeFilter}
			onchange={(e) => setParams({ type: e.currentTarget.value, page: 1 })}
			class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
		>
			<option value="">Semua tipe</option>
			<option value="frame">Frame</option>
			<option value="nametag">Nametag</option>
		</select>
		<select
			value={statusFilter}
			onchange={(e) => setParams({ status: e.currentTarget.value, page: 1 })}
			class="h-10 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
		>
			<option value="">Semua status</option>
			<option value="active">Aktif</option>
			<option value="inactive">Nonaktif</option>
		</select>
	</div>

	<AdminTable
		columns={[
			{ key: 'preview', label: 'Preview' },
			{ key: 'name', label: 'Nama' },
			{ key: 'type', label: 'Tipe' },
			{ key: 'level', label: 'Min Lv' },
			{ key: 'sort', label: 'Sort' },
			{ key: 'owned', label: 'Owned' },
			{ key: 'status', label: 'Status' },
			{ key: 'actions', label: 'Aksi' }
		]}
		data={items as any}
		{isLoading}
	>
		{#snippet children(raw)}
			{@const row = raw as DecorationRow}
			<td class="px-4 py-3">
				{#if row.type === 'frame'}
					<AvatarFrame
						src={null}
						alt={row.name}
						size={56}
						frame={rowFramePreview(row)}
						fallbackInitial="?"
					/>
				{:else}
					{@const preview = rowNameTagPreview(row)}
					{#if preview}
						<NameTag name="Preview" nametag={preview} class="text-[13px]" />
					{:else}
						<span class="text-xs text-zinc-500">—</span>
					{/if}
				{/if}
			</td>
			<td class="px-4 py-3">
				<p class="font-bold">{row.name}</p>
				{#if row.asset}
					<p class="text-xs text-zinc-500">{row.asset}</p>
				{/if}
			</td>
			<td class="px-4 py-3">
				<span
					class="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider {row.type ===
					'nametag'
						? 'border border-amber-900/60 bg-amber-950/40 text-amber-200'
						: 'border border-violet-900/60 bg-violet-950/40 text-violet-200'}"
				>
					{row.type}
				</span>
			</td>
			<td class="px-4 py-3">
				<span class="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-black text-zinc-300">
					Lv {row.requiredLevel}
				</span>
			</td>
			<td class="px-4 py-3 text-sm text-zinc-400">{row.sortOrder}</td>
			<td class="px-4 py-3 text-sm text-zinc-400">{row._count?.ownedBy ?? 0}</td>
			<td class="px-4 py-3">
				<button
					onclick={() => toggleActive(row)}
					class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black {row.isActive
						? 'border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
						: 'border border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}"
					title="Klik untuk toggle"
				>
					<span class="h-1.5 w-1.5 rounded-full {row.isActive ? 'bg-emerald-400' : 'bg-zinc-600'}"
					></span>
					{row.isActive ? 'Aktif' : 'Nonaktif'}
				</button>
			</td>
			<td class="px-4 py-3">
				<button
					onclick={() => openEdit(row)}
					class="mr-2 rounded-lg border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
				>
					Edit
				</button>
				<button
					onclick={() => (deleteId = row.id)}
					class="rounded-lg border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
				>
					Hapus
				</button>
			</td>
		{/snippet}
	</AdminTable>

	<AdminPagination
		{total}
		page={currentPage}
		limit={20}
		onChange={(page) => setParams({ page })}
	/>
</div>

<AdminSlideOver
	open={Boolean(editing)}
	title={editing?.id ? 'Edit Decoration' : 'Tambah Decoration'}
	onClose={() => (editing = null)}
>
	{#if editing}
		<div class="space-y-5">
			<!-- Live preview -->
			<div
				class="flex h-32 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-4"
			>
				{#if editing.type === 'frame'}
					<AvatarFrame
						src={null}
						alt={editing.name || 'Preview'}
						size={88}
						frame={previewFrame(editing)}
						fallbackInitial={(editing.name || 'A')[0]}
					/>
				{:else}
					{@const np = previewNameTag(editing)}
					{#if np}
						<NameTag name={editing.name || 'Preview'} nametag={np} class="text-[16px]" />
					{:else}
						<p class="text-sm text-zinc-500">Pilih style untuk lihat preview</p>
					{/if}
				{/if}
			</div>

			<!-- Type -->
			<div class="grid grid-cols-2 gap-2">
				<button
					type="button"
					onclick={() => (editing!.type = 'frame')}
					class="rounded-lg border px-3 py-2 text-sm font-black {editing.type === 'frame'
						? 'border-violet-500 bg-violet-600/20 text-violet-200'
						: 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}"
					disabled={Boolean(editing.id)}
				>
					Frame
				</button>
				<button
					type="button"
					onclick={() => (editing!.type = 'nametag')}
					class="rounded-lg border px-3 py-2 text-sm font-black {editing.type === 'nametag'
						? 'border-amber-500 bg-amber-600/20 text-amber-200'
						: 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}"
					disabled={Boolean(editing.id)}
				>
					Nametag
				</button>
			</div>
			{#if editing.id}
				<p class="-mt-3 text-[11px] text-zinc-500">
					Tipe tidak bisa diubah setelah decoration dibuat.
				</p>
			{/if}

			<label class="block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Nama</span>
				<input
					type="text"
					bind:value={editing.name}
					placeholder="cth. Royal Crest"
					class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				/>
			</label>

			{#if editing.type === 'frame'}
				<label class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">
						Asset filename
						<span class="font-normal text-zinc-600">(diserve dari {FRAME_BASE_PATH}/)</span>
					</span>
					<input
						type="text"
						bind:value={editing.asset}
						placeholder="border11.png"
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono"
					/>
					<span class="mt-1.5 block text-[11px] text-zinc-500">
						Pastikan file sudah diupload ke folder static `{FRAME_BASE_PATH}/`. Format: png/gif/webp.
					</span>
				</label>
			{:else}
				<label class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">Style</span>
					<select
						bind:value={editing.style}
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
					>
						<option value="">— pilih style —</option>
						{#each NAMETAG_STYLES as s}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
					{#if editing.style}
						<span class="mt-1.5 block text-[11px] text-zinc-500">
							Asset key: <code class="font-mono">nametag-{editing.style}</code>
						</span>
					{/if}
				</label>
			{/if}

			<div class="grid grid-cols-2 gap-3">
				<label class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">Min Level</span>
					<input
						type="number"
						bind:value={editing.requiredLevel}
						min="1"
						step="1"
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
					/>
				</label>
				<label class="block">
					<span class="mb-1.5 block text-xs font-bold text-zinc-500">Sort Order</span>
					<input
						type="number"
						bind:value={editing.sortOrder}
						step="1"
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
					/>
				</label>
			</div>

			<label
				class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
			>
				<span>
					<span class="block text-sm font-black text-zinc-100">Aktif</span>
					<span class="text-xs text-zinc-500">
						Decoration nonaktif tidak muncul di toko user.
					</span>
				</span>
				<input
					bind:checked={editing.isActive}
					type="checkbox"
					class="h-5 w-5 accent-violet-600"
				/>
			</label>

			<button
				onclick={save}
				disabled={isMutating}
				class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 hover:bg-violet-700"
			>
				{editing.id ? 'Simpan Perubahan' : 'Buat Decoration'}
			</button>
			{#if editing.id}
				<button
					onclick={() => (deleteId = editing?.id ?? null)}
					class="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
				>
					Hapus
				</button>
			{/if}
		</div>
	{/if}
</AdminSlideOver>

<AdminModal
	open={Boolean(deleteId)}
	title="Hapus decoration?"
	message="Decoration dan semua kepemilikan user atasnya akan dihapus permanen."
	danger
	onClose={() => (deleteId = null)}
	onConfirm={confirmDelete}
/>
