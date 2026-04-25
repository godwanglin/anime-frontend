<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();
	let canvasEl = $state<HTMLCanvasElement>();

	$effect(() => {
		const canvas = canvasEl;
		const bars: number[] = vp.audioWaveformBars;
		if (!canvas || !bars.length) return;

		const rect = canvas.getBoundingClientRect();
		const ratio = window.devicePixelRatio || 1;
		canvas.width = Math.max(1, Math.floor(rect.width * ratio));
		canvas.height = Math.max(1, Math.floor(rect.height * ratio));

		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		ctx.clearRect(0, 0, rect.width, rect.height);
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
		ctx.lineWidth = 1.4;
		ctx.lineJoin = 'round';

		const step = rect.width / Math.max(1, bars.length - 1);
		const mid = rect.height - 1;
		ctx.beginPath();
		bars.forEach((value, index) => {
			const x = index * step;
			const y = Math.max(1, mid - value * (rect.height - 3));
			if (index === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
		ctx.lineTo(rect.width, mid);
		ctx.lineTo(0, mid);
		ctx.closePath();
		ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
		ctx.fill();
		ctx.stroke();
	});
</script>

{#if (vp.controlsCfg.waveformEnable ?? vp.controlsCfg.showAudioWaveform !== false) && vp.hovering && vp.audioWaveformAvailable}
	<canvas bind:this={canvasEl} class="vp-audio-waveform" aria-hidden="true"></canvas>
{/if}
