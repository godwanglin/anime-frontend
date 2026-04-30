<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	let {
		language = $bindable('id'),
		label = $bindable('Indonesia'),
		fileUrl = $bindable(''),
		file = $bindable<File | null>(null),
		isSaving = false,
		onSubmit
	}: {
		language: string;
		label: string;
		fileUrl: string;
		file: File | null;
		isSaving?: boolean;
		onSubmit: () => void;
	} = $props();

	let isDragging = $state(false);

	function pick(event: Event) {
		file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		file = event.dataTransfer?.files?.[0] ?? null;
	}
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		onSubmit();
	}}
	class="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
>
	<div>
		<h3 class="text-lg font-black">Upload subtitle</h3>
		<p class="text-xs text-zinc-500">SRT akan dikonversi otomatis oleh backend.</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<label>
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Language</span>
			<input
				bind:value={language}
				class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				placeholder="id"
				required
			/>
		</label>
		<label>
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Label</span>
			<input
				bind:value={label}
				class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
				placeholder="Indonesia"
				required
			/>
		</label>
	</div>

	<label
		ondragover={(event) => {
			event.preventDefault();
			isDragging = true;
		}}
		ondragleave={() => (isDragging = false)}
		ondrop={drop}
		class="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition {isDragging
			? 'border-violet-400 bg-violet-500/10'
			: 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-500'}"
	>
		<AppIcon name="upload_file" class="mb-2 text-3xl text-violet-300" />
		<span class="text-sm font-bold"
			>{file?.name ?? 'Drop file .srt / .vtt atau klik untuk pilih'}</span
		>
		<span class="text-xs text-zinc-500">Maksimal mengikuti batas backend upload.</span>
		<input type="file" accept=".srt,.vtt,text/vtt" class="hidden" onchange={pick} />
	</label>

	<label>
		<span class="mb-1.5 block text-xs font-bold text-zinc-500">Atau URL file</span>
		<input
			bind:value={fileUrl}
			class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"
			placeholder="https://.../subtitle.vtt"
		/>
	</label>

	<button
		class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
		disabled={isSaving}
	>
		{isSaving ? 'Menyimpan...' : 'Simpan subtitle'}
	</button>
</form>
