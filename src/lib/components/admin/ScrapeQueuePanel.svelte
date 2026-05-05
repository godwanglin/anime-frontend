<script lang="ts">
	type QueueItem = {
		page: number;
		status: 'pending' | 'running' | 'done' | 'error';
	};

	let {
		singlePage = $bindable(1),
		rangeFrom = $bindable(1),
		rangeTo = $bindable(1),
		queue = [],
		queueRunning = false,
		queueStatus = '',
		totalPages = 30,
		startScrape,
		cancelQueue
	}: {
		singlePage: number;
		rangeFrom: number;
		rangeTo: number;
		queue: QueueItem[];
		queueRunning: boolean;
		queueStatus: string;
		totalPages: number;
		startScrape: (mode: 'single' | 'range') => void;
		cancelQueue: () => void;
	} = $props();
</script>

<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">Scrape Queue</h3>
				<p class="mt-2 text-sm text-zinc-500">
					Jalankan page tunggal atau range page langsung dari panel admin.
				</p>
			</div>
			<p class="text-xs font-semibold text-zinc-500">{queueStatus}</p>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Single Page</p>
				<div class="mt-3 flex gap-3">
					<input
						bind:value={singlePage}
						type="number"
						min="1"
						max={totalPages}
						class="h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
					/>
					<button
						onclick={() => startScrape('single')}
						disabled={queueRunning}
						class="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Scrape Page
					</button>
				</div>
			</div>

			<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
				<p class="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Range Page</p>
				<div class="mt-3 flex items-center gap-3">
					<input
						bind:value={rangeFrom}
						type="number"
						min="1"
						max={totalPages}
						class="h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
					/>
					<span class="text-zinc-600">to</span>
					<input
						bind:value={rangeTo}
						type="number"
						min="1"
						max={totalPages}
						class="h-11 w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
					/>
					<button
						onclick={() => startScrape('range')}
						disabled={queueRunning}
						class="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Scrape Range
					</button>
				</div>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#each queue as item}
				<span
					class="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide {item.status === 'done'
						? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
						: item.status === 'running'
							? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
							: item.status === 'error'
								? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
								: 'border-zinc-700 bg-zinc-800/60 text-zinc-300'}"
				>
					p{item.page}
				</span>
			{:else}
				<span class="text-sm text-zinc-500">Belum ada queue.</span>
			{/each}

			{#if queueRunning}
				<button
					onclick={cancelQueue}
					class="ml-auto rounded-xl border border-rose-900/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-300 transition hover:bg-rose-950/40"
				>
					Cancel Queue
				</button>
			{/if}
		</div>
	</div>
</div>
