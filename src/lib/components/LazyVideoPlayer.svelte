<script lang="ts">
	import VideoPlayer from '$lib/components/video-player/v2/VideoPlayer.svelte';
	import appConfig from '$lib/config';
	import type { createVideoPlayerState } from '$lib/components/video-player/v2/stores/vpstate.svelte';
	import type {
		PlayerConfig,
		PlayerEpisodeList,
		SubtitleTrack
	} from '$lib/components/video-player/v2/stores/vpstate.svelte';

	type Props = {
		src: string[];
		sourceLabels?: string[];
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
		hasPremiumAccess?: boolean;
		playerApi?: ReturnType<typeof createVideoPlayerState>;
		onStateChange?: (state: {
			currentTime: number;
			duration: number;
			isPlaying: boolean;
		}) => void;
	};

	let {
		src,
		sourceLabels = [],
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
		episodeList,
		hasPremiumAccess = false,
		playerApi = $bindable(),
		onStateChange = () => null
	}: Props = $props();

	const resolvedConfig = $derived({
		...config,
		access: {
			...(config.access ?? {}),
			isLoggedIn,
			hasPremiumAccess: appConfig.ENABLE_PREMIUM_FEATURE ? hasPremiumAccess : true,
			maxGuestQuality: appConfig.ENABLE_PREMIUM_FEATURE
				? (config.access?.maxGuestQuality ?? 720)
				: Infinity,
			maxFreeQuality: appConfig.ENABLE_PREMIUM_FEATURE
				? (config.access?.maxFreeQuality ?? 720)
				: Infinity,
			loginHref: config.access?.loginHref ?? '/login',
			lockedQualityMessage:
				config.access?.lockedQualityMessage ?? 'Premium diperlukan untuk membuka kualitas 1080p',
			lockedQualityBadge: config.access?.lockedQualityBadge ?? 'Premium'
		}
	});
</script>

<VideoPlayer
	{src}
	{sourceLabels}
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
	bind:playerApi
	{onStateChange}
/>
