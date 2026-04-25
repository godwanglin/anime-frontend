<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();
</script>

{#if vp.notifications.length > 0}
	<div class="vp-notification-stack" aria-live="polite">
		{#each vp.notifications as item (item.id)}
			<button class="vp-notification-toast" onclick={() => vp.removeNotification(item.id)}>
				{item.message}
			</button>
		{/each}
	</div>
{/if}
