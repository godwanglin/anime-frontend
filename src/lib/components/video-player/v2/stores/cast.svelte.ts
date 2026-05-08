type RemoteState = 'disconnected' | 'connecting' | 'connected';

type RemotePlayback = EventTarget & {
	state: RemoteState;
	watchAvailability: (cb: (available: boolean) => void) => Promise<number>;
	cancelWatchAvailability: (id?: number) => Promise<void>;
	prompt: () => Promise<void>;
};

type RemoteVideoEl = HTMLVideoElement & {
	remote?: RemotePlayback;
	disableRemotePlayback?: boolean;
	webkitShowPlaybackTargetPicker?: () => void;
};

function detectUnsupportedReason(): string | null {
	if (typeof window === 'undefined') return 'Lingkungan ini tidak punya akses ke window.';
	if (typeof navigator === 'undefined') return 'Lingkungan tidak mendukung pendeteksian browser.';
	if (!window.isSecureContext) {
		return 'Halaman tidak dimuat lewat HTTPS. Cast hanya aktif di koneksi aman (HTTPS) atau localhost.';
	}
	const ua = navigator.userAgent || '';
	if (/Firefox\//.test(ua)) {
		return 'Firefox belum mendukung Remote Playback API. Pakai Chrome, Edge, atau Safari.';
	}
	return null;
}

export function createCastManager(opts: { getVideoEl: () => HTMLVideoElement | undefined }) {
	let available = $state(false);
	let state = $state<RemoteState>('disconnected');
	let airplayAvailable = $state(false);
	let lastError = $state<string | null>(null);
	let apiSupported = $state(false);
	let scanning = $state(false);
	let unsupportedReason = $state<string | null>(null);

	let watchId: number | null = null;
	let attachedEl: RemoteVideoEl | null = null;
	let airplayHandler: ((e: Event) => void) | null = null;
	let scanTimer: ReturnType<typeof setTimeout> | null = null;

	const deviceAvailable = $derived(available || airplayAvailable);
	const isCasting = $derived(state === 'connected' || state === 'connecting');

	function onConnecting() {
		state = 'connecting';
	}
	function onConnect() {
		state = 'connected';
		lastError = null;
	}
	function onDisconnect() {
		state = 'disconnected';
	}

	function attach(el: RemoteVideoEl) {
		if (attachedEl === el) return;
		detach();
		attachedEl = el;

		// Allow remote playback (some pages opt out by default)
		try {
			el.disableRemotePlayback = false;
		} catch {
			/* noop */
		}
		// AirPlay opt-in for Safari
		try {
			el.setAttribute('x-webkit-airplay', 'allow');
		} catch {
			/* noop */
		}

		const remote = el.remote;
		const hasRemoteApi = !!remote;
		const hasAirplayEvent =
			typeof window !== 'undefined' && 'WebKitPlaybackTargetAvailabilityEvent' in window;
		apiSupported = hasRemoteApi || hasAirplayEvent;
		unsupportedReason = apiSupported ? null : detectUnsupportedReason();

		if (remote) {
			state = remote.state ?? 'disconnected';
			remote.addEventListener('connecting', onConnecting);
			remote.addEventListener('connect', onConnect);
			remote.addEventListener('disconnect', onDisconnect);
			remote
				.watchAvailability((avail) => {
					available = !!avail;
				})
				.then((id) => {
					watchId = id;
				})
				.catch(() => {
					available = false;
				});
		}

		// Safari AirPlay availability
		airplayHandler = (e: Event) => {
			const detail = (e as Event & { availability?: string }).availability;
			airplayAvailable = detail === 'available';
		};
		try {
			el.addEventListener(
				'webkitplaybacktargetavailabilitychanged',
				airplayHandler as EventListener
			);
		} catch {
			/* noop */
		}
	}

	function detach() {
		const el = attachedEl;
		attachedEl = null;
		if (!el) return;
		const remote = el.remote;
		if (remote) {
			remote.removeEventListener('connecting', onConnecting);
			remote.removeEventListener('connect', onConnect);
			remote.removeEventListener('disconnect', onDisconnect);
			if (watchId !== null) {
				remote.cancelWatchAvailability(watchId).catch(() => null);
				watchId = null;
			}
		}
		if (airplayHandler) {
			try {
				el.removeEventListener(
					'webkitplaybacktargetavailabilitychanged',
					airplayHandler as EventListener
				);
			} catch {
				/* noop */
			}
			airplayHandler = null;
		}
		available = false;
		airplayAvailable = false;
		state = 'disconnected';
		apiSupported = false;
		scanning = false;
		if (scanTimer) {
			clearTimeout(scanTimer);
			scanTimer = null;
		}
	}

	function startScan() {
		if (!apiSupported) return;
		scanning = true;
		if (scanTimer) clearTimeout(scanTimer);
		scanTimer = setTimeout(() => {
			scanning = false;
			scanTimer = null;
		}, 4000);
	}

	function setVideoEl(el: HTMLVideoElement | undefined) {
		if (!el) {
			detach();
			return;
		}
		attach(el as RemoteVideoEl);
	}

	async function prompt() {
		const el = opts.getVideoEl() as RemoteVideoEl | undefined;
		if (!el) return;
		lastError = null;
		// Safari path: show AirPlay picker
		if (airplayAvailable && typeof el.webkitShowPlaybackTargetPicker === 'function') {
			try {
				el.webkitShowPlaybackTargetPicker();
				return;
			} catch (err) {
				lastError = (err as Error)?.message ?? 'AirPlay error';
			}
		}
		// Standard Remote Playback path (Chrome/Edge -> Chromecast etc.)
		const remote = el.remote;
		if (remote) {
			try {
				await remote.prompt();
			} catch (err) {
				const msg = (err as Error)?.message ?? '';
				// User dismissed picker; not a real error
				if (!/aborted|cancel/i.test(msg)) lastError = msg || 'Cast error';
			}
		}
	}

	function destroy() {
		detach();
	}

	async function disconnect() {
		const el = opts.getVideoEl();
		if (!el) return;
		try {
			el.pause();
		} catch {
			/* noop */
		}
	}

	return {
		setVideoEl,
		prompt,
		startScan,
		disconnect,
		destroy,
		get supported() {
			return apiSupported;
		},
		get unsupportedReason() {
			return unsupportedReason;
		},
		get scanning() {
			return scanning;
		},
		get available() {
			return deviceAvailable;
		},
		get state() {
			return state;
		},
		get isCasting() {
			return isCasting;
		},
		get lastError() {
			return lastError;
		}
	};
}
