<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<circle cx="12" cy="12" r="9" />
	<path d="M12 11v5" />
	<circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
</IconBase>
