<script lang="ts">
	let { label, name, type = 'text', value = $bindable(''), required = false, error = '' } = $props<{
		label: string;
		name: string;
		type?: string;
		value?: string | number | null;
		required?: boolean;
		error?: string;
	}>();
</script>

<label class="block">
	<span class="mb-1.5 block text-xs font-bold text-zinc-500">{label}{required ? ' *' : ''}</span>
	<input
		{name}
		{type}
		bind:value
		class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
	/>
	{#if error}
		<span class="mt-1 block text-xs font-semibold text-red-400">{error}</span>
	{/if}
</label>
