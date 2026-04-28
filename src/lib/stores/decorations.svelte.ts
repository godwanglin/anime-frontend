import type {
	DecorationType,
	EquippedDecoration,
	EquippedDecorations,
	EquippedEffect,
	OwnedDecoration,
	ShopDecoration
} from '$lib/decorations';
import { MAX_EQUIPPED_EFFECTS } from '$lib/decorations';
import { auth } from './auth.svelte';

let shopItems = $state<ShopDecoration[]>([]);
let ownedItems = $state<OwnedDecoration[]>([]);
let equipped = $state<EquippedDecorations>({ frame: null, nametag: null, effects: [] });
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
		nametag: data?.nametag ?? null,
		effects: Array.isArray(data?.effects) ? (data?.effects as EquippedEffect[]) : []
	};
}

function syncAuthDecoration(type: DecorationType, item: EquippedDecoration) {
	if (!auth.user) return;
	if (type === 'effect') return; // effects array di-sync terpisah
	auth.user[type] = item;
}

function syncAuthEffects(effects: EquippedEffect[]) {
	if (!auth.user) return;
	auth.user.effects = effects;
}

function syncAll(next: EquippedDecorations) {
	syncAuthDecoration('frame', next.frame);
	syncAuthDecoration('nametag', next.nametag);
	syncAuthEffects(next.effects);
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
		equipped = { frame: null, nametag: null, effects: [] };
		return;
	}
	isLoading = true;
	error = null;
	try {
		const response = await auth.authFetch('/api/user/decorations');
		const envelope = await readEnvelope<OwnedDecoration[]>(response);
		ownedItems = envelope.data ?? [];
		equipped = normalizeEquipped(envelope.meta?.equipped);
		syncAll(equipped);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal memuat inventaris';
	} finally {
		isLoading = false;
	}
}

async function invalidate() {
	await fetchShop();
	if (auth.isLoggedIn) {
		await fetchOwned();
		await auth.fetchMe();
	}
}

function setEquippedFlag(items: ShopDecoration[] | OwnedDecoration[], next: EquippedDecorations) {
	const equippedIds = new Set<number>();
	if (next.frame) equippedIds.add(next.frame.id);
	if (next.nametag) equippedIds.add(next.nametag.id);
	for (const eff of next.effects) equippedIds.add(eff.id);
	return items.map((item) => ({ ...item, isEquipped: equippedIds.has(item.id) }));
}

function applyMeta(meta: Record<string, unknown> | null | undefined) {
	if (!meta) return;
	const next = normalizeEquipped(meta.equipped);
	equipped = next;
	shopItems = setEquippedFlag(shopItems, next) as ShopDecoration[];
	ownedItems = setEquippedFlag(ownedItems, next) as OwnedDecoration[];
	syncAll(next);
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
		const envelope = await readEnvelope<{ equipped: EquippedDecoration; type: DecorationType }>(
			response
		);
		applyMeta(envelope.meta ?? null);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal memasang dekorasi';
	} finally {
		isMutating = false;
	}
}

async function unequipById(decorationId: number) {
	if (isMutating) return;
	isMutating = true;
	error = null;
	try {
		const response = await auth.authFetch(`/api/user/decorations/${decorationId}/unequip`, {
			method: 'POST',
			body: JSON.stringify({})
		});
		const envelope = await readEnvelope<{ decorationId: number }>(response);
		applyMeta(envelope.meta ?? null);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal melepas dekorasi';
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
		const envelope = await readEnvelope<{ equipped: null; type: DecorationType }>(response);
		applyMeta(envelope.meta ?? null);
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal melepas dekorasi';
	} finally {
		isMutating = false;
	}
}

type PurchaseResponse = {
	decoration: EquippedDecoration;
	spentExp: number;
	exp: number;
	level: number;
	badge?: { name: string; color: string };
	levelProgress?: {
		currentLevelExp: number;
		nextLevelExp: number;
		progress: number;
		remainingExp: number;
	};
};

async function purchase(decorationId: number) {
	if (isMutating) return null;
	isMutating = true;
	error = null;
	try {
		const response = await auth.authFetch(`/api/user/decorations/${decorationId}/purchase`, {
			method: 'POST',
			body: JSON.stringify({})
		});
		const envelope = await readEnvelope<PurchaseResponse>(response);
		// Sync user EXP / level setelah purchase.
		if (auth.user && envelope.data) {
			auth.user.exp = envelope.data.exp;
			auth.user.level = envelope.data.level;
			if (envelope.data.badge) auth.user.badge = envelope.data.badge;
			if (envelope.data.levelProgress) auth.user.levelProgress = envelope.data.levelProgress;
		}
		applyMeta(envelope.meta ?? null);
		// Refresh owned + shop supaya status `isOwned` berubah.
		await fetchOwned();
		await fetchShop();
		return envelope.data;
	} catch (caught) {
		error = caught instanceof Error ? caught.message : 'Gagal membeli dekorasi';
		return null;
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
	get effects() {
		return equipped.effects;
	},
	get maxEffects() {
		return MAX_EQUIPPED_EFFECTS;
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
	clearError() {
		error = null;
	},
	fetchShop,
	fetchOwned,
	invalidate,
	equip,
	equipDecoration,
	unequip,
	unequipById,
	purchase
};
