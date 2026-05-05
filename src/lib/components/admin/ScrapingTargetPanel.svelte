<script lang="ts">
	type ProgressData = {
		startedAt?: string | null;
		finishedAt?: string | null;
	};

	let {
		currentUrl = $bindable(''),
		progress = null,
		lastUpdate = null,
		startMonitor,
		togglePause,
		deleteProgress,
		formatDateTime,
		paused = false
	}: {
		currentUrl: string;
		progress: ProgressData | null;
		lastUpdate: string | null;
		startMonitor: () => void;
		togglePause: () => void;
		deleteProgress: () => void;
		formatDateTime: (value?: string | Date | null) => string;
		paused: boolean;
	} = $props();
</script>

<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex flex-col gap-4">
		<div>
			<h3 class="text-sm font-black uppercase tracking-[0.22em] text-zinc-400">Target Monitor</h3>
			<p class="mt-2 text-sm text-zinc-500">
				Pilih URL target, start scrape, pause monitor, atau hapus progress yang sudah tersimpan.
			</p>
		</div>

		<div class="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto]">
			<input
				bind:value={currentUrl}
				placeholder="https://anichin.cafe/seri/?page=1&order=update"
				class="h-12 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500"
			/>
			<button
				onclick={startMonitor}
				class="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
			>
				Monitor
			</button>
			<button
				onclick={togglePause}
				class="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:bg-zinc-800"
			>
				{paused ? 'Resume' : 'Pause'}
			</button>
			<button
				onclick={deleteProgress}
				class="rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-950/50"
			>
				Delete Progress
			</button>
		</div>

		<div class="grid gap-3 md:grid-cols-3">
			<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Started</p>
				<p class="mt-2 text-sm font-semibold text-zinc-100">
					{formatDateTime(progress?.startedAt)}
				</p>
			</div>
			<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">Finished</p>
				<p class="mt-2 text-sm font-semibold text-zinc-100">
					{formatDateTime(progress?.finishedAt)}
				</p>
			</div>
			<div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
				<p class="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
					Last Update
				</p>
				<p class="mt-2 text-sm font-semibold text-zinc-100">{lastUpdate ?? '-'}</p>
			</div>
		</div>
	</div>
</div>
