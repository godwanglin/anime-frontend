<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<circle cx="12" cy="12" r="9" />
	<path d="M12 7v5l3 2" />
</IconBase>
