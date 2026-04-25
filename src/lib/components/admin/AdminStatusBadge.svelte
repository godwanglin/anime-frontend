<script lang="ts">
	let { status = '' } = $props<{ status?: string }>();
	const normalized = $derived(status.toLowerCase());
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black capitalize
	{normalized === 'admin'
		? 'bg-violet-500/15 text-violet-300'
		: normalized === 'ongoing'
			? 'bg-emerald-500/15 text-emerald-300'
			: 'bg-zinc-700/70 text-zinc-300'}"
>
	{status || 'unknown'}
</span>
