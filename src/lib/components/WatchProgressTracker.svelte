<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import config from '$lib/config';
	import { history, type WatchHistoryPayload } from '$lib/stores/history.svelte';

	type Props = {
		payload: Omit<WatchHistoryPayload, 'progressSec' | 'durationSec'>;
		enabled?: boolean;
	};

	const { payload, enabled = true }: Props = $props();
	let timer: ReturnType<typeof setInterval> | null = null;
	let viewRecorded = false;

	function findVideo() {
		return document.querySelector('video') as HTMLVideoElement | null;
	}

	async function saveProgress() {
		if (!enabled || !payload.episodeId) return;
		const video = findVideo();
		if (!video || !Number.isFinite(video.currentTime)) return;

		await history.upsertHistory({
			...payload,
			progressSec: video.currentTime,
			durationSec: Number.isFinite(video.duration) ? video.duration : 0
		});
	}

	async function recordView() {
		if (viewRecorded) return;
		viewRecorded = true;

		await Promise.all([
			payload.animeSlug
				? fetch(`${config.API_BASE_URL}/api/anime/${payload.animeSlug}/view`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: '{}'
					}).catch(() => null)
				: Promise.resolve(null),
			payload.episodeId
				? fetch(`${config.API_BASE_URL}/api/episodes/${payload.episodeId}/view`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: '{}'
					}).catch(() => null)
				: Promise.resolve(null)
		]);
	}

	onMount(() => {
		recordView();
		timer = setInterval(saveProgress, 10000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		saveProgress();
	});
</script>
