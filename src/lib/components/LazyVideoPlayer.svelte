<script lang="ts">
	import VideoPlayer from '$lib/components/video-player/v2/VideoPlayer.svelte';
	import type {
		PlayerConfig,
		PlayerEpisodeList,
		SubtitleTrack
	} from '$lib/components/video-player/v2/stores/vpstate.svelte';

	type Props = {
		src: string[];
		poster: string;
		title: string;
		autoPlay?: boolean;
		subtitlesBySrc?: Record<string, SubtitleTrack[]>;
		forceHls?: boolean;
		config?: PlayerConfig;
		prevHref?: string;
		nextHref?: string;
		autoNext?: boolean;
		episodeList?: PlayerEpisodeList;
	};

	let {
		src,
		poster,
		title,
		autoPlay = false,
		subtitlesBySrc = {},
		forceHls = false,
		config = {},
		prevHref,
		nextHref,
		autoNext = true,
		episodeList
	}: Props = $props();

</script>

<VideoPlayer
	{src}
	{poster}
	{title}
	{autoPlay}
	{subtitlesBySrc}
	{forceHls}
	{config}
	{prevHref}
	{nextHref}
	{autoNext}
	{episodeList}
/>
