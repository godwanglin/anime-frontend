import type { PlaybackConfig, TapSide } from './types';

interface InteractionContext {
	getContainerEl: () => HTMLElement | undefined;
	getIsPlaying: () => boolean;
	getControlsVisible: () => boolean;
	getCurrentTime: () => number;
	getVolume: () => number;
	getBrightness: () => number;
	getPlaybackConfig: () => PlaybackConfig | undefined;
	setVolume: (value: number) => void;
	setBrightness: (value: number) => void;
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
	let sideTapTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSideTap = $state<TapSide>(null);
	let surfaceTapTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingSurfaceTap: 'left' | 'center' | 'right' | null = null;
	let centerClickTimer: ReturnType<typeof setTimeout> | null = null;
	let centerClickCount = 0;
	let suppressClickTimer: ReturnType<typeof setTimeout> | null = null;
	let suppressNextClick = false;
	let suppressMouseActivityUntil = 0;
	let volumeGestureTimer: ReturnType<typeof setTimeout> | null = null;
	let volumeGestureVisible = $state(false);
	let brightnessGestureTimer: ReturnType<typeof setTimeout> | null = null;
	let brightnessGestureVisible = $state(false);
	let controlsHeld = false;
	let activeSeekPointerId: number | null = null;
	let pointerStart:
		| {
				id: number;
				x: number;
				y: number;
				time: number;
				startTime: number;
				startVolume: number;
				startBrightness: number;
				brightnessZone: boolean;
				volumeZone: boolean;
				seeking: boolean;
				adjustingBrightness: boolean;
				adjustingVolume: boolean;
		  }
		| null = null;

	const TAP_MAX_MOVE = 24;
	const TAP_MAX_DURATION = 650;
	const SINGLE_TAP_DELAY = 280;
	const DOUBLE_TAP_DELAY = 320;
	const SURFACE_SEEK_MIN_MOVE = 18;
	const SURFACE_SEEK_AXIS_RATIO = 1.25;
	const SURFACE_SEEK_SECONDS_PER_SCREEN = 90;
	const SURFACE_VOLUME_ZONE_RATIO = 0.72;
	const SURFACE_BRIGHTNESS_ZONE_RATIO = 0.28;
	const SURFACE_VOLUME_MIN_MOVE = 18;
	const SURFACE_VOLUME_AXIS_RATIO = 1.2;
	const SURFACE_VOLUME_CHANGE_PER_SCREEN = 1.15;
	const SURFACE_BRIGHTNESS_CHANGE_PER_SCREEN = 1.15;

	const skipSeconds = () => ctx.getPlaybackConfig()?.skipSeconds ?? 10;

	function skipBackward() {
		ctx.seek(ctx.getCurrentTime() - skipSeconds());
	}

	function skipForward() {
		ctx.seek(ctx.getCurrentTime() + skipSeconds());
	}

	async function lockLandscapeOrientation() {
		try {
			if (typeof window === 'undefined') return;

			const orientation = window.screen?.orientation;
			if (!orientation?.lock) return;

			await orientation.lock('landscape');
		} catch {
			// Best-effort only. Unsupported devices must keep fullscreen working silently.
		}
	}

	function unlockScreenOrientation() {
		try {
			window.screen?.orientation?.unlock?.();
		} catch {
			// Some browsers expose the API but reject unlock outside supported contexts.
		}
	}

	function toggleFullscreen() {
		const containerEl = ctx.getContainerEl();
		if (!containerEl) return;
		if (!document.fullscreenElement) {
			containerEl.requestFullscreen().then(lockLandscapeOrientation).catch(() => {});
		} else {
			unlockScreenOrientation();
			document.exitFullscreen().catch(() => {});
		}
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

	function clearSideTapTimer() {
		if (sideTapTimer) clearTimeout(sideTapTimer);
		sideTapTimer = null;
		pendingSideTap = null;
	}

	function clearSurfaceTapTimer() {
		if (surfaceTapTimer) clearTimeout(surfaceTapTimer);
		surfaceTapTimer = null;
		pendingSurfaceTap = null;
	}

	function clearControlsTimer() {
		if (!controlsTimer) return;
		clearTimeout(controlsTimer);
		controlsTimer = null;
	}

	function clearVolumeGestureTimer() {
		if (volumeGestureTimer) clearTimeout(volumeGestureTimer);
		volumeGestureTimer = null;
	}

	function clearBrightnessGestureTimer() {
		if (brightnessGestureTimer) clearTimeout(brightnessGestureTimer);
		brightnessGestureTimer = null;
	}

	function showVolumeGesture() {
		clearVolumeGestureTimer();
		volumeGestureVisible = true;
	}

	function showBrightnessGesture() {
		clearBrightnessGestureTimer();
		brightnessGestureVisible = true;
	}

	function hideVolumeGestureSoon() {
		clearVolumeGestureTimer();
		volumeGestureTimer = setTimeout(() => {
			volumeGestureVisible = false;
			volumeGestureTimer = null;
		}, 700);
	}

	function hideBrightnessGestureSoon() {
		clearBrightnessGestureTimer();
		brightnessGestureTimer = setTimeout(() => {
			brightnessGestureVisible = false;
			brightnessGestureTimer = null;
		}, 700);
	}

	function isCenterControlTarget(target: EventTarget | null) {
		return target instanceof Element && !!target.closest('.vp-center-controls');
	}

	function isInteractiveTarget(target: EventTarget | null, allowCenterControls = false) {
		if (!(target instanceof Element)) return false;
		if (allowCenterControls && isCenterControlTarget(target)) return false;
		return !!target.closest(
			[
				'button',
				'a',
				'input',
				'select',
				'textarea',
				'summary',
				'[role="button"]',
				'[role="link"]',
				'[role="slider"]',
				'[contenteditable="true"]',
				'.vp-settings-panel',
				'.vp-ep-drawer'
			].join(',')
		);
	}

	function handleSideTapCandidate(side: 'left' | 'right') {
		if (tapToastVisible && tapSide === side) {
			handleTap(side);
			return;
		}

		if (sideTapTimer && pendingSideTap === side) {
			clearSideTapTimer();
			handleTap(side);
			return;
		}

		clearSideTapTimer();
		pendingSideTap = side;
		sideTapTimer = setTimeout(clearSideTapTimer, DOUBLE_TAP_DELAY);
	}

	function handleCenterTap() {
		centerClickCount++;
		if (centerClickTimer) clearTimeout(centerClickTimer);
		centerClickTimer = setTimeout(() => {
			if (centerClickCount === 1) ctx.togglePlay();
			else toggleFullscreen();
			centerClickCount = 0;
			centerClickTimer = null;
		}, 280);
	}

	function clearCenterClickTimer() {
		if (!centerClickTimer) return;
		clearTimeout(centerClickTimer);
		centerClickTimer = null;
		centerClickCount = 0;
	}

	function suppressNextSurfaceClick() {
		suppressNextClick = true;
		suppressMouseActivityUntil = performance.now() + 700;
		if (suppressClickTimer) clearTimeout(suppressClickTimer);
		suppressClickTimer = setTimeout(() => {
			suppressNextClick = false;
			suppressClickTimer = null;
		}, 500);
	}

	function clearSuppressClick() {
		if (suppressClickTimer) clearTimeout(suppressClickTimer);
		suppressClickTimer = null;
		suppressNextClick = false;
	}

	function hideControlsNow() {
		clearControlsTimer();
		clearCenterClickTimer();
		ctx.setControlsVisible(false);
	}

	function shouldHideVisibleControls(pointerType?: string) {
		return (
			pointerType !== 'mouse' &&
			ctx.getControlsVisible() &&
			ctx.getIsPlaying() &&
			!controlsHeld
		);
	}

	function getSurfaceTapSide(clientX: number, surfaceEl: HTMLElement) {
		const rect = surfaceEl.getBoundingClientRect();
		if (rect.width <= 0) return 'center';
		const ratio = (clientX - rect.left) / rect.width;
		if (ratio < 0.3) return 'left';
		if (ratio > 0.7) return 'right';
		return 'center';
	}

	function isVolumeGestureZone(clientX: number, surfaceEl: HTMLElement) {
		const rect = surfaceEl.getBoundingClientRect();
		if (rect.width <= 0) return false;
		return (clientX - rect.left) / rect.width >= SURFACE_VOLUME_ZONE_RATIO;
	}

	function isBrightnessGestureZone(clientX: number, surfaceEl: HTMLElement) {
		const rect = surfaceEl.getBoundingClientRect();
		if (rect.width <= 0) return false;
		return (clientX - rect.left) / rect.width <= SURFACE_BRIGHTNESS_ZONE_RATIO;
	}

	function toggleControlsFromSingleTap() {
		if (ctx.getControlsVisible() && ctx.getIsPlaying()) {
			hideControlsNow();
			suppressMouseActivityUntil = performance.now() + 700;
			return;
		}

		resetControlsTimer();
	}

	function scheduleSurfaceTap(clientX: number, surfaceEl: HTMLElement) {
		const side = getSurfaceTapSide(clientX, surfaceEl);

		if (
			side !== 'center' &&
			surfaceTapTimer &&
			pendingSurfaceTap === side
		) {
			clearSurfaceTapTimer();
			handleTap(side);
			return;
		}

		clearSurfaceTapTimer();
		pendingSurfaceTap = side;
		surfaceTapTimer = setTimeout(() => {
			clearSurfaceTapTimer();
			toggleControlsFromSingleTap();
		}, SINGLE_TAP_DELAY);
	}

	function handleSurfaceActivation(
		clientX: number,
		surfaceEl: HTMLElement,
		pointerType?: string
	) {
		const rect = surfaceEl.getBoundingClientRect();
		if (rect.width <= 0) return;
		const ratio = (clientX - rect.left) / rect.width;

		if (shouldHideVisibleControls(pointerType)) {
			if (ratio < 0.3) handleSideTapCandidate('left');
			else if (ratio > 0.7) handleSideTapCandidate('right');
			hideControlsNow();
			return;
		}

		resetControlsTimer();

		if (ratio < 0.3) handleSideTapCandidate('left');
		else if (ratio > 0.7) handleSideTapCandidate('right');
		else handleCenterTap();
	}

	function onVideoClick(e: MouseEvent) {
		if (isInteractiveTarget(e.target)) return;
		handleSurfaceActivation(e.clientX, e.currentTarget as HTMLElement, 'mouse');
	}

	function onSurfaceClickCapture(e: MouseEvent) {
		if (!suppressNextClick) return;
		e.preventDefault();
		e.stopPropagation();
		clearSuppressClick();
	}

	function onSurfacePointerDown(e: PointerEvent) {
		if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
		if (isInteractiveTarget(e.target)) return;
		if (e.pointerType !== 'mouse') e.preventDefault();
		const surfaceEl = ctx.getContainerEl() ?? (e.currentTarget as HTMLElement);
		pointerStart = {
			id: e.pointerId,
			x: e.clientX,
			y: e.clientY,
			time: performance.now(),
			startTime: ctx.getCurrentTime(),
			startVolume: ctx.getVolume(),
			startBrightness: ctx.getBrightness(),
			brightnessZone: isBrightnessGestureZone(e.clientX, surfaceEl),
			volumeZone: isVolumeGestureZone(e.clientX, surfaceEl),
			seeking: false,
			adjustingBrightness: false,
			adjustingVolume: false
		};
	}

	function onSurfacePointerMove(e: PointerEvent) {
		if (!pointerStart || pointerStart.id !== e.pointerId) return;
		if (!e.isPrimary || e.pointerType === 'mouse') return;

		const dx = e.clientX - pointerStart.x;
		const dy = e.clientY - pointerStart.y;
		const absX = Math.abs(dx);
		const absY = Math.abs(dy);

		if (!pointerStart.seeking && !pointerStart.adjustingBrightness && !pointerStart.adjustingVolume) {
			const wantsBrightness =
				pointerStart.brightnessZone &&
				absY >= SURFACE_VOLUME_MIN_MOVE &&
				absY >= absX * SURFACE_VOLUME_AXIS_RATIO;
			const wantsVolume =
				pointerStart.volumeZone &&
				absY >= SURFACE_VOLUME_MIN_MOVE &&
				absY >= absX * SURFACE_VOLUME_AXIS_RATIO;
			const wantsSeek =
				absX >= SURFACE_SEEK_MIN_MOVE && absX >= absY * SURFACE_SEEK_AXIS_RATIO;

			if (!wantsBrightness && !wantsVolume && !wantsSeek) {
				if (absY >= SURFACE_VOLUME_MIN_MOVE && absY > absX * SURFACE_VOLUME_AXIS_RATIO) {
					pointerStart = null;
				}
				return;
			}

			if (wantsBrightness) {
				pointerStart.adjustingBrightness = true;
				showBrightnessGesture();
			} else if (wantsVolume) {
				pointerStart.adjustingVolume = true;
				showVolumeGesture();
			} else {
				pointerStart.seeking = true;
			}

			clearSurfaceTapTimer();
			clearSideTapTimer();
			clearCenterClickTimer();
			holdControls();
			(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		}

		e.preventDefault();
		const containerEl = ctx.getContainerEl() ?? (e.currentTarget as HTMLElement);
		const width = Math.max(containerEl.getBoundingClientRect().width, 1);
		if (pointerStart.adjustingBrightness) {
			const height = Math.max(containerEl.getBoundingClientRect().height, 1);
			const deltaBrightness = (-dy / height) * SURFACE_BRIGHTNESS_CHANGE_PER_SCREEN;
			ctx.setBrightness(pointerStart.startBrightness + deltaBrightness);
			showBrightnessGesture();
			return;
		}

		if (pointerStart.adjustingVolume) {
			const height = Math.max(containerEl.getBoundingClientRect().height, 1);
			const deltaVolume = (-dy / height) * SURFACE_VOLUME_CHANGE_PER_SCREEN;
			ctx.setVolume(pointerStart.startVolume + deltaVolume);
			showVolumeGesture();
			return;
		}

		const deltaSeconds = (dx / width) * SURFACE_SEEK_SECONDS_PER_SCREEN;
		ctx.seek(pointerStart.startTime + deltaSeconds);
	}

	function onSurfacePointerUp(e: PointerEvent) {
		if (!pointerStart || pointerStart.id !== e.pointerId) return;
		const start = pointerStart;
		pointerStart = null;

		if (!e.isPrimary) return;
		if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		}

		if (start.seeking || start.adjustingBrightness || start.adjustingVolume) {
			if (e.pointerType !== 'mouse') e.preventDefault();
			suppressNextSurfaceClick();
			if (start.adjustingBrightness) hideBrightnessGestureSoon();
			if (start.adjustingVolume) hideVolumeGestureSoon();
			releaseControlsHold();
			return;
		}

		const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
		const elapsed = performance.now() - start.time;
		if (moved > TAP_MAX_MOVE || elapsed > TAP_MAX_DURATION) return;

		const surfaceEl = ctx.getContainerEl() ?? (e.currentTarget as HTMLElement);
		if (e.pointerType !== 'mouse') {
			e.preventDefault();
			suppressNextSurfaceClick();
			scheduleSurfaceTap(e.clientX, surfaceEl);
			return;
		}

		handleSurfaceActivation(e.clientX, surfaceEl, e.pointerType);
	}

	function onSurfacePointerCancel(e: PointerEvent) {
		if (pointerStart?.id === e.pointerId) {
			const wasGesture =
				pointerStart.seeking || pointerStart.adjustingBrightness || pointerStart.adjustingVolume;
			const wasAdjustingBrightness = pointerStart.adjustingBrightness;
			const wasAdjustingVolume = pointerStart.adjustingVolume;
			pointerStart = null;
			if ((e.currentTarget as HTMLElement).hasPointerCapture?.(e.pointerId)) {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			}
			if (wasAdjustingBrightness) hideBrightnessGestureSoon();
			if (wasAdjustingVolume) hideVolumeGestureSoon();
			if (wasGesture) releaseControlsHold();
		}
	}

	function resetControlsTimer() {
		ctx.setControlsVisible(true);
		clearControlsTimer();
		if (controlsHeld) return;
		if (ctx.getIsPlaying()) controlsTimer = setTimeout(() => ctx.setControlsVisible(false), 3000);
	}

	function holdControls() {
		controlsHeld = true;
		ctx.setControlsVisible(true);
		clearControlsTimer();
	}

	function releaseControlsHold() {
		if (!controlsHeld) return;
		controlsHeld = false;
		resetControlsTimer();
	}

	function onSeekbarPointerDown(e: PointerEvent) {
		if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
		activeSeekPointerId = e.pointerId;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		holdControls();
	}

	function onSeekbarPointerRelease(e?: Event) {
		const pointerId = e && 'pointerId' in e ? (e as PointerEvent).pointerId : null;
		if (
			pointerId !== null &&
			activeSeekPointerId !== null &&
			pointerId !== activeSeekPointerId
		) {
			return;
		}

		const target = e?.currentTarget as HTMLElement | undefined;
		if (
			target &&
			activeSeekPointerId !== null &&
			target.hasPointerCapture?.(activeSeekPointerId)
		) {
			target.releasePointerCapture(activeSeekPointerId);
		}

		activeSeekPointerId = null;
		releaseControlsHold();
	}

	function onSeekbarInput() {
		resetControlsTimer();
	}

	function onMouseMove() {
		if (performance.now() < suppressMouseActivityUntil) return;
		resetControlsTimer();
	}

	function onMouseLeave() {
		if (!ctx.getIsPlaying()) return;
		clearControlsTimer();
		if (controlsHeld) return;
		controlsTimer = setTimeout(() => ctx.setControlsVisible(false), 1000);
	}

	function onFullscreenChange() {
		isFullscreen = document.fullscreenElement === ctx.getContainerEl();
		if (!isFullscreen) unlockScreenOrientation();
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
		clearControlsTimer();
		if (tapTimer) clearTimeout(tapTimer);
		clearSideTapTimer();
		clearSurfaceTapTimer();
		clearCenterClickTimer();
		clearSuppressClick();
		clearVolumeGestureTimer();
		clearBrightnessGestureTimer();
		volumeGestureVisible = false;
		brightnessGestureVisible = false;
		suppressMouseActivityUntil = 0;
		controlsHeld = false;
		activeSeekPointerId = null;
		pointerStart = null;
		unlockScreenOrientation();
	}

	return {
		skipBackward,
		skipForward,
		toggleFullscreen,
		handleTap,
		onVideoClick,
		onSurfaceClickCapture,
		onMouseMove,
		onMouseLeave,
		onFullscreenChange,
		onKeydown,
		onSurfacePointerDown,
		onSurfacePointerMove,
		onSurfacePointerUp,
		onSurfacePointerCancel,
		onSeekbarPointerDown,
		onSeekbarPointerRelease,
		onSeekbarInput,
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
		},
		get volumeGestureVisible() {
			return volumeGestureVisible;
		},
		get brightnessGestureVisible() {
			return brightnessGestureVisible;
		}
	};
}
