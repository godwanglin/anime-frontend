import { STORAGE_KEYS } from './types';

interface ProgressContext {
	getSrcList: () => string[];
}

interface SavedProgress {
	time: number;
	duration: number;
	updatedAt: number;
}

const SAVE_INTERVAL_MS = 5000;
const MIN_RESUME_TIME = 5;
const END_MARGIN_SECONDS = 8;

export function createProgressManager(ctx: ProgressContext) {
	let lastSaveAt = 0;

	function storageKey() {
		return `${STORAGE_KEYS.progressPrefix}${encodeURIComponent(ctx.getSrcList().join('||'))}`;
	}

	function load() {
		try {
			const raw = localStorage.getItem(storageKey());
			if (!raw) return undefined;

			const saved = JSON.parse(raw) as SavedProgress;
			if (!Number.isFinite(saved.time) || saved.time < MIN_RESUME_TIME) return undefined;
			if (
				Number.isFinite(saved.duration) &&
				saved.duration > 0 &&
				saved.duration - saved.time <= END_MARGIN_SECONDS
			) {
				clear();
				return undefined;
			}

			return saved.time;
		} catch {
			return undefined;
		}
	}

	function remember(time: number, duration: number, force = false) {
		if (!Number.isFinite(time) || time < MIN_RESUME_TIME) return;

		const now = Date.now();
		if (!force && now - lastSaveAt < SAVE_INTERVAL_MS) return;
		lastSaveAt = now;

		if (Number.isFinite(duration) && duration > 0 && duration - time <= END_MARGIN_SECONDS) {
			clear();
			return;
		}

		try {
			localStorage.setItem(
				storageKey(),
				JSON.stringify({
					time,
					duration: Number.isFinite(duration) ? duration : 0,
					updatedAt: now
				} satisfies SavedProgress)
			);
		} catch {
			// localStorage may be unavailable.
		}
	}

	function clear() {
		try {
			localStorage.removeItem(storageKey());
		} catch {
			// localStorage may be unavailable.
		}
	}

	return {
		load,
		remember,
		clear
	};
}
