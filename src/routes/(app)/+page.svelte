<script lang="ts">
	import NavigationBottom from '$lib/components/NavigationBottom.svelte';
	import PersonalRecommendations from '$lib/components/PersonalRecommendations.svelte';
	import SEO from '$lib/components/SEO.svelte';

	import HeroSpotlight from '$lib/components/home-v2/HeroSpotlight.svelte';
	import QuickActions from '$lib/components/home-v2/QuickActions.svelte';
	import ContinueWatchingRail from '$lib/components/home-v2/ContinueWatchingRail.svelte';
	import TrendingShowcase from '$lib/components/home-v2/TrendingShowcase.svelte';
	import GenreMosaic from '$lib/components/home-v2/GenreMosaic.svelte';
	import EpisodeRail from '$lib/components/home-v2/EpisodeRail.svelte';
	import PopularEditorial from '$lib/components/home-v2/PopularEditorial.svelte';
	import NewReleaseSection from '$lib/components/home-v2/NewReleaseSection.svelte';
	import FinalCTA from '$lib/components/home-v2/FinalCTA.svelte';

	const { data } = $props();
	
</script>

<SEO />

<HeroSpotlight heroes={data.banners} />

<ContinueWatchingRail />

<QuickActions />

<TrendingShowcase items={data.trending.weekly} />

<EpisodeRail items={data.newEpisodes} />

<PopularEditorial items={data.popular} />

<NewReleaseSection items={data.newRelease} />

<GenreMosaic genres={data.genres} />

<PersonalRecommendations />

<FinalCTA />

<NavigationBottom />
