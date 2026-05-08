<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<rect x="3" y="3" width="7" height="7" rx="1.5" />
	<rect x="14" y="3" width="7" height="7" rx="1.5" />
	<rect x="3" y="14" width="7" height="7" rx="1.5" />
	<rect x="14" y="14" width="7" height="7" rx="1.5" />
</IconBase>
