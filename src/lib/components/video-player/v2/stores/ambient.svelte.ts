import type { AmbientConfig } from './types';

interface AmbientContext {
	getVideoEl: () => HTMLVideoElement | undefined;
	getConfig: () => AmbientConfig | undefined;
}

export function createAmbientManager(ctx: AmbientContext) {
	let primary = $state('rgba(88, 28, 135, 0.62)');
	let secondary = $state('rgba(236, 72, 153, 0.34)');
	let interval: ReturnType<typeof setInterval> | null = null;
	let canvas: HTMLCanvasElement | null = null;
	let context: CanvasRenderingContext2D | null = null;
	let disabledBySecurity = false;

	function start() {
		if (interval) return;
		sample();
		interval = setInterval(sample, 900);
	}

	function destroy() {
		if (interval) clearInterval(interval);
		interval = null;
		canvas = null;
		context = null;
	}

	function sample() {
		if (ctx.getConfig()?.enabled === false) return;
		if (disabledBySecurity) return;
		const video = ctx.getVideoEl();
		if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

		try {
			if (!canvas) {
				canvas = document.createElement('canvas');
				canvas.width = 24;
				canvas.height = 14;
				context = canvas.getContext('2d', { willReadFrequently: true });
			}
			if (!context || !canvas) return;

			context.drawImage(video, 0, 0, canvas.width, canvas.height);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
			let r = 0;
			let g = 0;
			let b = 0;
			let count = 0;

			for (let i = 0; i < pixels.length; i += 16) {
				const pr = pixels[i];
				const pg = pixels[i + 1];
				const pb = pixels[i + 2];
				const brightness = (pr + pg + pb) / 3;
				if (brightness < 12) continue;
				r += pr;
				g += pg;
				b += pb;
				count++;
			}

			if (count === 0) return;
			const cfg = ctx.getConfig() ?? {};
			const color = boostColor(r / count, g / count, b / count, cfg);
			const intensity = cfg.intensity ?? 1.16;
			const primaryAlpha = Math.min(1, 0.72 * intensity);
			const secondaryAlpha = Math.min(1, 0.42 * intensity);

			primary = `rgba(${color.r}, ${color.g}, ${color.b}, ${primaryAlpha})`;
			secondary = `rgba(${Math.min(255, color.r + 28)}, ${Math.min(255, color.g + 18)}, ${Math.min(
				255,
				color.b + 34
			)}, ${secondaryAlpha})`;
		} catch {
			disabledBySecurity = true;
		}
	}

	function boostColor(r: number, g: number, b: number, cfg: AmbientConfig) {
		const max = Math.max(r, g, b);
		const boost = max > 0 ? ((cfg.contrast ?? 1.18) * 190) / max : 1;
		return {
			r: Math.round(Math.min(255, r * boost)),
			g: Math.round(Math.min(255, g * boost)),
			b: Math.round(Math.min(255, b * boost))
		};
	}

	return {
		start,
		destroy,
		sample,
		get enabled() {
			return ctx.getConfig()?.enabled !== false;
		},
		get opacity() {
			return ctx.getConfig()?.opacity ?? 0.96;
		},
		get blur() {
			return ctx.getConfig()?.blur ?? 36;
		},
		get saturation() {
			return ctx.getConfig()?.saturation ?? 1.75;
		},
		get primary() {
			return primary;
		},
		get secondary() {
			return secondary;
		}
	};
}
