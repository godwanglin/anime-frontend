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

function setSession(nextUser: AuthUser, nextAccessToken?: string | null) {
	user = nextUser;
	accessToken = nextAccessToken ?? accessToken;
	rememberUser(nextUser);
	bootstrapped = true;
}

function consumeGoogleLoginHandoff() {
	if (!browser) return null;
	const match = document.cookie.match(/(?:^|;\s*)google_login_user=([^;]+)/);
	if (!match?.[1]) return null;

	document.cookie = 'google_login_user=; Max-Age=0; path=/; SameSite=Lax';

	try {
		const bytes = Uint8Array.from(atob(decodeURIComponent(match[1])), (char) =>
			char.charCodeAt(0)
		);
		const json = new TextDecoder().decode(bytes);
		const nextUser = JSON.parse(json) as AuthUser;
		setSession(nextUser);
		refreshToken().catch(() => null);
		return nextUser;
	} catch {
		return null;
	}
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
let lastRefreshSessionInvalid = false;

const isLoggedIn = $derived(Boolean(user));
const hasAccessToken = $derived(Boolean(accessToken));
const isPremium = $derived(
	config.ENABLE_PREMIUM_FEATURE && (user?.role === 'premium' || user?.role === 'admin')
);

function bootstrapLazy() {
	bootstrapped = true;
}

async function refreshToken() {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		lastRefreshSessionInvalid = false;
		try {
			const response = await fetch('/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});
			const json = (await response.json().catch(() => null)) as ApiEnvelope<{
				accessToken?: string;
			}> | null;

			if (!response.ok) {
				lastRefreshSessionInvalid = response.status === 401 || response.status === 403;
				throw new Error(json?.message ?? 'Refresh token gagal');
			}

			const data = (json?.data ?? json) as { accessToken?: string } | null;
			accessToken = data?.accessToken ?? null;
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
	if (!accessToken && user) {
		await ensureAccessToken();
	}

	const headers = new Headers(init.headers);
	const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
	if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
	if (init.body && !headers.has('Content-Type') && !isFormData)
		headers.set('Content-Type', 'application/json');

	const url = path.startsWith('/api') ? path : path;

	const response = await fetch(url, {
		...init,
		headers,
		credentials: 'include'
	});

	if (response.status === 401 && retry) {
		const token = await refreshToken();
		if (token) return authFetch(path, init, false);
		if (lastRefreshSessionInvalid) await logout(false);
	}

	return response;
}

async function fetchMe() {
	isLoading = true;
	try {
		await ensureAccessToken();
		const response = await authFetch('/api/auth/me');
		if (!response.ok) {
			if (response.status === 401 && lastRefreshSessionInvalid) await logout(false);
			return null;
		}
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
		const response = await fetch('/api/auth/login', {
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
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(payload)
		});
		return parseApi<{ user: AuthUser }>(response);
	} finally {
		isLoading = false;
	}
}

async function logout(callApi = true) {
	if (callApi) {
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include'
		}).catch(() => null);
	}
	accessToken = null;
	user = null;
	rememberUser(null);
}

async function updateProfile(payload: { username?: string; fullName?: string }) {
	const response = await authFetch('/api/auth/me', {
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

async function requestPasswordReset(payload: { email: string }) {
	const response = await fetch('/api/auth/password-reset/request', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(payload)
	});
	return parseApi<{ sent: boolean }>(response);
}

async function confirmPasswordReset(payload: { token: string; password: string }) {
	const response = await fetch('/api/auth/password-reset/confirm', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify(payload)
	});
	return parseApi<{ reset: boolean }>(response);
}

function startAutoRefresh() {
	if (!browser || refreshTimer) return;
	refreshTimer = setInterval(
		() => {
			if (user) refreshToken();
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
	setSession,
	consumeGoogleLoginHandoff,
	refreshToken,
	ensureAccessToken,
	fetchMe,
	bootstrapLazy,
	updateProfile,
	uploadAvatar,
	updatePassword,
	requestPasswordReset,
	confirmPasswordReset,
	authFetch,
	parseApi,
	startAutoRefresh
};
