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
	let didAutoSkipOutro = $state(false);
	let toastVisible = $state(false);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	const seconds = $derived(Number(ctx.getConfig()?.seconds ?? 0));
	const outroSeconds = $derived(Number(ctx.getConfig()?.outroSeconds ?? 0));
	const hasIntro = $derived(seconds > 0);
	const hasOutro = $derived(outroSeconds > 0);
	const autoSkipEnabled = $derived(ctx.getConfig()?.enabled === true && ctx.getConfig()?.autoSkip !== false);
	const autoSkipOutroEnabled = $derived(autoSkipEnabled && ctx.getConfig()?.autoSkipOutro !== false);
	const canSkip = $derived(
		hasIntro &&
			ctx.getConfig()?.showButton !== false &&
			ctx.getConfig()?.enabled !== true &&
			isTargetValid() &&
			ctx.getCurrentTime() < seconds &&
			ctx.getCurrentTime() <= (ctx.getConfig()?.buttonUntil ?? Math.min(seconds, 90))
	);
	const canSkipOutro = $derived(
		hasOutro &&
			ctx.getConfig()?.showButton !== false &&
			ctx.getConfig()?.enabled !== true &&
			isOutroTargetValid() &&
			ctx.getCurrentTime() >= Math.max(0, outroSeconds - (ctx.getConfig()?.outroButtonLead ?? 30)) &&
			ctx.getCurrentTime() < outroSeconds
	);

	function isTargetValid() {
		const duration = ctx.getDuration();
		return (
			Number.isFinite(seconds) && seconds > 0 && (!Number.isFinite(duration) || seconds < duration)
		);
	}

	function isOutroTargetValid() {
		const duration = ctx.getDuration();
		return (
			Number.isFinite(outroSeconds) &&
			outroSeconds > 0 &&
			Number.isFinite(duration) &&
			duration > 0 &&
			outroSeconds < duration
		);
	}

	function onLoadedMetadata() {
		didAutoSkip = false;
		didAutoSkipOutro = false;
		if (!autoSkipEnabled || !hasIntro || didAutoSkip) return;
		didAutoSkip = true;

		window.setTimeout(() => {
			const video = ctx.getVideoEl();
			if (!video || video.currentTime > 1 || !isTargetValid()) return;
			skip();
		}, 250);
	}

	function onTimeUpdate() {
		if (!autoSkipOutroEnabled || !hasOutro || didAutoSkipOutro) return;
		if (!isOutroTargetValid() || ctx.getCurrentTime() < outroSeconds) return;
		didAutoSkipOutro = true;
		skipOutro();
	}

	function skip() {
		const video = ctx.getVideoEl();
		if (!video || !isTargetValid()) return;
		video.currentTime = seconds;
		showToast();
	}

	function skipOutro() {
		const video = ctx.getVideoEl();
		const duration = ctx.getDuration();
		if (!video || !isOutroTargetValid()) return;
		video.currentTime = Math.max(0, duration - 0.05);
		showOutroToast();
	}

	function showToast() {
		toastVisible = true;
		ctx.notify(`Intro dilewati ke ${Math.round(seconds)} detik`);
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toastVisible = false;
		}, 2600);
	}

	function showOutroToast() {
		toastVisible = true;
		ctx.notify("Outro dilewati");
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
		onTimeUpdate,
		skip,
		skipOutro,
		destroy,
		get seconds() {
			return seconds;
		},
		get outroSeconds() {
			return outroSeconds;
		},
		get canSkip() {
			return canSkip;
		},
		get canSkipOutro() {
			return canSkipOutro;
		},
		get toastVisible() {
			return toastVisible;
		}
	};
}
