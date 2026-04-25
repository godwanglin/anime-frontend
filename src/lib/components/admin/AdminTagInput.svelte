<script lang="ts">
	let { label = 'Tags', tags = $bindable<string[]>([]) } = $props<{
		label?: string;
		tags?: string[];
	}>();
	let draft = $state('');

	function addTag() {
		const value = draft.trim();
		if (!value || tags.includes(value)) return;
		tags = [...tags, value];
		draft = '';
	}
</script>

<div>
	<p class="mb-1.5 text-xs font-bold text-zinc-500">{label}</p>
	<div class="flex flex-wrap gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2">
		{#each tags as tag}
			<button onclick={() => (tags = tags.filter((item: string) => item !== tag))} class="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200">
				{tag} x
			</button>
		{/each}
		<input
			bind:value={draft}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					addTag();
				}
			}}
			placeholder="Tambah genre..."
			class="min-w-40 flex-1 bg-transparent px-2 py-1 text-sm text-zinc-100 outline-none"
		/>
	</div>
</div>
