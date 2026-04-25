<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();

	const cfg = $derived(vp.statsCfg);
	const stats = $derived(vp.stats);

	function mbps(value: number | null) {
		return value ? `${(value / 1_000_000).toFixed(2)} Mbps` : '-';
	}
</script>

{#if vp.statsVisible}
	<div class="vp-stats-overlay vp-stats-{cfg.position ?? 'top-right'}" aria-label="Playback stats">
		{#if cfg.showResolution !== false}
			<div><span>Resolution</span><b>{stats.resolution || '-'}</b></div>
		{/if}
		{#if cfg.showBitrate !== false}
			<div><span>Bitrate</span><b>{mbps(stats.bitrate)}</b></div>
		{/if}
		{#if cfg.showNetwork !== false}
			<div><span>Download</span><b>{mbps(stats.downloadSpeed)}</b></div>
		{/if}
		{#if cfg.showRefreshRate !== false}
			<div><span>FPS</span><b>{stats.refreshRate ? stats.refreshRate.toFixed(1) : '-'}</b></div>
		{/if}
		{#if cfg.showCodec !== false}
			<div><span>Video</span><b>{stats.videoCodec || '-'}</b></div>
			<div><span>Audio</span><b>{stats.audioCodec || '-'}</b></div>
		{/if}
		{#if cfg.showDroppedFrames !== false}
			<div><span>Dropped</span><b>{stats.droppedFrames ?? '-'}</b></div>
		{/if}
	</div>
{/if}
