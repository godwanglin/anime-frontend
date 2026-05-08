<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<path d="M3 17 9 11l4 4 8-8" />
	<path d="M14 7h7v7" />
</IconBase>
