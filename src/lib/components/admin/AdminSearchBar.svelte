<script lang="ts">
	let {
		placeholder = 'Cari...',
		value = '',
		debounce = 300,
		onSearch = (_value: string) => {}
	} = $props<{
		placeholder?: string;
		value?: string;
		debounce?: number;
		onSearch?: (value: string) => void;
	}>();
	let timer: ReturnType<typeof setTimeout>;
	let query = $state('');

	$effect(() => {
		query = value;
	});

	function handleInput() {
		clearTimeout(timer);
		timer = setTimeout(() => onSearch(query), debounce);
	}
</script>

<div class="relative">
	<span
		class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-zinc-500"
		>search</span
	>
	<input
		bind:value={query}
		oninput={handleInput}
		{placeholder}
		class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
	/>
</div>
