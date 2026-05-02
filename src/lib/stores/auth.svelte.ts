import { browser } from '$app/environment';
import config from '$lib/config';
import type { EquippedEffect, EquippedFrame, EquippedNameTag } from '$lib/decorations';
import type { ExpBadge, LevelProgress } from '$lib/exp';

export type ProfileStats = {
	episodeCount: number;
	watchSeconds: number;
	watchHours: number;
	savedCount: number;
};

export type AuthUser = {
	id: number;
	email: string;
	username: string;
	fullName?: string | null;
	avatar: string | null;
	role?: string;
	isVerified?: boolean;
	exp?: number;
	level?: number;
	lastExpGainAt?: string | null;
	badge?: ExpBadge;
	levelProgress?: LevelProgress;
	profileStats?: ProfileStats;
	frame?: EquippedFrame;
	nametag?: EquippedNameTag;
	effects?: EquippedEffect[];
	createdAt?: string;
};

export type PublicUser = {
	id: number;
	username: string;
	fullName?: string | null;
	avatar: string | null;
	role?: string;
	isVerified?: boolean;
	exp?: number;
	level?: number;
	lastExpGainAt?: string | null;
	badge?: ExpBadge;
	levelProgress?: LevelProgress;
	profileStats?: ProfileStats;
	frame?: EquippedFrame;
	nametag?: EquippedNameTag;
	effects?: EquippedEffect[];
	createdAt?: string;
};

type ApiEnvelope<T> = {
	status: number;
	message: string | null;
	errorCode: string | null;
	data: T;
	meta?: Record<string, unknown>;
};

function cachedUser() {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem('auth_user');
		return raw ? (JSON.parse(raw) as AuthUser) : null;
	} catch {
		return null;
	}
}

function rememberUser(user: AuthUser | null) {
	if (!browser) return;
	if (user) localStorage.setItem('auth_user', JSON.stringify(user));
	else localStorage.removeItem('auth_user');
}

async function parseApi<T>(response: Response) {
	const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
	if (!response.ok) {
		throw new Error(json?.message ?? 'Request gagal');
	}
	return (json?.data ?? json) as T;
}

let user = $state<AuthUser | null>(cachedUser());
let accessToken = $state<string | null>(null);
let isLoading = $state(false);
let bootstrapped = $state(false);
let refreshPromise: Promise<string | null> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const isLoggedIn = $derived(Boolean(user));
const hasAccessToken = $derived(Boolean(accessToken));
const isPremium = $derived(user?.role === 'premium' || user?.role === 'admin');

function bootstrapLazy() {
	bootstrapped = true;
}

async function refreshToken() {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			const response = await fetch('/creds/refresh', {
				method: 'GET',
				credentials: 'include'
				// headers: { 'Content-Type': 'application/json' },
				// body: JSON.stringify({})
			});
			const data = await parseApi<{ accessToken: string }>(response);
			accessToken = data.accessToken;
			return accessToken;
		} catch {
			accessToken = null;
			return null;
		} finally {
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

async function ensureAccessToken() {
	if (accessToken) return accessToken;
	if (!user) return null;
	return refreshToken();
}

async function authFetch(path: string, init: RequestInit = {}, retry = true) {
	// console.log('authFetch', path, init);
	const method = (init.method ?? 'GET').toUpperCase();
	if (!accessToken && user) {
		const token = await ensureAccessToken();
		if (!token) {
			await logout(false);
			if (method !== 'GET' && method !== 'HEAD') {
				return new Response(JSON.stringify({ message: 'Sesi login sudah berakhir' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
	}

	const headers = new Headers(init.headers);
	const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
	if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
	if (init.body && !headers.has('Content-Type') && !isFormData)
		headers.set('Content-Type', 'application/json');

	// filter if path with /api prefix, if not prepend API_BASE_URL
	const url = path.startsWith('/api') ? `${config.API_BASE_URL}${path}` : path;

	const response = await fetch(url, {
		...init,
		headers,
		credentials: 'include'
	});

	if (response.status === 401 && retry) {
		const token = await refreshToken();
		if (token) return authFetch(path, init, false);
		await logout(false);
	}

	return response;
}

async function fetchMe() {
	isLoading = true;
	try {
		const token = await ensureAccessToken();
		if (!token) {
			await logout(false);
			return null;
		}
		const response = await authFetch('/creds/me');
		const data = await parseApi<AuthUser>(response);
		user = data;
		rememberUser(data);
		return data;
	} finally {
		isLoading = false;
		bootstrapped = true;
	}
}

async function login(payload: { email: string; password: string }) {
	isLoading = true;
	try {
		const response = await fetch('/creds/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload)
		});
		const data = await parseApi<{ accessToken: string; user: AuthUser }>(response);
		accessToken = data.accessToken;
		user = data.user;
		rememberUser(data.user);
		return data;
	} finally {
		isLoading = false;
		bootstrapped = true;
	}
}

async function register(payload: { email: string; username?: string; fullName?: string; password: string }) {
	isLoading = true;
	try {
		const response = await fetch('/creds/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		return parseApi<{ user: AuthUser }>(response);
	} finally {
		isLoading = false;
	}
}

async function logout(callApi = true) {
	if (callApi) {
		await fetch('/creds/logout', {
			method: 'POST',
			credentials: 'include'
		}).catch(() => null);
	}
	accessToken = null;
	user = null;
	rememberUser(null);
}

async function updateProfile(payload: { username?: string; fullName?: string }) {
	const response = await authFetch('/creds/me', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	const data = await parseApi<AuthUser>(response);
	user = data;
	rememberUser(data);
	return data;
}

async function uploadAvatar(file: File) {
	const form = new FormData();
	form.append('file', file);

	const response = await authFetch('/api/auth/me/avatar', {
		method: 'POST',
		body: form
	});
	const data = await parseApi<AuthUser>(response);
	user = data;
	rememberUser(data);
	return data;
}

async function updatePassword(payload: { currentPassword: string; newPassword: string }) {
	const response = await authFetch('/api/auth/password', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
	return parseApi<{ message: string }>(response);
}

function startAutoRefresh() {
	if (!browser || refreshTimer) return;
	refreshTimer = setInterval(
		() => {
			if (user && accessToken) refreshToken();
		},
		12 * 60 * 1000
	);
}

export const auth = {
	get user() {
		return user;
	},
	get accessToken() {
		return accessToken;
	},
	get hasAccessToken() {
		return hasAccessToken;
	},
	get isLoading() {
		return isLoading;
	},
	get isLoggedIn() {
		return isLoggedIn;
	},
	get isPremium() {
		return isPremium;
	},
	get bootstrapped() {
		return bootstrapped;
	},
	login,
	register,
	logout,
	refreshToken,
	ensureAccessToken,
	fetchMe,
	bootstrapLazy,
	updateProfile,
	uploadAvatar,
	updatePassword,
	authFetch,
	parseApi,
	startAutoRefresh
};
