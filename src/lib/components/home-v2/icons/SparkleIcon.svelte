<script lang="ts">
	import IconBase from './IconBase.svelte';
	let { size = 16, class: cls = '' }: { size?: number | string; class?: string } = $props();
</script>

<IconBase {size} class={cls}>
	<path d="M12 3v4" />
	<path d="M12 17v4" />
	<path d="M3 12h4" />
	<path d="M17 12h4" />
	<path d="M5.5 5.5 8 8" />
	<path d="M16 16l2.5 2.5" />
	<path d="M5.5 18.5 8 16" />
	<path d="M16 8l2.5-2.5" />
</IconBase>
