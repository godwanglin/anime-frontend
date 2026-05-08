<script lang="ts">
	import IconBase from './IconBase.svelte';
	let {
		size = 16,
		class: cls = '',
		filled = false
	}: { size?: number | string; class?: string; filled?: boolean } = $props();
</script>

<IconBase {size} class={cls}>
	<path
		d="M12 3.6 14.5 9l5.9.5-4.5 3.9 1.4 5.8L12 16.4 6.7 19.2l1.4-5.8L3.6 9.5 9.5 9z"
		fill={filled ? 'currentColor' : 'none'}
	/>
</IconBase>
