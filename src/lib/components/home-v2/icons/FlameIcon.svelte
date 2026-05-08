<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<path d="M12 2c0 4.5 3 5 3 9a3 3 0 1 1-6 0c0-2 1-3 1-4-1.5 0-3 2-3 5a6 6 0 0 0 12 0c0-5-7-5-7-10z" />
</IconBase>
