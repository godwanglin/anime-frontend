<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
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
	import ProfileEffect from '$lib/components/ProfileEffect.svelte';
	import { FRAME_BASE_PATH, getFrameAssetUrl, getFrameTweak } from '$lib/decorations';
	import { adminToast } from '$lib/stores/adminToast.svelte';
	import { decorations } from '$lib/stores/decorations.svelte';

	type DecorationRow = {
		id: number;
		name: string;
		type: 'frame' | 'nametag' | 'effect' | string;
		asset: string | null;
		config: Record<string, unknown> | null;
		requiredLevel: number;
		priceExp: number;
		sortOrder: number;
		isActive: boolean;
		createdAt: string;
		updatedAt: string;
		_count?: { ownedBy: number };
	};

	type DecorationForm = {
		id?: number;
		name: string;
		type: 'frame' | 'nametag' | 'effect';
		asset: string;
		style: string;
		effectSrc: string;
		effectLoop: boolean;
		effectDuration: number;
		frameScale: number;
		frameOffsetX: number;
		frameOffsetY: number;
		frameCommentOffsetY: number | null;
		priceExp: number;
		requiredLevel: number;
		sortOrder: number;
		isActive: boolean;
	};

	type FrameNumberField = 'frameScale' | 'frameOffsetX' | 'frameOffsetY';

	const DEFAULT_FRAME_SCALE = 1.24;
	const FRAME_SCALE_MIN = 0.1;
	const FRAME_SCALE_MAX = 5;
	const FRAME_OFFSET_MIN = -40;
	const FRAME_OFFSET_MAX = 40;

	const NAMETAG_STYLES = [
		{ value: 'aura', label: 'Aura' },
		{ value: 'glitch', label: 'Glitch' },
		{ value: 'cosmic', label: 'Cosmic' },
		{ value: 'glitch-glasses', label: 'Glitch Glasses' },
		{ value: 'blood-god', label: 'Blood God' },
		{ value: 'royal', label: 'Royal Crest' }
	];

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
		const type = row.type === 'nametag' ? 'nametag' : row.type === 'effect' ? 'effect' : 'frame';
		const config = row.config && typeof row.config === 'object' ? row.config : {};
		const frameTweak = getFrameTweak({ asset: row.asset, config: config as any });
		const style = type === 'nametag' ? String((config as { style?: unknown }).style ?? '') : '';
		const effectSrc =
			type === 'effect' ? String((config as { src?: unknown }).src ?? row.asset ?? '') : '';
		const rawDuration = Number((config as { duration?: unknown }).duration ?? 10000);
		const rawScale = Number((config as { scale?: unknown }).scale);
		const rawOffsetX = Number((config as { offsetX?: unknown }).offsetX);
		const rawOffsetY = Number((config as { offsetY?: unknown }).offsetY);
		const rawCommentOffsetY = (config as { commentOffsetY?: unknown }).commentOffsetY;
		return {
			id: row.id,
			name: row.name,
			type,
			asset: row.asset ?? '',
			style,
			effectSrc,
			effectLoop: type === 'effect' ? Boolean((config as { loop?: unknown }).loop) : true,
			effectDuration:
				Number.isFinite(rawDuration) && rawDuration > 0 ? Math.floor(rawDuration) : 10000,
			frameScale: Number.isFinite(rawScale) && rawScale > 0 ? rawScale : frameTweak.scale,
			frameOffsetX: Number.isFinite(rawOffsetX) ? rawOffsetX : (frameTweak.offsetX ?? 0),
			frameOffsetY: Number.isFinite(rawOffsetY) ? rawOffsetY : (frameTweak.offsetY ?? 0),
			frameCommentOffsetY:
				typeof rawCommentOffsetY === 'number' && Number.isFinite(rawCommentOffsetY)
					? rawCommentOffsetY
					: (frameTweak.commentOffsetY ?? null),
			priceExp: row.priceExp ?? 0,
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
			effectSrc: '',
			effectLoop: true,
			effectDuration: 10000,
			frameScale: DEFAULT_FRAME_SCALE,
			frameOffsetX: 0,
			frameOffsetY: 0,
			frameCommentOffsetY: null,
			priceExp: 1000,
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

	function upsertDecorationRow(next: DecorationRow) {
		const existing = items.find((item) => item.id === next.id);
		if (existing) {
			items = items.map((item) =>
				item.id === next.id ? { ...item, ...next, _count: next._count ?? item._count } : item
			);
			return;
		}
		items = [next, ...items];
		total += 1;
	}

	async function invalidateDecorationCache() {
		await decorations.invalidate();
	}

	function fallbackFrameTweak(asset: string | null | undefined) {
		return getFrameTweak({ asset, config: null });
	}

	function resetFrameTweak() {
		if (!editing) return;
		const fallback = fallbackFrameTweak(editing.asset);
		editing.frameScale = fallback.scale;
		editing.frameOffsetX = fallback.offsetX ?? 0;
		editing.frameOffsetY = fallback.offsetY ?? 0;
		editing.frameCommentOffsetY = fallback.commentOffsetY ?? null;
	}

	function isIntermediateNumberInput(value: string) {
		return (
			value === '' ||
			value === '-' ||
			value === '+' ||
			value === '.' ||
			value === '-.' ||
			value === '+.'
		);
	}

	function clampNumber(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function sanitizeFrameNumber(value: number, field: FrameNumberField) {
		if (field === 'frameScale') return clampNumber(value, FRAME_SCALE_MIN, FRAME_SCALE_MAX);
		return clampNumber(value, FRAME_OFFSET_MIN, FRAME_OFFSET_MAX);
	}

	function updateFrameNumber(field: FrameNumberField, value: string | number) {
		if (!editing) return;
		const raw = String(value).trim();
		if (isIntermediateNumberInput(raw)) return;
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) {
			editing[field] = sanitizeFrameNumber(parsed, field);
		}
	}

	function nudgeFrameNumber(field: FrameNumberField, delta: number) {
		if (!editing) return;
		const current = Number(editing[field]);
		const next = (Number.isFinite(current) ? current : 0) + delta;
		editing[field] = sanitizeFrameNumber(next, field);
	}

	function commitFrameNumber(event: Event, field: FrameNumberField) {
		if (!editing) return;
		const input = event.currentTarget as HTMLInputElement;
		const parsed = Number(input.value);
		const fallback = field === 'frameScale' ? DEFAULT_FRAME_SCALE : 0;
		const value = Number.isFinite(parsed) ? parsed : fallback;
		const sanitized = sanitizeFrameNumber(value, field);
		editing[field] = sanitized;
		input.value = String(sanitized);
	}

	function updateCommentOffset(value: string | number) {
		if (!editing || editing.frameCommentOffsetY === null) return;
		const raw = String(value).trim();
		if (isIntermediateNumberInput(raw)) return;
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) {
			editing.frameCommentOffsetY = clampNumber(parsed, FRAME_OFFSET_MIN, FRAME_OFFSET_MAX);
		}
	}

	function commitCommentOffset(event: Event) {
		if (!editing || editing.frameCommentOffsetY === null) return;
		const input = event.currentTarget as HTMLInputElement;
		const parsed = Number(input.value);
		const sanitized = clampNumber(
			Number.isFinite(parsed) ? parsed : 0,
			FRAME_OFFSET_MIN,
			FRAME_OFFSET_MAX
		);
		editing.frameCommentOffsetY = sanitized;
		input.value = String(sanitized);
	}

	function buildFrameConfig(form: DecorationForm): Record<string, number> {
		const config: Record<string, number> = {};
		const scale = Number(form.frameScale);
		if (Number.isFinite(scale) && scale > 0) config.scale = scale;
		const offsetX = Number(form.frameOffsetX);
		if (Number.isFinite(offsetX) && offsetX !== 0) config.offsetX = offsetX;
		const offsetY = Number(form.frameOffsetY);
		if (Number.isFinite(offsetY) && offsetY !== 0) config.offsetY = offsetY;
		if (form.frameCommentOffsetY !== null) {
			const commentOffsetY = Number(form.frameCommentOffsetY);
			if (Number.isFinite(commentOffsetY)) config.commentOffsetY = commentOffsetY;
		}
		return config;
	}

	function buildPayload(form: DecorationForm) {
		const isNameTag = form.type === 'nametag';
		const isEffect = form.type === 'effect';
		const asset = isNameTag
			? form.style
				? `nametag-${form.style}`
				: null
			: isEffect
				? null
				: form.asset.trim() || null;
		const config = isNameTag
			? { style: form.style }
			: isEffect
				? {
						src: form.effectSrc.trim(),
						loop: form.effectLoop,
						duration: Math.max(500, Math.floor(Number(form.effectDuration) || 10000))
					}
				: buildFrameConfig(form);
		return {
			name: form.name.trim(),
			type: form.type,
			asset,
			config,
			requiredLevel: isEffect ? 1 : Math.max(1, Math.floor(Number(form.requiredLevel) || 1)),
			priceExp: isEffect ? Math.max(1, Math.floor(Number(form.priceExp) || 0)) : 0,
			sortOrder: Math.floor(Number(form.sortOrder) || 0),
			isActive: form.isActive
		};
	}

	function validate(form: DecorationForm): string | null {
		if (!form.name.trim()) return 'Nama wajib diisi';
		if (form.type === 'nametag' && !form.style) return 'Pilih style nametag';
		if (form.type === 'frame' && !form.asset.trim())
			return 'Asset filename / HTTPS URL wajib diisi untuk frame';
		if (form.type === 'effect') {
			if (!form.effectSrc.trim()) return 'Source URL wajib diisi untuk profile effect';
			if (!Number.isFinite(Number(form.priceExp)) || Number(form.priceExp) <= 0)
				return 'Harga EXP wajib lebih dari 0 untuk profile effect';
			if (!Number.isFinite(Number(form.effectDuration)) || Number(form.effectDuration) < 500)
				return 'Duration minimal 500ms';
		}
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
				const result = await adminApi<DecorationRow>(`/decorations/${editing.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				upsertDecorationRow(result.data);
				adminToast.success('Decoration diperbarui');
			} else {
				const result = await adminApi<DecorationRow>(`/decorations`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				upsertDecorationRow(result.data);
				adminToast.success('Decoration dibuat');
			}
			editing = null;
			await invalidateDecorationCache();
			await load();
		} catch (error) {
			adminToast.error((error as Error).message ?? 'Gagal menyimpan');
		} finally {
			isMutating = false;
		}
	}

	async function toggleActive(row: DecorationRow) {
		try {
			const result = await adminApi<DecorationRow>(`/decorations/${row.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !row.isActive })
			});
			upsertDecorationRow(result.data);
			adminToast.success(row.isActive ? 'Dinonaktifkan' : 'Diaktifkan');
			await invalidateDecorationCache();
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
			items = items.filter((item) => item.id !== deleteId);
			total = Math.max(0, total - 1);
			deleteId = null;
			editing = null;
			await invalidateDecorationCache();
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
			assetUrl: getFrameAssetUrl(form.asset),
			config: buildFrameConfig(form)
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

	function previewEffect(form: DecorationForm) {
		const src = form.effectSrc.trim();
		if (!src) return null;
		return {
			src,
			loop: form.effectLoop,
			duration: Math.max(500, Math.floor(Number(form.effectDuration) || 10000))
		};
	}

	function rowFramePreview(row: DecorationRow) {
		const config = row.config && typeof row.config === 'object' ? row.config : {};
		return {
			id: row.id,
			name: row.name,
			type: 'frame' as const,
			asset: row.asset,
			assetUrl: getFrameAssetUrl(row.asset),
			config
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

	function rowEffectPreview(row: DecorationRow) {
		const config = row.config && typeof row.config === 'object' ? row.config : {};
		const src = String((config as { src?: unknown }).src ?? row.asset ?? '');
		if (!src) return null;
		const rawDuration = Number((config as { duration?: unknown }).duration ?? 10000);
		return {
			src,
			loop: Boolean((config as { loop?: unknown }).loop),
			duration: Number.isFinite(rawDuration) && rawDuration > 0 ? Math.floor(rawDuration) : 10000
		};
	}

	function typeBadgeClass(type: string) {
		if (type === 'nametag') return 'border border-amber-900/60 bg-amber-950/40 text-amber-200';
		if (type === 'effect') return 'border border-fuchsia-900/60 bg-fuchsia-950/40 text-fuchsia-200';
		return 'border border-violet-900/60 bg-violet-950/40 text-violet-200';
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
			<p class="text-sm text-zinc-500">Kelola frame avatar, nametag, dan profile effect.</p>
		</div>
		<button
			onclick={openCreate}
			class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
		>
			<AppIcon name="add" class="text-[18px]" />
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
			<option value="effect">Profile Effect</option>
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
			{ key: 'requirement', label: 'Syarat' },
			{ key: 'price', label: 'Harga' },
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
				{:else if row.type === 'nametag'}
					{@const preview = rowNameTagPreview(row)}
					{#if preview}
						<NameTag name="Preview" nametag={preview} class="text-[13px]" />
					{:else}
						<span class="text-xs text-zinc-500">—</span>
					{/if}
				{:else}
					{@const effect = rowEffectPreview(row)}
					<div
						class="relative flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
					>
						{#if effect}
							<ProfileEffect src={effect.src} loop={effect.loop} duration={effect.duration} />
							<span class="relative z-[60] text-[10px] font-black text-white drop-shadow">
								Effect
							</span>
						{:else}
							<span class="text-xs text-zinc-500">-</span>
						{/if}
					</div>
				{/if}
			</td>
			<td class="px-4 py-3">
				<p class="font-bold">{row.name}</p>
				{#if row.type === 'effect'}
					{@const effect = rowEffectPreview(row)}
					{#if effect}
						<p class="max-w-[220px] truncate text-xs text-zinc-500">{effect.src}</p>
					{/if}
				{:else if row.asset}
					<p class="text-xs text-zinc-500">{row.asset}</p>
				{/if}
			</td>
			<td class="px-4 py-3">
				<span
					class="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider {typeBadgeClass(
						row.type
					)}"
				>
					{row.type}
				</span>
			</td>
			<td class="px-4 py-3">
				<span class="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-black text-zinc-300">
					{row.type === 'effect' ? 'EXP' : `Lv ${row.requiredLevel}`}
				</span>
			</td>
			<td class="px-4 py-3 text-sm text-zinc-400">
				{row.priceExp > 0 ? row.priceExp.toLocaleString('id-ID') : '-'}
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

	<AdminPagination {total} page={currentPage} limit={20} onChange={(page) => setParams({ page })} />
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
				{:else if editing.type === 'nametag'}
					{@const np = previewNameTag(editing)}
					{#if np}
						<NameTag name={editing.name || 'Preview'} nametag={np} class="text-[16px]" />
					{:else}
						<p class="text-sm text-zinc-500">Pilih style untuk lihat preview</p>
					{/if}
				{:else}
					{@const effect = previewEffect(editing)}
					<div
						class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-950"
					>
						{#if effect}
							<ProfileEffect src={effect.src} loop={effect.loop} duration={effect.duration} />
							<div class="relative z-[60] text-center">
								<p class="text-sm font-black text-white">{editing.name || 'Profile Effect'}</p>
								<p class="text-[11px] text-zinc-300">
									{editing.priceExp.toLocaleString('id-ID')} EXP
								</p>
							</div>
						{:else}
							<p class="text-sm text-zinc-500">Isi source URL untuk lihat preview</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Type -->
			<div class="grid grid-cols-3 gap-2">
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
				<button
					type="button"
					onclick={() => (editing!.type = 'effect')}
					class="rounded-lg border px-3 py-2 text-sm font-black {editing.type === 'effect'
						? 'border-fuchsia-500 bg-fuchsia-600/20 text-fuchsia-200'
						: 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'}"
					disabled={Boolean(editing.id)}
				>
					Effect
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
						Asset filename / HTTPS URL
						<span class="font-normal text-zinc-600">(filename diserve dari {FRAME_BASE_PATH}/)</span
						>
					</span>
					<input
						type="text"
						bind:value={editing.asset}
						placeholder="border11.png atau https://cdn.example.com/border.webp"
						class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono"
					/>
					<span class="mt-1.5 block text-[11px] text-zinc-500">
						Filename biasa diprefix `{FRAME_BASE_PATH}/`; URL `https://` dipakai langsung. Format:
						png/gif/webp.
					</span>
				</label>

				<div class="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="text-xs font-black uppercase tracking-wider text-zinc-300">Frame tweak</p>
							<p class="text-[11px] text-zinc-500">
								Atur skala &amp; offset border supaya pas dengan avatar.
							</p>
						</div>
						<button
							type="button"
							onclick={resetFrameTweak}
							class="rounded-md border border-zinc-700 px-2 py-1 text-[11px] font-bold text-zinc-400 hover:bg-zinc-800"
						>
							Reset
						</button>
					</div>

					<label class="block">
						<div class="mb-1.5 flex items-center justify-between">
							<span class="text-xs font-bold text-zinc-500">
								Scale
								<span class="font-normal text-zinc-600">(default {DEFAULT_FRAME_SCALE})</span>
							</span>
							<span class="font-mono text-[11px] text-zinc-400">
								{editing.frameScale.toFixed(2)}x
							</span>
						</div>
						<input
							type="range"
							value={editing.frameScale}
							min={FRAME_SCALE_MIN}
							max={FRAME_SCALE_MAX}
							step="0.01"
							oninput={(event) => updateFrameNumber('frameScale', event.currentTarget.value)}
							class="w-full accent-violet-500"
						/>
						<input
							type="number"
							value={editing.frameScale}
							min={FRAME_SCALE_MIN}
							max={FRAME_SCALE_MAX}
							step="0.01"
							oninput={(event) => updateFrameNumber('frameScale', event.currentTarget.value)}
							onblur={(event) => commitFrameNumber(event, 'frameScale')}
							class="mt-2 h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
						/>
					</label>

					<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<div class="mb-1.5 flex items-center justify-between">
								<span class="text-xs font-bold text-zinc-500">Offset X (px)</span>
								<span class="font-mono text-[11px] text-zinc-400">
									{editing.frameOffsetX}px
								</span>
							</div>
							<input
								type="range"
								value={editing.frameOffsetX}
								min={FRAME_OFFSET_MIN}
								max={FRAME_OFFSET_MAX}
								step="1"
								oninput={(event) => updateFrameNumber('frameOffsetX', event.currentTarget.value)}
								class="mb-2 w-full accent-violet-500"
							/>
							<input
								type="number"
								value={editing.frameOffsetX}
								min={FRAME_OFFSET_MIN}
								max={FRAME_OFFSET_MAX}
								step="1"
								oninput={(event) => updateFrameNumber('frameOffsetX', event.currentTarget.value)}
								onblur={(event) => commitFrameNumber(event, 'frameOffsetX')}
								class="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
							/>
						</label>
						<label class="block">
							<div class="mb-1.5 flex items-center justify-between">
								<span class="text-xs font-bold text-zinc-500">Posisi Atas / Bawah</span>
								<span class="font-mono text-[11px] text-zinc-400">
									{editing.frameOffsetY}px
								</span>
							</div>
							<div class="mb-2 grid grid-cols-2 gap-2">
								<button
									type="button"
									onclick={() => nudgeFrameNumber('frameOffsetY', -1)}
									class="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 text-[11px] font-bold text-zinc-300 hover:bg-zinc-700"
								>
									<AppIcon name="keyboard_arrow_up" class="text-[14px]" />
									Naik
								</button>
								<button
									type="button"
									onclick={() => nudgeFrameNumber('frameOffsetY', 1)}
									class="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 text-[11px] font-bold text-zinc-300 hover:bg-zinc-700"
								>
									<AppIcon name="keyboard_arrow_down" class="text-[14px]" />
									Turun
								</button>
							</div>
							<input
								type="range"
								value={editing.frameOffsetY}
								min={FRAME_OFFSET_MIN}
								max={FRAME_OFFSET_MAX}
								step="1"
								oninput={(event) => updateFrameNumber('frameOffsetY', event.currentTarget.value)}
								class="mb-2 w-full accent-violet-500"
							/>
							<input
								type="number"
								value={editing.frameOffsetY}
								min={FRAME_OFFSET_MIN}
								max={FRAME_OFFSET_MAX}
								step="1"
								oninput={(event) => updateFrameNumber('frameOffsetY', event.currentTarget.value)}
								onblur={(event) => commitFrameNumber(event, 'frameOffsetY')}
								class="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
							/>
						</label>
					</div>

					<label class="block">
						<div class="mb-1.5 flex items-center justify-between">
							<span class="text-xs font-bold text-zinc-500">
								Comment Offset Y (px)
								<span class="font-normal text-zinc-600">- override khusus area komentar</span>
							</span>
							{#if editing.frameCommentOffsetY !== null}
								<span class="font-mono text-[11px] text-zinc-400">
									{editing.frameCommentOffsetY}px
								</span>
							{/if}
							<label class="flex items-center gap-1.5 text-[11px] text-zinc-400">
								<input
									type="checkbox"
									checked={editing.frameCommentOffsetY !== null}
									onchange={(e) => {
										editing!.frameCommentOffsetY = e.currentTarget.checked ? 0 : null;
									}}
									class="h-3.5 w-3.5 accent-violet-600"
								/>
								Aktif
							</label>
						</div>
						<input
							type="range"
							value={editing.frameCommentOffsetY ?? 0}
							disabled={editing.frameCommentOffsetY === null}
							min={FRAME_OFFSET_MIN}
							max={FRAME_OFFSET_MAX}
							step="1"
							oninput={(event) => updateCommentOffset(event.currentTarget.value)}
							class="mb-2 w-full accent-violet-500 disabled:opacity-50"
						/>
						<input
							type="number"
							value={editing.frameCommentOffsetY ?? 0}
							disabled={editing.frameCommentOffsetY === null}
							min={FRAME_OFFSET_MIN}
							max={FRAME_OFFSET_MAX}
							step="1"
							oninput={(event) => updateCommentOffset(event.currentTarget.value)}
							onblur={commitCommentOffset}
							class="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm disabled:opacity-50"
						/>
					</label>
				</div>
			{:else if editing.type === 'nametag'}
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
			{:else}
				<div class="space-y-3">
					<label class="block">
						<span class="mb-1.5 block text-xs font-bold text-zinc-500">Source URL</span>
						<input
							type="text"
							bind:value={editing.effectSrc}
							placeholder="https://cdn.discordapp.com/assets/content/..."
							class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm font-mono"
						/>
					</label>
					<div class="grid grid-cols-2 gap-3">
						<label class="block">
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">Duration (ms)</span>
							<input
								type="number"
								bind:value={editing.effectDuration}
								min="500"
								step="100"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
							/>
						</label>
						<label class="block">
							<span class="mb-1.5 block text-xs font-bold text-zinc-500">Harga EXP</span>
							<input
								type="number"
								bind:value={editing.priceExp}
								min="1"
								step="1"
								class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
							/>
						</label>
					</div>
					<label
						class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
					>
						<span>
							<span class="block text-sm font-black text-zinc-100">Loop</span>
							<span class="text-xs text-zinc-500"> Effect akan diulang sesuai duration. </span>
						</span>
						<input
							bind:checked={editing.effectLoop}
							type="checkbox"
							class="h-5 w-5 accent-fuchsia-600"
						/>
					</label>
				</div>
			{/if}

			<div
				class="grid gap-3"
				class:grid-cols-1={editing.type === 'effect'}
				class:grid-cols-2={editing.type !== 'effect'}
			>
				{#if editing.type !== 'effect'}
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
				{/if}
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
				<input bind:checked={editing.isActive} type="checkbox" class="h-5 w-5 accent-violet-600" />
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
