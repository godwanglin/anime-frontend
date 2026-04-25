import type { SkipIntroConfig } from './types';

interface SkipIntroContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getCurrentTime: () => number;
	getDuration: () => number;
	getConfig: () => SkipIntroConfig | undefined;
	notify: (message: string) => void;
}

export function createSkipIntroManager(ctx: SkipIntroContext) {
	let didAutoSkip = $state(false);
	let toastVisible = $state(false);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	const seconds = $derived(Number(ctx.getConfig()?.seconds ?? 0));
	const enabled = $derived(ctx.getConfig()?.enabled === true && seconds > 0);
	const canSkip = $derived(
		enabled &&
			ctx.getConfig()?.showButton !== false &&
			isTargetValid() &&
			ctx.getCurrentTime() < seconds &&
			ctx.getCurrentTime() <= (ctx.getConfig()?.buttonUntil ?? Math.min(seconds, 90))
	);

	function isTargetValid() {
		const duration = ctx.getDuration();
		return (
			Number.isFinite(seconds) && seconds > 0 && (!Number.isFinite(duration) || seconds < duration)
		);
	}

	function onLoadedMetadata() {
		if (!enabled || didAutoSkip || ctx.getConfig()?.autoSkip === false) return;
		didAutoSkip = true;

		window.setTimeout(() => {
			const video = ctx.getVideoEl();
			if (!video || video.currentTime > 1 || !isTargetValid()) return;
			skip();
		}, 250);
	}

	function skip() {
		const video = ctx.getVideoEl();
		if (!video || !isTargetValid()) return;
		video.currentTime = seconds;
		showToast();
	}

	function showToast() {
		toastVisible = true;
		ctx.notify(`Intro dilewati ke ${Math.round(seconds)} detik`);
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toastVisible = false;
		}, 2600);
	}

	function destroy() {
		if (toastTimer) clearTimeout(toastTimer);
	}

	return {
		onLoadedMetadata,
		skip,
		destroy,
		get seconds() {
			return seconds;
		},
		get canSkip() {
			return canSkip;
		},
		get toastVisible() {
			return toastVisible;
		}
	};
}
