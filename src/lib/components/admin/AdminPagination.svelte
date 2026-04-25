<script lang="ts">
	let { total = 0, page = 1, limit = 20, onChange = (_page: number) => {} } = $props<{
		total?: number;
		page?: number;
		limit?: number;
		onChange?: (page: number) => void;
	}>();
	const totalPages = $derived(Math.max(1, Math.ceil(total / limit)));
</script>

<div class="flex items-center justify-between gap-3 text-sm text-zinc-400">
	<p>{total.toLocaleString('id-ID')} data</p>
	<div class="flex items-center gap-2">
		<button disabled={page <= 1} onclick={() => onChange(page - 1)} class="rounded-lg border border-zinc-700 px-3 py-1.5 disabled:opacity-40">Prev</button>
		<span class="font-bold text-zinc-300">{page} / {totalPages}</span>
		<button disabled={page >= totalPages} onclick={() => onChange(page + 1)} class="rounded-lg border border-zinc-700 px-3 py-1.5 disabled:opacity-40">Next</button>
	</div>
</div>
