<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<path d="M16 3h5v5" />
	<path d="M4 20 21 3" />
	<path d="M21 16v5h-5" />
	<path d="m15 15 6 6" />
	<path d="M4 4l5 5" />
</IconBase>
