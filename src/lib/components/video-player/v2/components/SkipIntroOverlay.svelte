<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();
</script>

{#if vp.skipIntroVisible}
	<button type="button" class="vp-skip-intro-btn" onclick={vp.skipIntro}>
		<AppIcon name="skip_next" />
		Skip Intro
	</button>
{/if}
