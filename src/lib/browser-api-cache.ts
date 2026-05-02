import { browser } from '$app/environment';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type CachedPayload<T> = {
	url: string;
	data: T;
	savedAt: number;
	expiresAt: number;
};

type CachedJsonResult<T> = {
	ok: boolean;
	data: T | null;
	meta: Record<string, unknown> | null;
	fromCache: boolean;
	status: number;
};

const DB_NAME = 'weebin-api-cache';
const STORE_NAME = 'responses';
const DB_VERSION = 1;
const LOCAL_PREFIX = 'weebin:api-cache:';

let dbPromise: Promise<IDBDatabase | null> | null = null;

export const API_CACHE_TTL = {
	tenMinutes: 10 * 60 * 1000,
	thirtyMinutes: 30 * 60 * 1000,
	twoHours: 2 * 60 * 60 * 1000,
	twelveHours: 12 * 60 * 60 * 1000,
	oneDay: 24 * 60 * 60 * 1000
} as const;

function canUseBrowserStorage() {
	return browser && typeof window !== 'undefined';
}

function normalizeUrl(url: string) {
	try {
		return new URL(url, window.location.origin).toString();
	} catch {
		return url;
	}
}

function localKey(url: string) {
	return `${LOCAL_PREFIX}${url}`;
}

function openDb() {
	if (!canUseBrowserStorage() || !('indexedDB' in window)) return Promise.resolve(null);
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve) => {
		const request = window.indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'url' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
		request.onblocked = () => resolve(null);
	});

	return dbPromise;
}

async function readFromIndexedDb<T>(url: string) {
	const db = await openDb();
	if (!db) return null;

	return new Promise<CachedPayload<T> | null>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const request = store.get(url);

		request.onsuccess = () => resolve((request.result as CachedPayload<T> | undefined) ?? null);
		request.onerror = () => resolve(null);
	});
}

async function writeToIndexedDb<T>(payload: CachedPayload<T>) {
	const db = await openDb();
	if (!db) return false;

	return new Promise<boolean>((resolve) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const request = store.put(payload);

		request.onsuccess = () => resolve(true);
		request.onerror = () => resolve(false);
	});
}

function readFromLocalStorage<T>(url: string) {
	if (!canUseBrowserStorage() || !window.localStorage) return null;

	try {
		const raw = window.localStorage.getItem(localKey(url));
		if (!raw) return null;
		return JSON.parse(raw) as CachedPayload<T>;
	} catch {
		return null;
	}
}

function writeToLocalStorage<T>(payload: CachedPayload<T>) {
	if (!canUseBrowserStorage() || !window.localStorage) return;

	try {
		window.localStorage.setItem(localKey(payload.url), JSON.stringify(payload));
	} catch {
		// Storage quota is best-effort. Fresh network data is still returned.
	}
}

async function readCache<T>(url: string, allowExpired = false) {
	const now = Date.now();
	const cached = (await readFromIndexedDb<T>(url)) ?? readFromLocalStorage<T>(url);
	if (!cached) return null;
	if (!allowExpired && cached.expiresAt <= now) return null;
	return cached;
}

async function writeCache<T>(url: string, data: T, ttlMs: number) {
	const now = Date.now();
	const payload: CachedPayload<T> = {
		url,
		data,
		savedAt: now,
		expiresAt: now + ttlMs
	};

	const savedToIndexedDb = await writeToIndexedDb(payload);
	if (!savedToIndexedDb) writeToLocalStorage(payload);
}

export async function cachedApiJson<T = unknown>(
	fetcher: Fetcher,
	url: string,
	ttlMs: number
): Promise<CachedJsonResult<T>> {
	const cacheUrl = canUseBrowserStorage() ? normalizeUrl(url) : url;
	const cached = canUseBrowserStorage() ? await readCache<T>(cacheUrl) : null;

	if (cached) {
		return {
			ok: true,
			data: cached.data,
			meta: { cache: 'browser-hit', cachedAt: cached.savedAt },
			fromCache: true,
			status: 200
		};
	}

	try {
		const response = await fetcher(url);
		const json = await response.json().catch(() => null);

		if (response.ok && json !== null && canUseBrowserStorage()) {
			await writeCache(cacheUrl, json as T, ttlMs);
		}

		return {
			ok: response.ok,
			data: json as T | null,
			meta:
				json && typeof json === 'object' && 'meta' in json
					? ((json as { meta?: Record<string, unknown> }).meta ?? null)
					: null,
			fromCache: false,
			status: response.status
		};
	} catch (error) {
		const stale = canUseBrowserStorage() ? await readCache<T>(cacheUrl, true) : null;
		if (stale) {
			return {
				ok: true,
				data: stale.data,
				meta: { cache: 'browser-stale', cachedAt: stale.savedAt },
				fromCache: true,
				status: 200
			};
		}

		throw error;
	}
}
