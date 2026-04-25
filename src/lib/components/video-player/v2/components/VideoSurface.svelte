<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let {
		vp,
		poster,
		title,
		videoEl = $bindable(),
		onplay = () => null,
		onpause = () => null,
		ontimeupdate = () => null,
		onloadedmetadata = () => null
	}: {
		vp: VideoPlayerState;
		poster: string;
		title: string;
		videoEl?: HTMLVideoElement;
		onplay?: () => void;
		onpause?: () => void;
		ontimeupdate?: () => void;
		onloadedmetadata?: () => void;
	} = $props();
</script>

<video
	bind:this={videoEl}
	class="vp-video"
	{poster}
	playsinline
	onplay={onplay}
	onpause={onpause}
	ontimeupdate={ontimeupdate}
	onloadedmetadata={onloadedmetadata}
	onwaiting={vp.onWaiting}
	oncanplay={vp.onCanPlay}
	onplaying={vp.onPlaying}
	onvolumechange={vp.onVolumeChange}
	onprogress={vp.onProgress}
	onclick={vp.onVideoClick}
	aria-label={title}
>
	{#each vp.allSubtitles as track, i (`${track.lang}:${track.label}:${track.src}:${i}`)}
		{#if track.src}
			<track
				kind="subtitles"
				label={track.label}
				srclang={track.lang}
				src={track.src}
				default={i === 0}
			/>
		{/if}
	{/each}
</video>
