<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();
</script>

{#if vp.skipIntroVisible}
	<button type="button" class="vp-skip-intro-btn" onclick={vp.skipIntro}>
		<span class="material-symbols-rounded">skip_next</span>
		Skip Intro
	</button>
{/if}
