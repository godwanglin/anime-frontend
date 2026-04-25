import { browser } from '$app/environment';
import { auth } from './auth.svelte';

export type UserPreference = {
	id?: number;
	userId?: number;
	theme: 'dark' | 'light' | 'system';
	defaultQuality: 'auto' | '1080p' | '720p' | '480p';
	autoPlay: boolean;
	defaultVolume: number;
	autoNextEpisode: boolean;
	skipIntroEnabled: boolean;
	subtitleEnabled: boolean;
	subtitleLang: string;
	subtitleFontSize: string;
	subtitleFontFamily: string;
	subtitleColor: string;
	subtitleBg: string;
	subtitleShadow: string;
	subtitlePosition: string;
	subtitleOpacity: number;
	subtitleMaxWidth: string;
};

const fallbackPreference: UserPreference = {
	theme: 'dark',
	defaultQuality: 'auto',
	autoPlay: false,
	defaultVolume: 1,
	autoNextEpisode: true,
	skipIntroEnabled: false,
	subtitleEnabled: true,
	subtitleLang: 'id',
	subtitleFontSize: '1.5rem',
	subtitleFontFamily: 'inherit',
	subtitleColor: '#ffffff',
	subtitleBg: 'rgba(0,0,0,0.5)',
	subtitleShadow: '0 2px 6px rgba(0,0,0,1)',
	subtitlePosition: '10%',
	subtitleOpacity: 1,
	subtitleMaxWidth: '90%'
};

let pref = $state<UserPreference>({ ...fallbackPreference });
let isLoading = $state(false);

function qualityToPlayerValue(quality: UserPreference['defaultQuality']) {
	if (quality === 'auto') return '-1';
	return '-1';
}

function applyTheme(theme = pref.theme) {
	if (!browser) return;
	const useDark =
		theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
	document.documentElement.classList.toggle('dark', useDark);
	document.documentElement.style.colorScheme = useDark ? 'dark' : 'light';
	localStorage.setItem('theme', theme);
}

function syncPlayerStorage() {
	if (!browser) return;
	localStorage.setItem('vp_volume', String(pref.defaultVolume));
	localStorage.setItem('vp_quality', qualityToPlayerValue(pref.defaultQuality));
}

async function fetchPreference() {
	if (!auth.isLoggedIn) {
		applyTheme();
		syncPlayerStorage();
		return pref;
	}
	isLoading = true;
	try {
		const response = await auth.authFetch('/api/preference');
		pref = await auth.parseApi<UserPreference>(response);
		applyTheme();
		syncPlayerStorage();
		return pref;
	} finally {
		isLoading = false;
	}
}

async function updatePreference(partial: Partial<UserPreference>) {
	pref = { ...pref, ...partial };
	applyTheme();
	syncPlayerStorage();

	if (!auth.isLoggedIn) return pref;
	const response = await auth.authFetch('/api/preference', {
		method: 'PUT',
		body: JSON.stringify(partial)
	});
	pref = await auth.parseApi<UserPreference>(response);
	applyTheme();
	syncPlayerStorage();
	return pref;
}

export const preference = {
	get pref() {
		return pref;
	},
	get isLoading() {
		return isLoading;
	},
	fetchPreference,
	updatePreference,
	applyTheme,
	syncPlayerStorage
};

export function getPreferenceContext() {
	return preference;
}
