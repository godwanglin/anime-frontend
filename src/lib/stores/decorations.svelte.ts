import type {
	DecorationType,
	EquippedDecoration,
	EquippedDecorations,
	OwnedDecoration,
	ShopDecoration
} from '$lib/decorations';
import { auth } from './auth.svelte';

let shopItems = $state<ShopDecoration[]>([]);
let ownedItems = $state<OwnedDecoration[]>([]);
let equipped = $state<EquippedDecorations>({ frame: null, nametag: null });
let isLoading = $state(false);
let isMutating = $state(false);
let error = $state<string | null>(null);

type Envelope<T> = {
	status: number;
	message: string | null;
	errorCode: string | null;
	data: T;
	meta?: Record<string, unknown> | null;
};

async function readEnvelope<T>(response: Response) {
	const json = (await response.json().catch(() => null)) as Envelope<T> | null;
	if (!response.ok) {
		throw new Error(json?.message ?? 'Request gagal');
	}
	return json as Envelope<T>;
}

function normalizeEquipped(value: unknown): EquippedDecorations {
	const data = value as Partial<EquippedDecorations> | null | undefined;
	return {
		frame: data?.frame ?? null,
		nametag: data?.nametag ?? null
	};
}

function syncAuthDecoration(type: DecorationType, item: EquippedDecoration) {
	if (!auth.user) return;
	auth.user[type] = item;
}

async function fetchShop() {
	isLoading = true;
	error = null;
	try {
		const response = await auth.authFetch('/api/decorations');
		const envelope = await readEnvelope<ShopDecoration[]>(response);
		shopItems = envelope.data ?? [];
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal memuat dekorasi';
	} finally {
		isLoading = false;
	}
}

async function fetchOwned() {
	if (!auth.isLoggedIn) {
		ownedItems = [];
		equipped = { frame: null, nametag: null };
		return;
	}
	isLoading = true;
	error = null;
	try {
		const response = await auth.authFetch('/api/user/decorations');
		const envelope = await readEnvelope<OwnedDecoration[]>(response);
		ownedItems = envelope.data ?? [];
		equipped = normalizeEquipped(envelope.meta?.equipped);
		syncAuthDecoration('frame', equipped.frame);
		syncAuthDecoration('nametag', equipped.nametag);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal memuat inventaris';
	} finally {
		isLoading = false;
	}
}

function applyEquipState(type: DecorationType, decorationId: number | null) {
	shopItems = shopItems.map((item) => ({
		...item,
		isEquipped: item.type === type ? decorationId !== null && item.id === decorationId : item.isEquipped
	}));
	ownedItems = ownedItems.map((item) => ({
		...item,
		isEquipped: item.type === type ? decorationId !== null && item.id === decorationId : item.isEquipped
	}));
}

async function equipDecoration(decorationId: number) {
	if (isMutating) return;
	isMutating = true;
	error = null;
	try {
		const response = await auth.authFetch(`/api/user/decorations/${decorationId}/equip`, {
			method: 'POST',
			body: JSON.stringify({})
		});
		const envelope = await readEnvelope<{ equipped: EquippedDecoration }>(response);
		const next = envelope.data?.equipped ?? null;
		if (!next) throw new Error('Dekorasi belum dimiliki atau tidak ditemukan');

		equipped = { ...equipped, [next.type]: next };
		applyEquipState(next.type, next.id);
		syncAuthDecoration(next.type, next);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal memasang dekorasi';
	} finally {
		isMutating = false;
	}
}

async function unequip(type: DecorationType = 'frame') {
	if (isMutating) return;
	isMutating = true;
	error = null;
	try {
		const response = await auth.authFetch('/api/user/decorations/unequip', {
			method: 'POST',
			body: JSON.stringify({ type })
		});
		await readEnvelope<{ equipped: null; type: DecorationType }>(response);
		equipped = { ...equipped, [type]: null };
		applyEquipState(type, null);
		syncAuthDecoration(type, null);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal melepas dekorasi';
	} finally {
		isMutating = false;
	}
}

async function equip(decorationId: number) {
	return equipDecoration(decorationId);
}

export const decorations = {
	get shop() {
		return shopItems;
	},
	get owned() {
		return ownedItems;
	},
	get equipped() {
		return equipped;
	},
	get frame() {
		return equipped.frame;
	},
	get nametag() {
		return equipped.nametag;
	},
	get isLoading() {
		return isLoading;
	},
	get isMutating() {
		return isMutating;
	},
	get error() {
		return error;
	},
	fetchShop,
	fetchOwned,
	equip,
	equipDecoration,
	unequip
};
