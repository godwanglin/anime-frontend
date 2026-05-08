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

export function createCastManager(opts: { getVideoEl: () => HTMLVideoElement | undefined }) {
	let available = $state(false);
	let state = $state<RemoteState>('disconnected');
	let airplayAvailable = $state(false);
	let lastError = $state<string | null>(null);

	let watchId: number | null = null;
	let attachedEl: RemoteVideoEl | null = null;
	let airplayHandler: ((e: Event) => void) | null = null;

	const supported = $derived(available || airplayAvailable);
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

	return {
		setVideoEl,
		prompt,
		destroy,
		get available() {
			return supported;
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
