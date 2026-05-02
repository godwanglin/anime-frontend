<script lang="ts">
	import { goto } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';
	import AnimeCard from '$lib/components/AnimeCard.svelte';
	import DeferredCommentSection from '$lib/components/DeferredCommentSection.svelte';
	import LazyVideoPlayer from '$lib/components/LazyVideoPlayer.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import WatchProgressTracker from '$lib/components/WatchProgressTracker.svelte';
	import VideoReactionBar from '$lib/components/VideoReactionBar.svelte';
	import { formatRelativeID } from '$lib/format-date';
	import { formatProxySources } from '$lib/format-proxy-urls';
	import { extractEpisodeSubtitles, groupSubtitlesForPlayer } from '$lib/subtitle-studio';
	import { auth } from '$lib/stores/auth.svelte';
	import { history } from '$lib/stores/history.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { preference } from '$lib/stores/preference.svelte';
	import { saved } from '$lib/stores/saved.svelte';
	import type { PageData } from './$types';

	type Episode = {
		id?: number;
		slug?: string;
		number?: number;
		episode_number?: number;
		title?: string;
		sub?: string;
		date?: string;
		createdAt?: string;
		views?: number;
		skipIntroSeconds?: number | null;
		skipOutroSeconds?: number | null;
		animeSlug?: string;
		animeTitle?: string;
	};

	type Anime = {
		id?: number;
		slug?: string;
		title?: string;
		thumbnail?: string;
		bigCover?: string;
		status?: string;
		type?: string;
		skipIntroSeconds?: number | null;
		skipOutroSeconds?: number | null;
		episodes?: Episode[];
	};

	type Season = {
		season: number;
		title: string;
		slug: string;
		isCurrent: boolean;
		episodes: Episode[];
	};

	type RelatedVideo = {
		id: number;
		slug: string;
		title: string;
		thumbnail: string;
		bigCover?: string;
		status?: string;
		studio?: string;
		type?: string;
		totalEpisodes?: number;
		genres?: string[];
		latestEpisode?: {
			id: number;
			slug: string;
			number: number;
			title: string;
			sub?: string;
			date?: string;
		} | null;
		relevance?: {
			score: number;
			genreMatches: number;
		};
	};

	const { data }: { data: PageData } = $props();

	const anime = $derived(data.anime as Anime | null);
	const episode = $derived(data.episode as Episode | null);
	const detail = $derived(data.episodeDetail as Record<string, unknown> | null);
	const loginRequired = $derived(data.errorCode === 'LOGIN_REQUIRED' || data.error === 'LOGIN_REQUIRED');
	const currentWatchPath = $derived(`/anime/${data.params?.slug ?? ''}/${data.params?.epslug ?? ''}`);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent(currentWatchPath)}`);
	const title = $derived(episode?.title ?? anime?.title ?? 'Episode');
	const cover = $derived(anime?.bigCover || anime?.thumbnail || '');
	const streamSources = $derived(loginRequired ? [] : formatProxySources((detail as any)?.servers ?? []));
	const streamUrls = $derived(streamSources.map((source) => source.playerUrl));
	const episodeSubtitles = $derived(extractEpisodeSubtitles(detail));
	const subtitlesBySrc = $derived(groupSubtitlesForPlayer(streamSources, episodeSubtitles));
	// console.log(subtitlesBySrc);

	const defaultEpisodes = $derived(
		(((detail as any)?.episodes as Episode[] | undefined) ?? anime?.episodes ?? []) as Episode[]
	);
	const seasons = $derived(
		((((detail as any)?.seasons as Season[] | undefined) ?? []) as Season[]).filter(
			(season) => season.episodes?.length
		)
	);
	const currentSeasonNumber = $derived(
		seasons.find((season) => season.isCurrent)?.season ??
			seasons.find((season) =>
				season.episodes.some(
					(item) => item.slug === episode?.slug || item.slug === data.params?.epslug
				)
			)?.season ??
			null
	);
	let activeSeason = $state<number | null>(null);
	let activeEpisodeSlug = $state<string | undefined>(undefined);
	const activeSeasonData = $derived(
		seasons.find((season) => season.season === activeSeason) ??
			seasons.find((season) => season.isCurrent) ??
			seasons[0]
	);
	const episodes = $derived(
		activeSeasonData?.episodes?.length ? activeSeasonData.episodes : defaultEpisodes
	);
	const lockedEpisodeNumbers = $derived(
		new Set(
			[...episodes]
				.sort((a, b) => episodeNumber(b) - episodeNumber(a))
				.slice(0, 5)
				.map((ep) => episodeNumber(ep))
		)
	);
	const hasMultipleEpisodes = $derived(episodes.length > 1);
	const showEpisodeList = $derived(hasMultipleEpisodes || seasons.length > 1);
	const episodeListAnimeSlug = $derived(activeSeasonData?.slug ?? anime?.slug);
	const relatedVideos = $derived((detail?.relatedVideos as RelatedVideo[]) ?? []);
	const isSaved = $derived(saved.checkSaved(anime?.id));
	const trackerPayload = $derived({
		animeId: anime?.id ?? 0,
		animeSlug: anime?.slug ?? '',
		animeTitle: anime?.title ?? '',
		animeThumbnail: anime?.thumbnail ?? cover,
		episodeId: episode?.id ?? 0,
		episodeSlug: episode?.slug ?? data.params?.epslug ?? '',
		episodeNumber: episode?.number ?? 0,
		episodeTitle: episode?.title ?? title
	});
	const resolvedSkipIntroSeconds = $derived(
		episode?.skipIntroSeconds ?? (detail as any)?.anime?.skipIntroSeconds ?? anime?.skipIntroSeconds ?? null
	);
	const resolvedSkipOutroSeconds = $derived(
		episode?.skipOutroSeconds ?? (detail as any)?.anime?.skipOutroSeconds ?? anime?.skipOutroSeconds ?? null
	);

	const episodeRelativeDate = $derived(formatRelativeID(episode?.createdAt) || episode?.date || '');
	const navigation = $derived((detail as any)?.navigation ?? null);
	const currentEpisodeNum = $derived(episode?.number ?? episode?.episode_number ?? null);
	const previousEpisode = $derived.by(() => {
		if (navigation?.previous?.slug) return navigation.previous;
		if (currentEpisodeNum === null) return undefined;
		const candidates = defaultEpisodes
			.filter((ep) => {
				const n = ep.number ?? ep.episode_number;
				return typeof n === 'number' && n < currentEpisodeNum && !!ep.slug;
			})
			.sort((a, b) => (b.number ?? b.episode_number ?? 0) - (a.number ?? a.episode_number ?? 0));
		return candidates[0];
	});
	const nextEpisode = $derived.by(() => {
		if (navigation?.next?.slug) return navigation.next;
		if (currentEpisodeNum === null) return undefined;
		const candidates = defaultEpisodes
			.filter((ep) => {
				const n = ep.number ?? ep.episode_number;
				return typeof n === 'number' && n > currentEpisodeNum && !!ep.slug;
			})
			.sort((a, b) => (a.number ?? a.episode_number ?? 0) - (b.number ?? b.episode_number ?? 0));
		return candidates[0];
	});
	const nextEpisodeHref = $derived(
		nextEpisode?.slug && anime?.slug ? `/anime/${anime.slug}/${nextEpisode.slug}` : undefined
	);
	const previousEpisodeHref = $derived(
		previousEpisode?.slug && anime?.slug
			? `/anime/${anime.slug}/${previousEpisode.slug}`
			: undefined
	);

	const playerEpisodeList = $derived.by(() => {
		const currentEpSlug = episode?.slug ?? data.params?.epslug;
		const currentEpNum = episode?.number ?? episode?.episode_number;

		const mapEp = (ep: Episode, animeSlugForEp: string | undefined) => {
			const number = episodeNumber(ep);
			const href = animeSlugForEp && ep.slug ? `/anime/${animeSlugForEp}/${ep.slug}` : '#';
			return {
				slug: ep.slug ?? '',
				number,
				title: ep.title,
				sub: ep.sub,
				href,
				progressPct: history.byEpisode(ep.id)?.progressPct ?? 0,
				locked: isEpisodeLocked(ep)
			};
		};

		if (seasons.length > 0) {
			return {
				currentSlug: currentEpSlug,
				currentNumber: currentEpNum,
				animeTitle: anime?.title,
				seasons: seasons.map((s) => ({
					season: s.season,
					label: `Season ${s.season}`,
					isCurrent: s.isCurrent,
					episodes: s.episodes.map((ep) => mapEp(ep, s.slug))
				}))
			};
		}

		if (defaultEpisodes.length > 0) {
			return {
				currentSlug: currentEpSlug,
				currentNumber: currentEpNum,
				animeTitle: anime?.title,
				episodes: defaultEpisodes.map((ep) => mapEp(ep, anime?.slug))
			};
		}

		return undefined;
	});

	let showAllEpisodes = $state(false);
	let episodeSheetOpen = $state(false);
	let episodeOrder = $state<'desc' | 'asc'>('desc');
	let isDesktop = $state(false);
	let reportOpen = $state(false);
	let reportReason = $state('video_unavailable');
	let reportDescription = $state('');
	let reportContact = $state('');
	let reportSubmitting = $state(false);
	let reportMessage = $state('');
	let reportError = $state('');
	let loginPromptOpen = $state(false);
	let loginPromptDismissed = $state(false);

	const reportReasons = [
		{
			value: 'video_unavailable',
			label: 'Video tidak tersedia',
			description: 'Player kosong, server hilang, atau sumber mati'
		},
		{
			value: 'playback_error',
			label: 'Video error / tidak play',
			description: 'Video macet, gagal load, atau muncul error'
		},
		{
			value: 'wrong_episode',
			label: 'Episode salah',
			description: 'Konten video tidak sesuai episode ini'
		},
		{
			value: 'audio_problem',
			label: 'Audio bermasalah',
			description: 'Audio hilang, tidak sinkron, atau rusak'
		},
		{
			value: 'subtitle_problem',
			label: 'Subtitle bermasalah',
			description: 'Subtitle tidak muncul, delay, atau salah bahasa'
		},
		{
			value: 'slow_loading',
			label: 'Loading lambat',
			description: 'Buffering berat atau server sangat lambat'
		},
		{
			value: 'other',
			label: 'Lainnya',
			description: 'Masalah lain yang belum ada di daftar'
		}
	];

	onMount(() => {
		const mq = window.matchMedia('(min-width: 768px)');
		const update = () => (isDesktop = mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	$effect(() => {
		if (loginRequired && !auth.isLoggedIn && !loginPromptDismissed) {
			loginPromptOpen = true;
		}
	});
	const sortedEpisodes = $derived(
		[...episodes].sort((left, right) =>
			episodeOrder === 'desc'
				? episodeNumber(right) - episodeNumber(left)
				: episodeNumber(left) - episodeNumber(right)
		)
	);
	const visibleEpisodes = $derived(
		isDesktop && showAllEpisodes ? sortedEpisodes : sortedEpisodes.slice(0, 30)
	);

	$effect(() => {
		const routeEpisodeSlug = episode?.slug ?? data.params?.epslug;

		if (seasons.length === 0) {
			activeSeason = null;
			activeEpisodeSlug = routeEpisodeSlug;
			return;
		}

		if (routeEpisodeSlug !== activeEpisodeSlug) {
			activeEpisodeSlug = routeEpisodeSlug;
			activeSeason = currentSeasonNumber;
			showAllEpisodes = false;
			episodeSheetOpen = false;
			return;
		}

		if (!activeSeason || !seasons.some((season) => season.season === activeSeason)) {
			activeSeason = currentSeasonNumber;
		}
	});

	$effect(() => {
		preference.syncPlayerStorage();
	});

	function episodeProgress(id?: number) {
		return history.byEpisode(id)?.progressPct ?? 0;
	}

	function selectSeason(season: number) {
		activeSeason = season;
		showAllEpisodes = false;
		episodeSheetOpen = false;
	}

	function episodeNumber(ep: Episode) {
		return ep.number ?? ep.episode_number ?? 0;
	}

	function isEpisodeLocked(ep?: Episode) {
		if (auth.isLoggedIn || !ep) return false;
		return lockedEpisodeNumbers.has(episodeNumber(ep));
	}

	function toggleEpisodeOrder() {
		episodeOrder = episodeOrder === 'desc' ? 'asc' : 'desc';
		showAllEpisodes = false;
	}

	function toggleEpisodeOverflow() {
		if (!isDesktop) {
			episodeSheetOpen = true;
			return;
		}
		showAllEpisodes = !showAllEpisodes;
	}

	function episodeHref(ep: Episode) {
		const animeSlug = ep.animeSlug ?? episodeListAnimeSlug;
		return animeSlug && ep.slug ? `/anime/${animeSlug}/${ep.slug}` : '#';
	}

	function episodeLoginHref(ep: Episode) {
		return `/login?redirect=${encodeURIComponent(episodeHref(ep))}`;
	}

	function shouldUseNativeLink(event: MouseEvent, href?: string) {
		if (!href || href === '#' || event.defaultPrevented) return true;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return true;
		}
		const target = (event.currentTarget as HTMLAnchorElement | null)?.target;
		return !!target && target !== '_self';
	}

	function replaceEpisodeNavigation(event: MouseEvent, href?: string, afterNavigate?: () => void) {
		if (shouldUseNativeLink(event, href)) return;
		event.preventDefault();
		afterNavigate?.();
		void goto(href as string, { replaceState: true });
	}

	function handleEpisodeNavigation(event: MouseEvent, ep: Episode, afterNavigate?: () => void) {
		const href = isEpisodeLocked(ep) ? episodeLoginHref(ep) : episodeHref(ep);
		replaceEpisodeNavigation(event, href, afterNavigate);
	}

	function formatCount(value?: number) {
		const count = Number(value ?? 0);
		if (count >= 1_000_000) {
			const f = count / 1_000_000;
			return `${Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1)}M`;
		}
		if (count >= 1_000) {
			const f = count / 1_000;
			return `${Number.isInteger(f) ? f.toFixed(0) : f.toFixed(1)}K`;
		}
		return count.toLocaleString('id-ID');
	}

	async function toggleSaved() {
		if (!auth.isLoggedIn) {
			location.href = `/login?redirect=/anime/${anime?.slug}/${episode?.slug}`;
			return;
		}
		if (!anime?.id) return;
		if (isSaved) {
			await saved.unsaveAnime(anime.id);
			return;
		}
		await saved.saveAnime({
			animeId: anime.id,
			animeSlug: anime.slug ?? '',
			animeTitle: anime.title ?? '',
			animeThumbnail: anime.thumbnail ?? cover,
			animeStatus: anime.status ?? 'Ongoing'
		});
	}

	function openReport() {
		reportOpen = true;
		reportMessage = '';
		reportError = '';
	}

	function closeReport() {
		if (reportSubmitting) return;
		reportOpen = false;
		reportMessage = '';
		reportError = '';
	}

	async function submitEpisodeReport() {
		if (!episode?.id) return;
		reportSubmitting = true;
		reportMessage = '';
		reportError = '';

		try {
			const response = await auth.authFetch(`/api/episodes/${episode.id}/report`, {
				method: 'POST',
				body: JSON.stringify({
					reason: reportReason,
					description: reportDescription,
					contact: reportContact,
					pageUrl: location.href,
					serverLabel: streamSources[0]?.label ?? null,
					deviceId: notifications.deviceId
				})
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				throw new Error(payload?.message ?? 'Gagal mengirim laporan');
			}
			reportMessage = payload?.message ?? 'Laporan berhasil dikirim';
			reportDescription = '';
			reportContact = '';
			setTimeout(() => {
				reportOpen = false;
				reportMessage = '';
			}, 1300);
		} catch (error) {
			reportError = error instanceof Error ? error.message : 'Gagal mengirim laporan';
		} finally {
			reportSubmitting = false;
		}
	}
</script>

<SEO
	title={`${title} - ${anime?.title ?? 'Anime'}`}
	description={`Nonton ${title} sub indo di AniStream`}
	image={anime?.thumbnail ?? cover}
	type="video.episode"
/>

{#if loginPromptOpen}
	<div class="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm md:items-center">
		<button
			class="absolute inset-0"
			aria-label="Tutup login prompt"
			onclick={() => {
				loginPromptDismissed = true;
				loginPromptOpen = false;
			}}
		></button>
		<div
			class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 text-center shadow-2xl"
			style="box-shadow: 0 24px 80px rgba(139,92,246,.28);"
		>
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
				style="background: rgba(124,58,237,.22); border: 1px solid rgba(255,255,255,.12);"
			>
				<AppIcon name="lock" style="font-size:30px; color: white;" />
			</div>
			<p class="text-[18px] font-black text-white">Episode terbaru tersedia untuk member</p>
			<p class="mt-2 text-[12px] font-semibold leading-relaxed text-white/55">
				Masuk untuk lanjut menonton episode terbaru ini.
			</p>
			<div class="mt-5 grid grid-cols-2 gap-2">
				<button
					type="button"
					class="rounded-full border border-white/10 px-4 py-2.5 text-[12px] font-black text-white/70"
					onclick={() => {
						loginPromptDismissed = true;
						loginPromptOpen = false;
					}}
				>
					Nanti saja
				</button>
				<a
					href={loginHref}
					class="rounded-full px-4 py-2.5 text-[12px] font-black text-white"
					style="background: linear-gradient(135deg, #8b5cf6, #ec4899); box-shadow: 0 14px 34px rgba(139,92,246,.35);"
				>
					Masuk
				</a>
			</div>
		</div>
	</div>
{/if}

{#if reportOpen}
	<div class="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-4 py-5 backdrop-blur-sm md:items-center">
		<button class="absolute inset-0" aria-label="Tutup laporan" onclick={closeReport}></button>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				submitEpisodeReport();
			}}
			class="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
		>
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<p class="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">Report Episode</p>
					<h2 class="mt-1 text-lg font-black">Laporkan masalah video</h2>
					<p class="mt-1 text-xs text-zinc-500 line-clamp-2">{anime?.title} - {title}</p>
				</div>
				<button
					type="button"
					onclick={closeReport}
					class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
					aria-label="Tutup"
				>
					<AppIcon name="close" class="text-[20px]" />
				</button>
			</div>

			<div class="mb-3 block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-400">Masalah</span>
				<CustomSelect
					value={reportReason}
					options={reportReasons}
					align="left"
					minWidth={360}
					fullWidth
					onChange={(value) => (reportReason = value)}
				/>
			</div>

			<label class="mb-3 block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-400">Detail opsional</span>
				<textarea
					bind:value={reportDescription}
					rows="4"
					maxlength="800"
					placeholder="Contoh: video berhenti di menit 03:12, subtitle delay, server blank..."
					class="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-red-500"
				></textarea>
			</label>

			<label class="mb-4 block">
				<span class="mb-1.5 block text-xs font-bold text-zinc-400">Kontak opsional</span>
				<input
					bind:value={reportContact}
					maxlength="191"
					placeholder="Email atau username kalau perlu dihubungi"
					class="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-red-500"
				/>
			</label>

			{#if reportError}
				<p class="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{reportError}</p>
			{/if}
			{#if reportMessage}
				<p class="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300">{reportMessage}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={closeReport}
					class="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-black text-zinc-400 hover:bg-zinc-900"
				>
					Batal
				</button>
				<button
					type="submit"
					disabled={reportSubmitting}
					class="h-10 rounded-xl bg-red-600 px-4 text-xs font-black text-white shadow-lg shadow-red-950/30 hover:bg-red-500 disabled:opacity-60"
				>
					{reportSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
				</button>
			</div>
		</form>
	</div>
{/if}

<div class="-mx-4 -mt-4 max-w-[calc(100%+2rem)] overflow-x-clip md:mx-0 md:mt-0 md:max-w-none">
	<!-- ══════════════════════════════════════════
         VIDEO PLAYER — full bleed, always black
    ══════════════════════════════════════════ -->
	<div
		class="watch-player-fixed-spacer w-full aspect-video md:mx-8 md:w-[calc(100%-4rem)]"
		aria-hidden="true"
	></div>

	<div
		class="watch-player-shell watch-player-fixed w-full bg-black md:bg-transparent md:rounded-2xl md:shadow-2xl md:shadow-black/20"
	>
		{#if streamUrls.length}
			<div class="relative w-full aspect-video">
				<LazyVideoPlayer
					src={streamUrls}
					poster={cover}
					{title}
					autoPlay={preference.pref.autoPlay}
					{subtitlesBySrc}
					forceHls
					prevHref={previousEpisodeHref}
					nextHref={nextEpisodeHref}
					autoNext={preference.pref.autoNextEpisode}
					episodeList={playerEpisodeList}
					isLoggedIn={auth.isLoggedIn}
					config={{
						subtitle: {
							color: preference.pref.subtitleColor,
							fontSize: preference.pref.subtitleFontSize,
							fontFamily: preference.pref.subtitleFontFamily,
							fontWeight: 700,
							background: preference.pref.subtitleBg,
							borderRadius: '4px',
							padding: '2px 8px',
							bottomOffset: preference.pref.subtitlePosition,
							textShadow: preference.pref.subtitleShadow,
							opacity: preference.pref.subtitleOpacity,
							maxWidth: preference.pref.subtitleMaxWidth,
							defaultLanguage: preference.pref.subtitleLang,
							enabled: preference.pref.subtitleEnabled
						},
						theme: {
							primaryColor: '#ffffff',
							accentColor: '#7c3aed',
							controlTextColor: '#ffffff',
							controlBackground: 'rgba(255,255,255,.16)'
						},
						ambient: {
							enabled: isDesktop,
							intensity: isDesktop ? 1.5 : 0,
							opacity: isDesktop ? 0.42 : 0,
							blur: isDesktop ? 72 : 0,
							saturation: isDesktop ? 1.65 : 1,
							contrast: 1
						},
						controls: {
							enabled: true,
							position: 'bottom',
							showPlay: true,
							showSeek: true,
							showSkip: true,
							showVolume: true,
							showTime: true,
							showSettings: true,
							showFullscreen: true,
							showSourceBadge: true,
							showThumbnailPreview: true,
							showStats: false,
							preloadAudioWaveform: false,
							maxAudioWaveformBytes: 30 * 1024 * 1024,
							waveformEnable: false
						},
						playback: {
							speeds: [0.25, 0.5, 1, 1.5, 2],
							skipSeconds: 10,
							persistProgress: true
						},
						fullscreen: {
							showTopBar: true,
							showBackButton: true,
							showTitle: true
						},
						skipIntro: {
							enabled: preference.pref.skipIntroEnabled,
							seconds: resolvedSkipIntroSeconds,
							outroSeconds: resolvedSkipOutroSeconds,
							autoSkip: true,
							autoSkipOutro: !nextEpisodeHref,
							showButton: true
						},
						access: {
							loginHref,
							lockedQualityMessage: 'Masuk untuk membuka kualitas 1080p'
						}
					}}
				/>
				<WatchProgressTracker payload={trackerPayload} enabled={auth.isLoggedIn} />
			</div>
		{:else if loginRequired}
			<div
				class="w-full aspect-video flex items-center justify-center"
				style="background: radial-gradient(circle at 50% 35%, rgba(124,58,237,.28), transparent 42%), #09090b;"
			>
				<div class="text-center space-y-4 px-6 max-w-md">
					<div
						class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
						style="background: rgba(124,58,237,.22); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 18px 48px rgba(124,58,237,.2);"
					>
						<AppIcon name="lock" style="font-size:32px; color: white;" />
					</div>
					<div>
						<p class="text-[17px] font-black text-white">Masuk untuk lanjut menonton</p>
						<p class="mt-1 text-[12px] font-semibold text-white/55">
							Episode terbaru ini tersedia untuk akun yang sudah masuk.
						</p>
					</div>
					<div class="flex justify-center gap-2">
						<a
							href={loginHref}
							class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-black text-white"
							style="background: linear-gradient(135deg, #8b5cf6, #ec4899); box-shadow: 0 14px 34px rgba(139,92,246,.35);"
						>
							<AppIcon name="login" style="font-size:17px;" />
							Masuk sekarang
						</a>
						{#if anime?.slug}
							<a
								href="/anime/{anime.slug}"
								class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-black text-white/80"
								style="background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);"
							>
								<AppIcon name="list" style="font-size:17px;" />
								Lihat Episode
							</a>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!--
                Empty player state — sama dengan design taste: selalu ada visual,
                bukan blank. Warm zinc surface, icon besar, pesan yang jelas.
            -->
			<div
				class="w-full aspect-video flex items-center justify-center"
				style="background: #0a0a09;"
			>
				<div class="text-center space-y-3 px-6">
					<div
						class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-1"
						style="background: oklch(1 0 0 / 0.05); border: 1px solid oklch(1 0 0 / 0.08);"
					>
						<AppIcon name="video_off" style="font-size:32px; color: oklch(1 0 0 / 0.25);" />
					</div>
					<p class="text-[13px] font-bold" style="color: oklch(1 0 0 / 0.4);">
						Stream tidak tersedia
					</p>
					<p class="text-[11px]" style="color: oklch(1 0 0 / 0.22);">Coba lagi beberapa saat</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- ══════════════════════════════════════════
         FADE BRIDGE — player black → page-bg
         (sama teknik seperti cover → panel di anime detail)
    ══════════════════════════════════════════ -->
	<div
		class="md:hidden"
		style="
            height: 32px;
            background: linear-gradient(to bottom, #000000, var(--page-bg));
            margin-top: -1px;
        "
	></div>

	<!-- ══════════════════════════════════════════
         DESKTOP LAYOUT: info kiri + sidebar kanan
    ══════════════════════════════════════════ -->
	<div
		class="hidden md:grid gap-5 mt-5 {showEpisodeList
			? 'md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]'
			: 'md:grid-cols-1'}"
	>
		<!-- ── INFO KIRI ──────────────────────── -->
		<div
			class="min-w-0 rounded-2xl px-5 py-5"
			style="
                background: var(--surface);
                border: 1px solid var(--border);
                box-shadow: var(--shadow-sm);
            "
		>
			<!-- Title block -->
			<div class="flex items-start justify-between gap-6 mb-4">
				<div class="min-w-0 flex-1">
					<!-- <a
						href={anime?.slug ? `/anime/${anime.slug}` : '/'}
						class="text-[10px] font-black uppercase tracking-[0.18em] mb-2 inline-flex items-center gap-1 transition-colors"
						style="color: var(--accent);"
					>
						<AppIcon name="arrow_back_ios" style="font-size:11px;" />
						{anime?.title ?? ''}
					</a> -->
					<h1
						class="text-[22px] font-black leading-[1.2] tracking-tight mb-1"
						style="color: var(--text-primary);"
					>
						{anime?.title ?? title ?? ''}
					</h1>
					<div class="flex items-center gap-2 flex-wrap">
						{#if episode?.number && hasMultipleEpisodes}
							<span
								class="text-[11px] font-black px-2.5 py-1 rounded-full"
								style="
                                    background: var(--accent-surface);
                                    color: var(--accent-text);
                                    border: 1px solid oklch(from var(--accent) l c h / 0.2);
                                "
							>
								Episode {episode.number}
							</span>
						{/if}
						{#if episode?.sub}
							<span
								class="text-[11px] font-black px-2.5 py-1 rounded-full"
								style="
                                    background: color-mix(in oklch, #3b82f6 12%, var(--surface));
                                    color: color-mix(in oklch, #3b82f6 70%, var(--text-primary));
                                    border: 1px solid color-mix(in oklch, #3b82f6 25%, transparent);
                                "
							>
								{episode.sub}
							</span>
						{/if}
						{#if episodeRelativeDate}
							<span class="text-[11px]" style="color: var(--text-faint);">
								{episodeRelativeDate}
							</span>
						{/if}
						{#if data.error}
							<span class="text-[11px] text-amber-500">{data.error}</span>
						{/if}
					</div>
				</div>

				<!-- Prev / Next nav -->
				<div class="flex items-center gap-2 shrink-0 pt-1">
					{#if previousEpisode && anime?.slug}
						<a
							href={previousEpisodeHref}
							onclick={(event) => replaceEpisodeNavigation(event, previousEpisodeHref)}
							class="h-9 flex items-center gap-1.5 px-3.5 rounded-[var(--radius-xl)] text-[12px] font-bold transition-all active:scale-[0.97]"
							style="
                                background: var(--surface);
                                border: 1px solid var(--border-strong);
                                color: var(--text-muted);
                                box-shadow: var(--shadow-sm);
                            "
						>
							<AppIcon name="skip_previous" style="font-size:15px;" />
							Ep {previousEpisode.number}
						</a>
					{/if}
					{#if nextEpisode && anime?.slug}
						<a
							href={nextEpisodeHref}
							onclick={(event) => replaceEpisodeNavigation(event, nextEpisodeHref)}
							class="h-9 flex items-center gap-1.5 px-3.5 rounded-[var(--radius-xl)] text-[12px] font-bold text-white transition-all active:scale-[0.97]"
							style="
                                background: var(--accent);
                                box-shadow: 0 4px 14px var(--accent-glow);
                            "
						>
							Ep {nextEpisode.number}
							<AppIcon name="skip_next" style="font-size:15px;" />
						</a>
					{/if}
				</div>
			</div>

			<!-- Action bar — reaction + simpan + views -->
			<div
				class="flex items-center gap-2 flex-wrap py-3 px-4 rounded-[var(--radius-xl)] mb-5"
				style="
                    background: var(--surface-offset);
                    border: 1px solid var(--border-strong);
                    box-shadow: var(--shadow-sm);
                "
			>
				{#if episode?.id}
					<VideoReactionBar episodeId={episode.id} />
					<div class="h-4 w-px mx-1" style="background: var(--border-strong);"></div>
				{/if}

				<!-- Views -->
				<div class="flex items-center gap-1.5" style="color: var(--text-muted);">
					<AppIcon name="visibility" style="font-size:14px;" />
					<span class="text-[11px] font-semibold">
						{formatCount(episode?.views)} ditonton
					</span>
				</div>

				<div class="h-4 w-px mx-1" style="background: var(--border-strong);"></div>

				<!-- Simpan -->
				<button
					onclick={toggleSaved}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-[11px] font-black transition-all active:scale-[0.97]"
					style="
                        background: {isSaved ? 'var(--accent)' : 'var(--surface-offset)'};
                        border: 1px solid {isSaved ? 'transparent' : 'var(--border-strong)'};
                        color: {isSaved ? '#fff' : 'var(--text-muted)'};
                        box-shadow: {isSaved ? '0 2px 8px var(--accent-glow)' : 'none'};
                    "
				>
					<AppIcon name={isSaved ? 'bookmark' : 'bookmark_add'} style="font-size:14px;" />
					{isSaved ? 'Tersimpan' : 'Simpan'}
				</button>

				<div class="h-4 w-px mx-1" style="background: var(--border-strong);"></div>

				<button
					onclick={openReport}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] text-[11px] font-black transition-all active:scale-[0.97]"
					style="
                        background: color-mix(in oklch, #ef4444 10%, var(--surface-offset));
                        border: 1px solid color-mix(in oklch, #ef4444 24%, var(--border-strong));
                        color: color-mix(in oklch, #ef4444 78%, var(--text-primary));
                    "
				>
					<AppIcon name="report" style="font-size:14px;" />
					Report
				</button>

				{#if anime?.status}
					<div class="h-4 w-px mx-1" style="background: var(--border-strong);"></div>
					<span class="text-[11px] font-semibold" style="color: var(--text-faint);">
						{anime.status}
					</span>
				{/if}
			</div>

			<!-- Divider -->
			<div class="h-px mb-5" style="background: var(--border);"></div>

			<!-- Comments (desktop, height-matched to episode sidebar) -->
			{#if isDesktop && anime?.id && episode?.id}
				<div
					class="comments-desktop-pane mb-6 rounded-2xl"
					style="
                        max-height: calc(100dvh - 92px);
                        background: var(--surface);
                        border: 1px solid var(--border);
                        padding: 16px 18px;
                        box-shadow: var(--shadow-sm);
                    "
				>
					<DeferredCommentSection animeId={anime.id} episodeId={episode.id} bounded eager />
				</div>
			{/if}

			<!-- Related videos desktop -->
			{#if relatedVideos.length > 0}
				<div>
					<p
						class="text-[9px] font-black uppercase tracking-[0.2em] mb-4"
						style="color: var(--text-faint);"
					>
						Anime Terkait
					</p>
					<div class="grid grid-cols-3 xl:grid-cols-4 gap-3">
						{#each relatedVideos as related}
							<AnimeCard
								id={related.id}
								title={related.title}
								thumbnail={related.thumbnail}
								genres={related.genres}
								slug={related.slug}
								href={related.latestEpisode
									? `/anime/${related.slug}/${related.latestEpisode.slug}`
									: `/anime/${related.slug}`}
								status={related.status as any}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if showEpisodeList}
			<!-- ── SIDEBAR EPISODE KANAN ──────────── -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl"
				style="
                background: var(--surface);
                border: 1px solid var(--border);
                max-height: calc(100dvh - 92px);
                position: sticky;
                top: 80px;
                box-shadow: var(--shadow-sm);
            "
			>
				<!-- Sidebar header -->
				<div class="px-4 py-3.5 shrink-0" style="border-bottom: 1px solid var(--border);">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0 flex-1">
							<p
								class="text-[8px] font-black uppercase tracking-[0.2em] mb-0.5"
								style="color: var(--text-faint);"
							>
								Daftar Episode
							</p>
							<p class="text-[13px] font-black line-clamp-1" style="color: var(--text-primary);">
								{anime?.title}
							</p>
						</div>
						<span
							class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black"
							style="
                            background: var(--accent-surface);
                            color: var(--accent-text);
                            border: 1px solid oklch(from var(--accent) l c h / 0.2);
                        "
						>
							{episodes.length} Ep
						</span>
					</div>
				</div>

				{#if seasons.length > 1}
					<div class="px-4 py-3 shrink-0" style="border-bottom: 1px solid var(--border);">
						<div role="tablist" class="flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-hide">
							{#each seasons as season (season.season)}
								{@const isActiveSeason = season.season === activeSeasonData?.season}
								<button
									type="button"
									role="tab"
									aria-selected={isActiveSeason}
									onclick={() => selectSeason(season.season)}
									class="shrink-0 h-8 px-3 rounded-[var(--radius-lg)] text-[11px] transition-all active:scale-[0.97]"
									style="
                                    background: {isActiveSeason
										? 'var(--accent)'
										: 'var(--surface-offset)'};
                                    border: 1px solid {isActiveSeason
										? 'transparent'
										: 'var(--border-strong)'};
                                    color: {isActiveSeason ? '#fff' : 'var(--text-muted)'};
                                    font-weight: {isActiveSeason ? 900 : 700};
                                    box-shadow: {isActiveSeason
										? '0 3px 10px var(--accent-glow)'
										: 'none'};
                                "
								>
									Season {season.season}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div
					class="px-4 py-2.5 shrink-0 flex items-center justify-between gap-3"
					style="border-bottom: 1px solid var(--border);"
				>
					<span class="text-[10px] font-semibold" style="color: var(--text-faint);">
						{episodeOrder === 'desc' ? 'Episode terbesar dulu' : 'Episode terkecil dulu'}
					</span>
					<button
						type="button"
						onclick={toggleEpisodeOrder}
						class="h-8 shrink-0 flex items-center gap-1.5 px-3 rounded-[var(--radius-lg)] text-[10px] font-bold transition-all active:scale-[0.97]"
						style="
                        background: var(--surface-offset);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                    "
					>
						<AppIcon name={episodeOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'} style="font-size:13px;" />
						{episodeOrder === 'desc' ? 'Terbaru' : 'Terlama'}
					</button>
				</div>

				<!-- Episode list scroll -->
				<div class="flex-1 overflow-y-auto overscroll-contain">
					{#each sortedEpisodes as ep}
						{@const isActive = ep.slug === episode?.slug || ep.slug === data.params?.epslug}
						{@const progress = episodeProgress(ep.id)}
						{@const isLocked = isEpisodeLocked(ep)}
						<a
							href={isLocked ? episodeLoginHref(ep) : episodeHref(ep)}
							onclick={(event) => handleEpisodeNavigation(event, ep)}
							aria-disabled={isLocked}
							title={isLocked ? 'Masuk untuk membuka episode terbaru' : undefined}
							class="flex items-center gap-3 px-4 py-3 transition-all duration-150 {isLocked
								? 'cursor-not-allowed opacity-70'
								: ''}"
							style="
                            background: {isLocked
								? 'color-mix(in srgb, var(--surface) 70%, black)'
								: isActive
									? 'var(--accent-surface)'
									: 'transparent'};
                            border-left: 2px solid {isLocked
								? 'var(--text-muted)'
								: isActive
									? 'var(--accent)'
									: 'transparent'};
                        "
						>
							<!-- Ep number bubble -->
							<div
								class="shrink-0 w-9 h-9 rounded-[var(--radius-lg)] flex items-center justify-center text-[12px] font-black"
								style="
                                background: {isLocked
									? 'var(--border-strong)'
									: isActive
										? 'var(--accent)'
										: 'var(--surface-offset)'};
                                color: {isActive ? '#fff' : 'var(--text-muted)'};
                                box-shadow: {isActive ? '0 2px 8px var(--accent-glow)' : 'none'};
                            "
							>
								{#if isLocked}
									<AppIcon name="lock" style="font-size:16px;" />
								{:else}
									{episodeNumber(ep)}
								{/if}
							</div>

							<!-- Ep meta -->
							<div class="flex-1 min-w-0">
								<p
									class="text-[12px] font-bold leading-tight"
								style="color: {isActive ? 'var(--accent-text)' : 'var(--text-primary)'};"
							>
								Episode {episodeNumber(ep)}
								{#if isLocked}
									<span class="ml-1 text-[9px] font-black uppercase" style="color: var(--text-muted);">
										Masuk
									</span>
								{/if}
							</p>
								<p class="text-[10px] mt-0.5" style="color: var(--text-faint);">
									{ep.date}
								</p>
								{#if progress > 0}
									<div
										class="mt-1.5 h-[3px] rounded-full overflow-hidden"
										style="background: var(--border-strong);"
									>
										<div
											class="h-full rounded-full"
											style="width: {progress}%; background: var(--accent);"
										></div>
									</div>
								{/if}
							</div>

							<!-- Watched check -->
							{#if progress >= 90}
								<AppIcon name="check_circle" class="shrink-0"
									style="font-size:16px; color: var(--accent);" />
							{/if}

							<!-- Sub badge -->
							{#if ep.sub}
								<span
									class="shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded"
									style="
                                    background: {isActive
										? 'var(--accent-surface)'
										: 'color-mix(in oklch, #3b82f6 10%, var(--surface))'};
                                    color: {isActive
										? 'var(--accent-text)'
										: 'color-mix(in oklch, #3b82f6 70%, var(--text-primary))'};
                                    border: 1px solid color-mix(in oklch, #3b82f6 20%, transparent);
                                "
								>
									{ep.sub}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ══════════════════════════════════════════
         MOBILE LAYOUT
    ══════════════════════════════════════════ -->
	<div class="md:hidden" style="background: var(--page-bg);">
		<!-- ── INFO MOBILE ────────────────────── -->
		<div class="px-4 pt-2 pb-5" style="border-bottom: 1px solid var(--border);">
			<!-- Anime title link -->
			<a
				href={anime?.slug ? `/anime/${anime.slug}` : '/'}
				class="text-[9px] font-black uppercase tracking-[0.18em] mb-2 inline-flex items-center gap-1 transition-colors"
				style="color: var(--accent);"
			>
				<AppIcon name="arrow_back_ios" style="font-size:10px;" />
				{anime?.title ?? ''}
			</a>

			<!-- Episode title + meta -->
			<h1
				class="text-[17px] font-black leading-[1.25] tracking-tight mb-1.5"
				style="color: var(--text-primary);"
			>
				{title}
			</h1>

			<!-- Badges row -->
			<div class="flex items-center gap-1.5 flex-wrap mb-4">
				{#if episode?.number && hasMultipleEpisodes}
					<span
						class="text-[10px] font-black px-2 py-1 rounded-full"
						style="
                            background: var(--accent-surface);
                            color: var(--accent-text);
                            border: 1px solid oklch(from var(--accent) l c h / 0.2);
                        "
					>
						Ep {episode.number}
					</span>
				{/if}
				{#if episode?.sub}
					<span
						class="text-[10px] font-black px-2 py-1 rounded-full"
						style="
                            background: color-mix(in oklch, #3b82f6 10%, var(--surface));
                            color: color-mix(in oklch, #3b82f6 70%, var(--text-primary));
                            border: 1px solid color-mix(in oklch, #3b82f6 20%, transparent);
                        "
					>
						{episode.sub}
					</span>
				{/if}
				<div class="flex items-center gap-1" style="color: var(--text-faint);">
					<AppIcon name="visibility" style="font-size:12px;" />
					<span class="text-[10px] font-semibold">{formatCount(episode?.views)}</span>
				</div>
				{#if episodeRelativeDate}
					<span class="text-[10px]" style="color: var(--text-faint);">{episodeRelativeDate}</span>
				{/if}
				{#if anime?.status}
					<span class="text-[10px]" style="color: var(--text-faint);">{anime.status}</span>
				{/if}
			</div>

			<!-- Reaction + Simpan -->
			<div class="flex items-center gap-2 flex-wrap mb-4">
				{#if episode?.id}
					<VideoReactionBar episodeId={episode.id} compact />
				{/if}
				<button
					onclick={toggleSaved}
					class="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-xl)] text-[11px] font-black transition-all active:scale-[0.97]"
					style="
                        background: {isSaved ? 'var(--accent)' : 'var(--surface)'};
                        border: 1px solid {isSaved ? 'transparent' : 'var(--border-strong)'};
                        color: {isSaved ? '#fff' : 'var(--text-muted)'};
                        box-shadow: {isSaved
						? '0 4px 14px var(--accent-glow)'
						: 'var(--shadow-sm)'};
                    "
				>
					<AppIcon name={isSaved ? 'bookmark' : 'bookmark_add'} style="font-size:15px;" />
					{isSaved ? 'Tersimpan' : 'Simpan'}
				</button>
				<button
					onclick={openReport}
					class="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-xl)] text-[11px] font-black transition-all active:scale-[0.97]"
					style="
                        background: color-mix(in oklch, #ef4444 10%, var(--surface));
                        border: 1px solid color-mix(in oklch, #ef4444 24%, var(--border-strong));
                        color: color-mix(in oklch, #ef4444 78%, var(--text-primary));
                        box-shadow: var(--shadow-sm);
                    "
				>
					<AppIcon name="report" style="font-size:15px;" />
					Report
				</button>
			</div>

			<!-- Prev / Next mobile — full grid -->
			<div class="grid grid-cols-2 gap-2">
				{#if previousEpisode && anime?.slug}
					<a
						href={previousEpisodeHref}
						onclick={(event) => replaceEpisodeNavigation(event, previousEpisodeHref)}
						class="flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-xl)] text-[12px] font-bold transition-all active:scale-[0.97]"
						style="
                            background: var(--surface);
                            border: 1px solid var(--border-strong);
                            color: var(--text-primary);
                            box-shadow: var(--shadow-sm);
                        "
					>
						<AppIcon name="skip_previous" style="font-size:16px;" />
						Ep {previousEpisode.number}
					</a>
				{:else}
					<div></div>
				{/if}
				{#if nextEpisode && anime?.slug}
					<a
						href={nextEpisodeHref}
						onclick={(event) => replaceEpisodeNavigation(event, nextEpisodeHref)}
						class="flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-xl)] text-[12px] font-bold text-white transition-all active:scale-[0.97]"
						style="
                            background: var(--accent);
                            box-shadow: 0 4px 14px var(--accent-glow);
                        "
					>
						Ep {nextEpisode.number}
						<AppIcon name="skip_next" style="font-size:16px;" />
					</a>
				{/if}
			</div>
		</div>

		{#if showEpisodeList}
			<!-- ── EPISODE GRID MOBILE ────────────── -->
			<div class="px-4 pt-5 pb-4">
				{#if seasons.length > 1}
					<div class="flex max-w-full gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
						{#each seasons as season (season.season)}
							{@const isActiveSeason = season.season === activeSeasonData?.season}
							<button
								type="button"
								aria-pressed={isActiveSeason}
								onclick={() => selectSeason(season.season)}
								class="shrink-0 h-9 px-3.5 rounded-[var(--radius-xl)] text-[11px] transition-all active:scale-[0.97]"
								style="
                                background: {isActiveSeason ? 'var(--accent)' : 'var(--surface)'};
                                border: 1px solid {isActiveSeason
									? 'transparent'
									: 'var(--border-strong)'};
                                color: {isActiveSeason ? '#fff' : 'var(--text-muted)'};
                                font-weight: {isActiveSeason ? 900 : 700};
                                box-shadow: {isActiveSeason
									? '0 4px 12px var(--accent-glow)'
									: 'var(--shadow-sm)'};
                            "
							>
								Season {season.season}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Section header -->
				<div class="flex items-center justify-between gap-3 mb-3">
					<div class="flex items-center gap-2 min-w-0">
						<p
							class="text-[9px] font-black uppercase tracking-[0.2em]"
							style="color: var(--text-faint);"
						>
							Episode
						</p>
						<span
							class="px-2 py-0.5 rounded-full text-[9px] font-black"
							style="
                            background: var(--accent-surface);
                            color: var(--accent-text);
                            border: 1px solid oklch(from var(--accent) l c h / 0.2);
                        "
						>
							{episodes.length}
						</span>
					</div>
					<button
						type="button"
						onclick={toggleEpisodeOrder}
						class="h-8 shrink-0 flex items-center gap-1.5 px-3 rounded-[var(--radius-lg)] text-[10px] font-bold transition-all active:scale-[0.97]"
						style="
                        background: var(--surface);
                        border: 1px solid var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
					>
						<AppIcon name={episodeOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'} style="font-size:13px;" />
						{episodeOrder === 'desc' ? 'Terbaru' : 'Terlama'}
					</button>
				</div>

				<div class="grid grid-cols-6 gap-1.5">
					{#each visibleEpisodes as ep}
						{@const isActive = ep.slug === episode?.slug || ep.slug === data.params?.epslug}
						{@const progress = episodeProgress(ep.id)}
						{@const isLocked = isEpisodeLocked(ep)}
						<a
							href={isLocked ? episodeLoginHref(ep) : episodeHref(ep)}
							onclick={(event) => handleEpisodeNavigation(event, ep)}
							aria-disabled={isLocked}
							title={isLocked ? 'Masuk untuk membuka episode terbaru' : undefined}
							class="relative flex flex-col items-center justify-center gap-0.5 py-3 rounded-[var(--radius-lg)] border transition-all duration-150 active:scale-[0.94] {isLocked
								? 'cursor-not-allowed opacity-70'
								: ''}"
							style="
                            background: {isActive
								? 'var(--accent)'
								: isLocked
									? 'color-mix(in srgb, var(--surface) 72%, black)'
									: progress > 0
									? 'var(--accent-surface)'
									: 'var(--surface)'};
                            border-color: {isActive
								? 'transparent'
								: isLocked
									? 'var(--border-strong)'
									: progress > 0
									? 'oklch(from var(--accent) l c h / 0.25)'
									: 'var(--border)'};
                            box-shadow: {isActive
								? '0 4px 12px var(--accent-glow)'
								: 'var(--shadow-sm)'};
                        "
						>
							<!-- Sub label -->
							{#if ep.sub}
								<span
									class="absolute top-1 left-1.5 text-[6px] font-black uppercase leading-none"
									style="color: {isActive ? 'rgba(255,255,255,0.7)' : 'var(--accent)'};"
								>
									{ep.sub}
								</span>
							{/if}
							{#if isLocked}
								<div class="absolute inset-0 z-30 flex items-center justify-center rounded-[var(--radius-lg)] bg-black/35 backdrop-blur-[1px]">
									<AppIcon name="lock" class="text-white/90" style="font-size:16px;" />
								</div>
							{/if}

							<!-- Ep number -->
							<span
								class="text-[13px] font-black leading-none"
								style="color: {isActive
									? '#fff'
									: isLocked
										? 'var(--text-muted)'
										: progress > 0
										? 'var(--accent-text)'
										: 'var(--text-primary)'};"
							>
								{episodeNumber(ep)}
							</span>

							<!-- Check icon jika selesai -->
							{#if progress >= 90 && !isActive}
								<AppIcon name="check_circle" class="absolute top-0.5 right-0.5"
									style="font-size:12px; color: green;" />
							{/if}

							<!-- Progress bar -->
							{#if progress > 0 && progress < 90}
								<div
									class="absolute left-1.5 right-1.5 bottom-1.5 h-0.5 rounded-full overflow-hidden"
									style="background: var(--border-strong);"
								>
									<div
										class="h-full rounded-full"
										style="
                                        width: {progress}%;
                                        background: {isActive
											? 'rgba(255,255,255,0.6)'
											: 'var(--accent)'};
                                    "
									></div>
								</div>
							{/if}
						</a>
					{/each}
				</div>

				{#if episodes.length > 30}
					<button
						onclick={toggleEpisodeOverflow}
						class="mt-3 w-full py-3 rounded-[var(--radius-xl)] text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all active:scale-[0.99]"
						style="
                        background: var(--surface);
                        border-color: var(--border-strong);
                        color: var(--text-muted);
                        box-shadow: var(--shadow-sm);
                    "
					>
						<AppIcon name={isDesktop && showAllEpisodes ? 'expand_less' : 'expand_more'} style="font-size:16px;" />
						{isDesktop && showAllEpisodes ? 'Sembunyikan' : `Lihat semua ${episodes.length} episode`}
					</button>
				{/if}
			</div>

			{#if episodeSheetOpen}
				<div class="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
					<button
						type="button"
						class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-[2px]"
						aria-label="Tutup daftar episode"
						onclick={() => (episodeSheetOpen = false)}
					></button>
					<div
						class="absolute inset-x-0 bottom-0 max-h-[82dvh] rounded-t-[24px] overflow-hidden"
						style="background: var(--surface); border: 1px solid var(--border); box-shadow: 0 -18px 60px oklch(0 0 0 / 0.45);"
					>
						<div class="px-4 pt-3 pb-3" style="border-bottom: 1px solid var(--border);">
							<div
								class="mx-auto mb-3 h-1 w-10 rounded-full"
								style="background: var(--border-strong);"
							></div>
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p
										class="text-[9px] font-black uppercase tracking-[0.2em]"
										style="color: var(--text-faint);"
									>
										Semua Episode
									</p>
									<p
										class="text-[13px] font-black line-clamp-1"
										style="color: var(--text-primary);"
									>
										{anime?.title}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={toggleEpisodeOrder}
										class="h-8 shrink-0 flex items-center gap-1.5 px-3 rounded-[var(--radius-lg)] text-[10px] font-bold transition-all active:scale-[0.97]"
										style="background: var(--surface-offset); border: 1px solid var(--border-strong); color: var(--text-muted);"
									>
										<AppIcon name={episodeOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'} style="font-size:13px;" />
										{episodeOrder === 'desc' ? 'Terbaru' : 'Terlama'}
									</button>
									<button
										type="button"
										aria-label="Tutup"
										onclick={() => (episodeSheetOpen = false)}
										class="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-95"
										style="background: var(--surface-offset); border: 1px solid var(--border-strong); color: var(--text-muted);"
									>
										<AppIcon name="close" style="font-size:18px;" />
									</button>
								</div>
							</div>
						</div>

						{#if seasons.length > 1}
							<div class="px-4 pt-3">
								<div class="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
									{#each seasons as season (season.season)}
										{@const isActiveSeason = season.season === activeSeasonData?.season}
										<button
											type="button"
											aria-pressed={isActiveSeason}
											onclick={() => selectSeason(season.season)}
											class="shrink-0 h-8 px-3 rounded-[var(--radius-lg)] text-[11px] transition-all active:scale-[0.97]"
											style="
												background: {isActiveSeason ? 'var(--accent)' : 'var(--surface-offset)'};
												border: 1px solid {isActiveSeason ? 'transparent' : 'var(--border-strong)'};
												color: {isActiveSeason ? '#fff' : 'var(--text-muted)'};
												font-weight: {isActiveSeason ? 900 : 700};
											"
										>
											Season {season.season}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<div class="max-h-[62dvh] overflow-y-auto overscroll-contain p-4 pt-3">
							<div class="grid grid-cols-5 gap-1.5">
								{#each sortedEpisodes as ep}
									{@const isActive = ep.slug === episode?.slug || ep.slug === data.params?.epslug}
									{@const progress = episodeProgress(ep.id)}
									{@const isLocked = isEpisodeLocked(ep)}
									<a
										href={isLocked ? episodeLoginHref(ep) : episodeHref(ep)}
										onclick={(event) =>
											handleEpisodeNavigation(event, ep, () => (episodeSheetOpen = false))}
										aria-disabled={isLocked}
										title={isLocked ? 'Masuk untuk membuka episode terbaru' : undefined}
										class="relative flex min-h-12 items-center justify-center rounded-[var(--radius-lg)] border text-[13px] font-black transition-all active:scale-[0.95] {isLocked
											? 'cursor-not-allowed opacity-70'
											: ''}"
										style="
											background: {isActive
												? 'var(--accent)'
												: isLocked
													? 'color-mix(in srgb, var(--surface-offset) 72%, black)'
													: progress > 0
													? 'var(--accent-surface)'
													: 'var(--surface-offset)'};
											border-color: {isActive
												? 'transparent'
												: isLocked
													? 'var(--border-strong)'
													: progress > 0
													? 'oklch(from var(--accent) l c h / 0.25)'
													: 'var(--border-strong)'};
											color: {isActive
													? '#fff'
													: isLocked
														? 'var(--text-muted)'
														: progress > 0
													? 'var(--accent-text)'
													: 'var(--text-primary)'};
										"
									>
										{episodeNumber(ep)}
										{#if isLocked}
											<span class="absolute inset-0 z-30 flex items-center justify-center rounded-[var(--radius-lg)] bg-black/35 backdrop-blur-[1px]">
												<AppIcon name="lock" class="text-white/90" style="font-size:16px;" />
											</span>
										{/if}
										{#if progress >= 90 && !isActive}
											<AppIcon name="check_circle" class="absolute right-1 top-1"
												style="font-size:10px; color: var(--accent);" />
										{/if}
									</a>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Divider -->
			<div class="mx-4 h-px" style="background: var(--border);"></div>
		{/if}

		<!-- ── COMMENTS MOBILE ──────────── -->
		{#if !isDesktop && anime?.id && episode?.id}
			<DeferredCommentSection animeId={anime.id} episodeId={episode.id} />
		{/if}

		<!-- ── RELATED VIDEOS MOBILE ──────────── -->
		{#if relatedVideos.length > 0}
			<div class="px-4 pt-5 pb-8">
				<div class="flex items-center gap-2 mb-4">
					<p
						class="text-[9px] font-black uppercase tracking-[0.2em]"
						style="color: var(--text-faint);"
					>
						Anime Terkait
					</p>
					<span
						class="px-2 py-0.5 rounded-full text-[9px] font-black"
						style="
                            background: var(--accent-surface);
                            color: var(--accent-text);
                            border: 1px solid oklch(from var(--accent) l c h / 0.2);
                        "
					>
						{relatedVideos.length}
					</span>
				</div>
				<div class="grid grid-cols-3 gap-2.5">
					{#each relatedVideos as related}
						<AnimeCard
							id={related.id}
							title={related.title}
							thumbnail={related.thumbnail}
							genres={related.genres}
							slug={related.slug}
							href={related.latestEpisode
								? `/anime/${related.slug}/${related.latestEpisode.slug}`
								: `/anime/${related.slug}`}
							status={related.status as any}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.watch-player-fixed {
		position: fixed;
		top: 56px;
		left: 0;
		right: 0;
		z-index: 20;
	}

	@media (min-width: 768px) {
		.watch-player-fixed {
			top: 60px;
			left: calc(max((100vw - 80rem) / 2, 0px) + 220px + 2rem);
			right: calc(max((100vw - 80rem) / 2, 0px) + 2rem);
			width: auto;
		}
	}

	:global(.watch-player-shell .vp-ambient) {
		inset: -72px -28px;
		border-radius: 9999px;
		background:
			radial-gradient(48% 70% at 22% 50%, var(--vp-ambient-primary), transparent 72%),
			radial-gradient(48% 70% at 78% 50%, var(--vp-ambient-secondary), transparent 74%);
	}

	/*
	 * Desktop comments pane: a flex column so the bounded CommentSection
	 * inside (display:flex, height:100%) actually receives a measured
	 * height to scroll against. min-height:0 prevents the inner list
	 * from blowing past the viewport cap.
	 */
	.comments-desktop-pane {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
</style>
