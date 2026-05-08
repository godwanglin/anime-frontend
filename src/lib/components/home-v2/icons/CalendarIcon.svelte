<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<rect x="3" y="5" width="18" height="16" rx="2" />
	<path d="M3 10h18" />
	<path d="M8 3v4" />
	<path d="M16 3v4" />
</IconBase>
