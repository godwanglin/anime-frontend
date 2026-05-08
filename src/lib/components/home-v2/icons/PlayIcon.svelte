<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" />
</IconBase>
