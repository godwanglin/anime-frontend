<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PlayerEpisodeList, PlayerEpisodeItem } from '../stores/types';

	let {
		open,
		episodeList,
		onClose
	}: {
		open: boolean;
		episodeList?: PlayerEpisodeList;
		onClose: () => void;
	} = $props();

	const seasons = $derived(episodeList?.seasons ?? []);
	const fallbackEpisodes = $derived(episodeList?.episodes ?? []);
	const currentSlug = $derived(episodeList?.currentSlug);

	const initialSeason = $derived(
		seasons.find((s) => s.episodes.some((ep) => ep.slug === currentSlug))?.season ??
			seasons.find((s) => s.isCurrent)?.season ??
			seasons[0]?.season ??
			null
	);

	let activeSeason = $state<number | null>(null);
	let order = $state<'desc' | 'asc'>('desc');

	$effect(() => {
		if (open) {
			activeSeason = initialSeason;
		}
	});

	const activeSeasonData = $derived(
		seasons.find((s) => s.season === activeSeason) ?? seasons[0] ?? null
	);

	const visibleEpisodes = $derived<PlayerEpisodeItem[]>(
		activeSeasonData?.episodes?.length ? activeSeasonData.episodes : fallbackEpisodes
	);

	const sortedEpisodes = $derived(
		[...visibleEpisodes].sort((a, b) =>
			order === 'desc' ? b.number - a.number : a.number - b.number
		)
	);

	function handleClose(e: MouseEvent) {
		e.stopPropagation();
		onClose();
	}

	function shouldUseNativeLink(event: MouseEvent, href?: string) {
		if (!href || event.defaultPrevented) return true;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return true;
		}
		const target = (event.currentTarget as HTMLAnchorElement | null)?.target;
		return !!target && target !== '_self';
	}

	function handleEpisodeClick(event: MouseEvent, ep: PlayerEpisodeItem) {
		const href = ep.locked ? `/login?redirect=${encodeURIComponent(ep.href)}` : ep.href;
		if (shouldUseNativeLink(event, href)) return;
		event.preventDefault();
		onClose();
		void goto(href, { replaceState: true });
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.stopPropagation();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<button
		type="button"
		class="vp-ep-drawer-backdrop"
		onclick={handleClose}
		aria-label="Tutup daftar episode"
	></button>

	<aside class="vp-ep-drawer" aria-label="Daftar episode">
		<header class="vp-ep-drawer-head">
			<div class="vp-ep-drawer-title-wrap">
				<span class="vp-ep-drawer-eyebrow">Daftar Episode</span>
				{#if episodeList?.animeTitle}
					<span class="vp-ep-drawer-title">{episodeList.animeTitle}</span>
				{/if}
			</div>
			<button
				type="button"
				class="vp-ep-drawer-close"
				onclick={handleClose}
				aria-label="Tutup"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M18.3 5.71L12 12.01l-6.3-6.3-1.41 1.41 6.3 6.3-6.3 6.29 1.41 1.41 6.3-6.29 6.3 6.29 1.41-1.41-6.3-6.29 6.3-6.3z"
					/>
				</svg>
			</button>
		</header>

		{#if seasons.length > 1}
			<div class="vp-ep-drawer-seasons" role="tablist">
				{#each seasons as season (season.season)}
					{@const active = season.season === activeSeason}
					<button
						type="button"
						role="tab"
						aria-selected={active}
						class="vp-ep-drawer-season-tab"
						class:vp-ep-drawer-season-tab-active={active}
						onclick={() => (activeSeason = season.season)}
					>
						{season.label ?? `S${season.season}`}
					</button>
				{/each}
			</div>
		{/if}

		<div class="vp-ep-drawer-toolbar">
			<span class="vp-ep-drawer-count">
				{visibleEpisodes.length} episode
			</span>
			<button
				type="button"
				class="vp-ep-drawer-sort"
				onclick={() => (order = order === 'desc' ? 'asc' : 'desc')}
				aria-label="Urutkan episode"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					{#if order === 'desc'}
						<path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z" />
					{:else}
						<path d="M3 6h6v2H3V6zm0 5h12v2H3v-2zm0 7v-2h18v2H3z" />
					{/if}
				</svg>
				{order === 'desc' ? 'Terbaru' : 'Terlama'}
			</button>
		</div>

		<div class="vp-ep-drawer-list">
			{#each sortedEpisodes as ep (ep.slug)}
				{@const isActive = ep.slug === currentSlug}
				<a
					href={ep.locked ? `/login?redirect=${encodeURIComponent(ep.href)}` : ep.href}
					class="vp-ep-drawer-item"
					class:vp-ep-drawer-item-active={isActive}
					class:vp-ep-drawer-item-locked={ep.locked}
					aria-disabled={ep.locked}
					title={ep.locked ? 'Masuk untuk membuka episode terbaru' : undefined}
					onclick={(event) => handleEpisodeClick(event, ep)}
					data-sveltekit-preload-data="hover"
				>
					<span class="vp-ep-drawer-num" class:vp-ep-drawer-num-active={isActive}>
						{#if ep.locked}
							<svg class="vp-ep-drawer-lock" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M12 17a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V12h-2v1.28c-.6.34-1 .98-1 1.72a2 2 0 0 0 2 2Zm6-7h-1V7A5 5 0 0 0 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2ZM9 7a3 3 0 0 1 6 0v3H9V7Z"
								/>
							</svg>
						{:else}
							{ep.number}
						{/if}
					</span>
					<span class="vp-ep-drawer-meta">
						<span class="vp-ep-drawer-ep-title">
							Episode {ep.number}
							{#if ep.locked}
								<span class="vp-ep-drawer-login-badge">Masuk</span>
							{/if}
						</span>
						{#if ep.sub}
							<span class="vp-ep-drawer-ep-sub">{ep.sub}</span>
						{/if}
						{#if ep.progressPct !== undefined && ep.progressPct > 0}
							<span class="vp-ep-drawer-progress">
								<span
									class="vp-ep-drawer-progress-fill"
									style="width: {Math.min(100, ep.progressPct)}%"
								></span>
							</span>
						{/if}
					</span>
					{#if (ep.progressPct ?? 0) >= 90 && !isActive}
						<svg
							class="vp-ep-drawer-check"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
							/>
						</svg>
					{/if}
				</a>
			{/each}
		</div>
	</aside>
{/if}
