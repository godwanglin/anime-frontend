<script lang="ts">
	let {
		label,
		value,
		sub = '',
		icon = 'analytics'
	} = $props<{
		label: string;
		value: string | number;
		sub?: string;
		icon?: string;
	}>();
</script>

<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="mb-4 flex items-center justify-between gap-3">
		<p class="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
		<span class="material-symbols-rounded rounded-lg bg-violet-500/15 p-2 text-violet-400"
			>{icon}</span
		>
	</div>
	<p class="text-2xl font-black text-zinc-100">{value}</p>
	{#if sub}
		<p class="mt-1 text-xs font-semibold text-zinc-500">{sub}</p>
	{/if}
</div>
