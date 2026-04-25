<script lang="ts">
	import { goto } from '$app/navigation';
	import { adminApi } from '$lib/admin/api';
	import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
	import AdminTagInput from '$lib/components/admin/AdminTagInput.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	let title = $state('');
	let slug = $state('');
	let type = $state('Anime');
	let status = $state('Ongoing');
	let rating = $state<number | null>(null);
	let network = $state('');
	let studio = $state('');
	let country = $state('');
	let released = $state('');
	let season = $state('');
	let duration = $state('');
	let totalEpisodes = $state<number | null>(null);
	let thumbnail = $state('');
	let bigCover = $state('');
	let synopsis = $state('');
	let genres = $state<string[]>([]);
	let isSaving = $state(false);

	async function save() {
		isSaving = true;
		try {
			const result = await adminApi<{ id: number }>('/anime', {
				method: 'POST',
				body: JSON.stringify({ title, slug, type, status, rating, network, studio, country, released, season, duration, totalEpisodes, thumbnail, bigCover, synopsis, genres })
			});
			adminToast.success('Anime berhasil dibuat');
			goto(`/admin/anime/${result.data.id}`);
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal menyimpan anime');
		} finally {
			isSaving = false;
		}
	}
</script>

<form class="mx-auto max-w-5xl space-y-5" onsubmit={(event) => { event.preventDefault(); save(); }}>
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-black">Tambah Anime</h2>
			<p class="text-sm text-zinc-500">Isi metadata dasar, media, dan genre.</p>
		</div>
		<button disabled={isSaving} class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">Simpan</button>
	</div>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<h3 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">Info Dasar</h3>
		<div class="grid gap-4 md:grid-cols-2">
			<AdminFormInput label="Judul" name="title" bind:value={title} required />
			<AdminFormInput label="Slug" name="slug" bind:value={slug} required />
			<label class="block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">Type</span><select bind:value={type} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"><option>Anime</option><option>Movie</option><option>Donghua</option></select></label>
			<label class="block"><span class="mb-1.5 block text-xs font-bold text-zinc-500">Status</span><select bind:value={status} class="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm"><option>Ongoing</option><option>Completed</option></select></label>
			<AdminFormInput label="Rating" name="rating" type="number" bind:value={rating} />
			<AdminFormInput label="Total Episode" name="totalEpisodes" type="number" bind:value={totalEpisodes} />
			<AdminFormInput label="Network" name="network" bind:value={network} />
			<AdminFormInput label="Studio" name="studio" bind:value={studio} />
			<AdminFormInput label="Country" name="country" bind:value={country} />
			<AdminFormInput label="Released" name="released" bind:value={released} />
			<AdminFormInput label="Season" name="season" bind:value={season} />
			<AdminFormInput label="Duration" name="duration" bind:value={duration} />
		</div>
		<div class="mt-4">
			<AdminTagInput label="Genre" bind:tags={genres} />
		</div>
		<label class="mt-4 block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Synopsis</span>
			<textarea bind:value={synopsis} rows="6" class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-violet-500"></textarea>
		</label>
	</section>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<h3 class="mb-4 text-sm font-black uppercase tracking-widest text-zinc-500">Media</h3>
		<div class="grid gap-4 md:grid-cols-2">
			<AdminFormInput label="Thumbnail URL" name="thumbnail" bind:value={thumbnail} />
			<AdminFormInput label="Big Cover URL" name="bigCover" bind:value={bigCover} />
		</div>
	</section>
</form>
