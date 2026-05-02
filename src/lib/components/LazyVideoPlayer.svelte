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
		isLoggedIn?: boolean;
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
		isLoggedIn = false,
		prevHref,
		nextHref,
		autoNext = true,
		episodeList
	}: Props = $props();

	const resolvedConfig = $derived({
		...config,
		access: {
			...(config.access ?? {}),
			isLoggedIn,
			maxGuestQuality: config.access?.maxGuestQuality ?? 720,
			loginHref: config.access?.loginHref ?? '/login',
			lockedQualityMessage:
				config.access?.lockedQualityMessage ?? 'Masuk untuk membuka kualitas 1080p'
		}
	});
</script>

<VideoPlayer
	{src}
	{poster}
	{title}
	{autoPlay}
	{subtitlesBySrc}
	{forceHls}
	config={resolvedConfig}
	{prevHref}
	{nextHref}
	{autoNext}
	{episodeList}
/>
