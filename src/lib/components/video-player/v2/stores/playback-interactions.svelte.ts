import type { PlaybackConfig, TapSide } from './types';

interface InteractionContext {
	getContainerEl: () => HTMLElement | undefined;
	getIsPlaying: () => boolean;
	getCurrentTime: () => number;
	getVolume: () => number;
	getPlaybackConfig: () => PlaybackConfig | undefined;
	setVolume: (value: number) => void;
	toggleMute: () => void;
	seek: (time: number) => void;
	togglePlay: () => void;
	setControlsVisible: (value: boolean) => void;
}

export function createPlaybackInteractions(ctx: InteractionContext) {
	let isFullscreen = $state(false);
	let tapSide = $state<TapSide>(null);
	let tapAccumulator = $state(0);
	let tapToastVisible = $state(false);

	let controlsTimer: ReturnType<typeof setTimeout> | null = null;
	let tapTimer: ReturnType<typeof setTimeout> | null = null;
	let centerClickTimer: ReturnType<typeof setTimeout> | null = null;
	let centerClickCount = 0;

	const skipSeconds = () => ctx.getPlaybackConfig()?.skipSeconds ?? 10;

	function skipBackward() {
		ctx.seek(ctx.getCurrentTime() - skipSeconds());
	}

	function skipForward() {
		ctx.seek(ctx.getCurrentTime() + skipSeconds());
	}

	function toggleFullscreen() {
		const containerEl = ctx.getContainerEl();
		if (!containerEl) return;
		if (!document.fullscreenElement) containerEl.requestFullscreen().catch(() => {});
		else document.exitFullscreen().catch(() => {});
	}

	function handleTap(side: 'left' | 'right') {
		if (tapTimer) clearTimeout(tapTimer);
		if (tapSide !== side) {
			tapAccumulator = skipSeconds();
			tapSide = side;
		} else {
			tapAccumulator += skipSeconds();
		}

		tapToastVisible = true;
		tapTimer = setTimeout(() => {
			ctx.seek(ctx.getCurrentTime() + (tapSide === 'left' ? -tapAccumulator : tapAccumulator));
			tapSide = null;
			tapAccumulator = 0;
			tapToastVisible = false;
			tapTimer = null;
		}, 800);
	}

	function onVideoClick(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const ratio = (e.clientX - rect.left) / rect.width;

		if (ratio < 0.3) handleTap('left');
		else if (ratio > 0.7) handleTap('right');
		else {
			centerClickCount++;
			if (centerClickTimer) clearTimeout(centerClickTimer);
			centerClickTimer = setTimeout(() => {
				if (centerClickCount === 1) ctx.togglePlay();
				else toggleFullscreen();
				centerClickCount = 0;
				centerClickTimer = null;
			}, 280);
		}
	}

	function resetControlsTimer() {
		ctx.setControlsVisible(true);
		if (controlsTimer) clearTimeout(controlsTimer);
		if (ctx.getIsPlaying()) controlsTimer = setTimeout(() => ctx.setControlsVisible(false), 3000);
	}

	function onMouseMove() {
		resetControlsTimer();
	}

	function onMouseLeave() {
		if (!ctx.getIsPlaying()) return;
		if (controlsTimer) clearTimeout(controlsTimer);
		controlsTimer = setTimeout(() => ctx.setControlsVisible(false), 1000);
	}

	function onFullscreenChange() {
		isFullscreen = document.fullscreenElement === ctx.getContainerEl();
	}

	function onKeydown(e: KeyboardEvent) {
		const containerEl = ctx.getContainerEl();
		if (!containerEl?.contains(document.activeElement) && document.activeElement !== document.body)
			return;

		if (e.key === ' ' || e.key === 'k') {
			e.preventDefault();
			ctx.togglePlay();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			skipForward();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			skipBackward();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			ctx.setVolume(ctx.getVolume() + 0.1);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			ctx.setVolume(ctx.getVolume() - 0.1);
		} else if (e.key === 'm') ctx.toggleMute();
		else if (e.key === 'f') toggleFullscreen();
	}

	function destroy() {
		if (controlsTimer) clearTimeout(controlsTimer);
		if (tapTimer) clearTimeout(tapTimer);
		if (centerClickTimer) clearTimeout(centerClickTimer);
	}

	return {
		skipBackward,
		skipForward,
		toggleFullscreen,
		handleTap,
		onVideoClick,
		onMouseMove,
		onMouseLeave,
		onFullscreenChange,
		onKeydown,
		resetControlsTimer,
		destroy,
		get isFullscreen() {
			return isFullscreen;
		},
		get tapSide() {
			return tapSide;
		},
		get tapAccumulator() {
			return tapAccumulator;
		},
		get tapToastVisible() {
			return tapToastVisible;
		}
	};
}
