<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	type Props = {
		animeId: number;
		episodeId?: number;
		bounded?: boolean;
		eager?: boolean;
	};

	let { animeId, episodeId, bounded = false, eager = false }: Props = $props();
	let host: HTMLDivElement | undefined = $state();
	let CommentSection: any = $state(null);
	let observer: IntersectionObserver | undefined;
	let loading = false;

	async function load() {
		if (CommentSection || loading) return;
		loading = true;
		CommentSection = (await import('./comments/CommentSection.svelte')).default;
	}

	onMount(() => {
		if (eager) {
			load();
			return;
		}

		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					load();
					observer?.disconnect();
				}
			},
			{ rootMargin: '700px 0px' }
		);

		if (host) observer.observe(host);
		return () => observer?.disconnect();
	});

	onDestroy(() => observer?.disconnect());
</script>

<div bind:this={host} class:deferred-comment-bounded={bounded}>
	{#if CommentSection}
		<CommentSection {animeId} {episodeId} {bounded} />
	{:else}
		<div class="deferred-comment-skeleton {bounded ? 'is-bounded' : ''}" aria-hidden="true">
			<div class="h-4 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
			<div class="mt-5 flex gap-3">
				<div class="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
				<div class="flex-1 space-y-2">
					<div class="h-3 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
					<div class="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
					<div class="h-3 w-2/3 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.deferred-comment-bounded {
		height: 100%;
		min-height: 0;
	}

	.deferred-comment-skeleton {
		padding: 0 16px 24px;
		animation: deferred-comment-pulse 1.2s ease-in-out infinite;
	}

	.deferred-comment-skeleton.is-bounded {
		padding: 0;
	}

	@keyframes deferred-comment-pulse {
		50% {
			opacity: 0.55;
		}
	}
</style>
