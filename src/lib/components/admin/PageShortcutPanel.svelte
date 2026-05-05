<script lang="ts">
	let {
		pageNumbers = [],
		selectedPage = null,
		setCurrentPage,
		startMonitor
	}: {
		pageNumbers: number[];
		selectedPage: number | null;
		setCurrentPage: (page: number) => void;
		startMonitor: () => void;
	} = $props();
</script>

<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">Page Shortcut</h3>
				<p class="mt-2 text-sm text-zinc-500">Klik page untuk langsung ganti target monitor.</p>
			</div>
			<p class="text-xs font-semibold text-zinc-500">Target aktif: page {selectedPage ?? '-'}</p>
		</div>

		<div class="flex flex-wrap gap-2">
			{#each pageNumbers as pageNumber}
				<button
					onclick={() => {
						setCurrentPage(pageNumber);
						startMonitor();
					}}
					class="rounded-xl border px-3 py-2 text-xs font-bold transition {selectedPage === pageNumber
						? 'border-violet-500 bg-violet-500/15 text-violet-200'
						: 'border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'}"
				>
					{pageNumber}
				</button>
			{/each}
		</div>
	</div>
</div>
