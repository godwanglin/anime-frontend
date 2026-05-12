<script lang="ts">
	import ShortPlayer from '$lib/components/shorts/ShortPlayer.svelte';
	import { formatProxySources, type FormattedStreamSource } from '$lib/format-proxy-urls';

	type Episode = {
		id: number;
		slug: string;
		number: number;
		title?: string | null;
		thumbnail?: string | null;
		videoThumbnail?: string | null;
		servers?: StreamServer[];
	};

	type Anime = {
		id: number;
		slug: string;
		title: string;
		type?: string | null;
		description?: string | null;
		synopsis?: string | null;
		thumbnail?: string | null;
		cover?: string | null;
		bigCover?: string | null;
		status?: string | null;
		episodes?: Episode[];
	};

	type StreamServer = {
		id: number;
		label: string;
		value: string;
		isPrimary?: boolean;
	};

	type Season = {
		episodes?: Episode[];
	};

	let { data } = $props();

	const anime = $derived((data.anime ?? {}) as Anime);
	const episode = $derived((data.episode ?? {}) as Episode);
	const detail = $derived((data.episodeDetail ?? {}) as Record<string, unknown>);
	const servers = $derived(
		(((detail as any)?.servers ?? episode.servers ?? []) as StreamServer[]).filter(
			(server) => server.value
		)
	);
	const sources = $derived(formatProxySources(servers) as FormattedStreamSource[]);
	const episodes = $derived.by(() => {
		const directEpisodes = (((detail as any)?.episodes as Episode[] | undefined) ??
			[]) as Episode[];
		const seasonEpisodes = (
			(((detail as any)?.seasons as Season[] | undefined) ?? []) as Season[]
		).flatMap((season) => season.episodes ?? []);
		const animeEpisodes = (anime.episodes ?? []) as Episode[];
		const candidates = directEpisodes.length
			? directEpisodes
			: seasonEpisodes.length
				? seasonEpisodes
				: animeEpisodes;
		if (candidates.some((item) => item.slug === episode.slug)) return candidates;
		return episode.slug ? [episode, ...candidates] : candidates;
	});
	const isShort = $derived(String(anime.type ?? '').toLowerCase() === 'short');
	const currentSlug = $derived(String(data?.params?.epslug ?? episode.slug ?? ''));
</script>

{#if data.error}
	<div class="short-empty">
		<h1>Short tidak bisa dibuka</h1>
		<p>{data.error}</p>
		<a href="/">Kembali</a>
	</div>
{:else if !isShort}
	<div class="short-empty">
		<h1>Konten ini bukan Short</h1>
		<p>Gunakan halaman watch biasa untuk anime atau donghua normal.</p>
		<a href="/anime/{anime.slug}/{episode.slug}">Buka watch page</a>
	</div>
{:else if !sources.length}
	<div class="short-empty">
		<h1>Video belum tersedia</h1>
		<p>Server untuk episode ini belum bisa diputar.</p>
		<a href="/anime/{anime.slug}">Kembali ke detail</a>
	</div>
{:else}
	<ShortPlayer {anime} {episode} {sources} {episodes} {currentSlug} />
{/if}

<style>
	.short-empty {
		display: grid;
		min-height: 100dvh;
		place-content: center;
		gap: 12px;
		padding: 24px;
		text-align: center;
		color: white;
		background: #050506;
	}

	.short-empty h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 950;
		letter-spacing: 0;
	}

	.short-empty p {
		max-width: 420px;
		margin: 0;
		color: rgb(255 255 255 / 0.62);
		font-size: 14px;
		font-weight: 650;
	}

	.short-empty a {
		justify-self: center;
		margin-top: 8px;
		padding: 10px 16px;
		border-radius: 999px;
		background: #7c3aed;
		color: white;
		font-size: 13px;
		font-weight: 900;
	}
</style>
