interface AudioWaveformContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getCurrentSrc: () => string;
	getDuration: () => number;
	getCurrentTime: () => number;
	getEnabled: () => boolean;
	getPreloadEnabled: () => boolean;
	getMaxPreloadBytes: () => number;
}

export function createAudioWaveformManager(ctx: AudioWaveformContext) {
	let bars = $state<number[]>([]);
	let available = $state(false);

	let audioCtx: AudioContext | null = null;
	let analyser: AnalyserNode | null = null;
	let source: MediaElementAudioSourceNode | null = null;
	let raf = 0;
	let failed = false;
	let preloading = false;
	let preloadedSrc = '';
	const samples = new Uint8Array(128);
	const BAR_COUNT = 120;

	function init() {
		if (!ctx.getEnabled() || failed || source) return;
		const video = ctx.getVideoEl();
		if (!video || typeof window === 'undefined') return;
		const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
		if (!AudioCtor) return;

		try {
			audioCtx = new AudioCtor();
			analyser = audioCtx.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.82;
			source = audioCtx.createMediaElementSource(video);
			source.connect(analyser);
			analyser.connect(audioCtx.destination);
			available = true;
		} catch {
			failed = true;
			available = false;
			cleanup();
		}
	}

	function start() {
		if (!ctx.getEnabled()) return;
		preloadFullWaveform();
		init();
		audioCtx?.resume().catch(() => {});
		if (!analyser || raf) return;
		raf = requestAnimationFrame(tick);
	}

	function stop() {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	}

	function reset() {
		bars = [];
		preloadedSrc = '';
	}

	function destroy() {
		stop();
		cleanup();
		bars = [];
	}

	function cleanup() {
		try {
			source?.disconnect();
			analyser?.disconnect();
			audioCtx?.close();
		} catch {
			// Audio graph cleanup may fail if the browser already released it.
		}
		audioCtx = null;
		analyser = null;
		source = null;
		available = false;
	}

	async function preloadFullWaveform() {
		const src = ctx.getCurrentSrc();
		if (!shouldPreload(src)) return;
		preloading = true;
		preloadedSrc = src;

		try {
			const byteLength = await getByteLength(src);
			if (!byteLength || byteLength > ctx.getMaxPreloadBytes()) return;

			const response = await fetch(src, { mode: 'cors' });
			if (!response.ok) return;
			const size = Number(response.headers.get('content-length') || 0);
			if (size && size > ctx.getMaxPreloadBytes()) return;

			const buffer = await decodeAudio(await response.arrayBuffer());
			bars = buildBars(buffer);
			available = true;
		} catch {
			// Fall back to live analyser when full-source decoding is blocked.
		} finally {
			preloading = false;
		}
	}

	function shouldPreload(src: string) {
		if (
			!ctx.getEnabled() ||
			!ctx.getPreloadEnabled() ||
			preloading ||
			!src ||
			src === preloadedSrc
		) {
			return false;
		}
		const normalized = src.toLowerCase().split('?')[0];
		return !normalized.endsWith('.m3u8') && !normalized.includes('/playlist/');
	}

	async function getByteLength(src: string) {
		try {
			const response = await fetch(src, { method: 'HEAD', mode: 'cors' });
			return Number(response.headers.get('content-length') || 0);
		} catch {
			return 0;
		}
	}

	async function decodeAudio(data: ArrayBuffer) {
		const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
		const decodeCtx = new AudioCtor();
		try {
			return await decodeCtx.decodeAudioData(data);
		} finally {
			decodeCtx.close().catch(() => {});
		}
	}

	function buildBars(buffer: AudioBuffer) {
		const channel = buffer.getChannelData(0);
		const result = Array(BAR_COUNT).fill(0);
		let peak = 0;

		for (let i = 0; i < BAR_COUNT; i++) {
			const start = Math.floor((i / BAR_COUNT) * channel.length);
			const end = Math.floor(((i + 1) / BAR_COUNT) * channel.length);
			const stride = Math.max(1, Math.floor((end - start) / 700));
			let sum = 0;
			let count = 0;

			for (let cursor = start; cursor < end; cursor += stride) {
				const sample = channel[cursor] ?? 0;
				sum += sample * sample;
				count++;
			}

			const value = Math.sqrt(sum / Math.max(1, count));
			result[i] = value;
			peak = Math.max(peak, value);
		}

		return result.map((value) => Math.min(1, value / Math.max(0.02, peak)));
	}

	function tick() {
		raf = 0;
		if (!analyser || !ctx.getEnabled()) return;
		analyser.getByteTimeDomainData(samples);
		const level = computeLevel();
		const index = getBarIndex();
		if (index >= 0) {
			const next = bars.length === BAR_COUNT ? [...bars] : Array(BAR_COUNT).fill(0);
			next[index] = Math.max(next[index] ?? 0, level);
			bars = next;
		}
		raf = requestAnimationFrame(tick);
	}

	function computeLevel() {
		let sum = 0;
		for (const sample of samples) {
			const centered = (sample - 128) / 128;
			sum += centered * centered;
		}
		return Math.min(1, Math.sqrt(sum / samples.length) * 3.8);
	}

	function getBarIndex() {
		const duration = ctx.getDuration();
		if (!isFinite(duration) || duration <= 0) return -1;
		return Math.max(
			0,
			Math.min(BAR_COUNT - 1, Math.floor((ctx.getCurrentTime() / duration) * BAR_COUNT))
		);
	}

	return {
		start,
		stop,
		reset,
		destroy,
		get bars() {
			return bars;
		},
		get available() {
			return (available || bars.length > 0) && bars.length > 0;
		}
	};
}
