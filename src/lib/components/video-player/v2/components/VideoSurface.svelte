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
		onloadedmetadata = () => null,
		onended = () => null
	}: {
		vp: VideoPlayerState;
		poster: string;
		title: string;
		videoEl?: HTMLVideoElement;
		onplay?: () => void;
		onpause?: () => void;
		ontimeupdate?: () => void;
		onloadedmetadata?: () => void;
		onended?: () => void;
	} = $props();

	let autoFit = $state<'contain' | 'cover'>('contain');

	function updateAutoFit() {
		if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) return;
		const containerRatio = videoEl.clientWidth / videoEl.clientHeight;
		const videoRatio = videoEl.videoWidth / videoEl.videoHeight;
		autoFit = Math.abs(containerRatio - videoRatio) < 0.03 ? 'cover' : 'contain';
	}
</script>

<video
	bind:this={videoEl}
	class="vp-video vp-video-fit-{vp.videoFit === 'auto' ? autoFit : vp.videoFit}"
	{poster}
	playsinline
	onplay={onplay}
	onpause={onpause}
	ontimeupdate={ontimeupdate}
	onloadedmetadata={onloadedmetadata}
	onloadeddata={updateAutoFit}
	onended={onended}
	onwaiting={vp.onWaiting}
	oncanplay={vp.onCanPlay}
	onplaying={vp.onPlaying}
	onvolumechange={vp.onVolumeChange}
	onprogress={vp.onProgress}
	aria-label={title}
>
	{#each vp.allSubtitles as track, i (`${track.lang}:${track.label}:${track.src}:${i}`)}
		{#if track.src}
			<track
				kind="subtitles"
				label={track.label}
				srclang={track.lang}
				src={track.src}
			/>
		{/if}
	{/each}
</video>
