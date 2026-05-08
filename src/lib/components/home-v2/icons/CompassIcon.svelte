<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<circle cx="12" cy="12" r="9" />
	<path d="M15.5 8.5l-1.6 5.4-5.4 1.6 1.6-5.4z" />
</IconBase>
