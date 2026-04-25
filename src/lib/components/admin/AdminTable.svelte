<script lang="ts">
	type Column = {
		key: string;
		label: string;
	};

	let {
		columns = [],
		data = [],
		selectable = false,
		isLoading = false,
		selected = $bindable<number[]>([]),
		rowKey = 'id',
		children
	} = $props<{
		columns?: Column[];
		data?: Record<string, any>[];
		selectable?: boolean;
		isLoading?: boolean;
		selected?: number[];
		rowKey?: string;
		children?: import('svelte').Snippet<[Record<string, any>]>;
	}>();

	const allIds = $derived(data.map((item: Record<string, any>) => Number(item[rowKey])));
	const allSelected = $derived(allIds.length > 0 && allIds.every((id: number) => selected.includes(id)));

	function toggleAll() {
		selected = allSelected ? [] : allIds;
	}

	function toggleOne(id: number) {
		selected = selected.includes(id) ? selected.filter((item: number) => item !== id) : [...selected, id];
	}
</script>

<div class="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
	<table class="min-w-full divide-y divide-zinc-800 text-sm">
		<thead class="bg-zinc-800/50 text-left text-xs font-black uppercase tracking-widest text-zinc-500">
			<tr>
				{#if selectable}
					<th class="w-10 px-4 py-3">
						<input type="checkbox" checked={allSelected} onchange={toggleAll} class="accent-violet-600" />
					</th>
				{/if}
				{#each columns as column}
					<th class="px-4 py-3">{column.label}</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-zinc-800">
			{#if isLoading}
				{#each Array(6) as _}
					<tr>
						<td colspan={columns.length + (selectable ? 1 : 0)} class="px-4 py-4">
							<div class="h-5 animate-pulse rounded bg-zinc-800"></div>
						</td>
					</tr>
				{/each}
			{:else if data.length === 0}
				<tr>
					<td colspan={columns.length + (selectable ? 1 : 0)} class="px-4 py-10 text-center text-zinc-500">Tidak ada data</td>
				</tr>
			{:else}
				{#each data as row}
					<tr class="text-zinc-300 hover:bg-zinc-800/30">
						{#if selectable}
							<td class="px-4 py-3">
								<input type="checkbox" checked={selected.includes(Number(row[rowKey]))} onchange={() => toggleOne(Number(row[rowKey]))} class="accent-violet-600" />
							</td>
						{/if}
						{@render children?.(row)}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
