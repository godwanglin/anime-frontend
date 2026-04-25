<script lang="ts">
	import { onMount } from 'svelte';
	import { adminApi } from '$lib/admin/api';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type AnimeOption = { id: number; title: string; slug: string };

	const categories = [
		{ value: 'announcement', label: 'Announcement' },
		{ value: 'content_new', label: 'Content New' },
		{ value: 'content_update', label: 'Content Update' },
		{ value: 'personal_activity', label: 'Personal Activity' },
		{ value: 'watch_reminder', label: 'Watch Reminder' },
		{ value: 'account_system', label: 'Account System' },
		{ value: 'admin_operational', label: 'Admin Operational' }
	];

	const scopes = [
		{ value: 'broadcast', label: 'Broadcast guest + user' },
		{ value: 'all-users', label: 'Semua user login' },
		{ value: 'admins', label: 'Admin only' },
		{ value: 'saved-anime', label: 'User yang save anime tertentu' },
		{ value: 'genres', label: 'User berdasarkan genre anime yang disimpan' }
	];

	let animeOptions = $state<AnimeOption[]>([]);
	let loading = $state(false);
	let title = $state('');
	let message = $state('');
	let category = $state('announcement');
	let scope = $state('broadcast');
	let type = $state('manual_broadcast');
	let link = $state('');
	let image = $state('');
	let topic = $state('manual');
	let animeId = $state('');
	let genres = $state('');

	async function loadAnimeOptions() {
		const result = await adminApi<AnimeOption[]>('/anime?limit=100&sort=title');
		animeOptions = result.data;
	}

	async function submit() {
		loading = true;
		try {
			await adminApi('/notifications/broadcast', {
				method: 'POST',
				body: JSON.stringify({
					title: title.trim(),
					message: message.trim(),
					category,
					scope,
					type: type.trim() || 'manual_broadcast',
					link: link.trim() || null,
					image: image.trim() || null,
					topic: topic.trim() || null,
					animeId: animeId ? Number(animeId) : null,
					genres: genres
						.split(',')
						.map((item) => item.trim())
						.filter(Boolean)
				})
			});
			adminToast.success('Broadcast notifikasi terkirim');
			title = '';
			message = '';
			link = '';
			image = '';
			genres = '';
			animeId = '';
		} catch (error) {
			adminToast.error(error instanceof Error ? error.message : 'Gagal kirim broadcast');
		} finally {
			loading = false;
		}
	}

	onMount(loadAnimeOptions);
</script>

<div class="space-y-6">
	<section class="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5">
		<div class="max-w-3xl">
			<p class="text-[11px] font-black uppercase tracking-[0.24em] text-violet-300">Notification Control</p>
			<h2 class="mt-2 text-2xl font-black text-zinc-100">Broadcast manual dan segment notif</h2>
			<p class="mt-2 text-sm leading-6 text-zinc-500">
				Pakai panel ini buat kirim announcement umum, notif ke semua user login, admin only, user yang save anime tertentu, atau user berdasarkan genre anime yang mereka simpan.
			</p>
		</div>
	</section>

	<form
		class="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 xl:grid-cols-2"
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
	>
		<label class="block xl:col-span-2">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Judul</span>
			<input bind:value={title} required class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
		</label>

		<label class="block xl:col-span-2">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Pesan</span>
			<textarea bind:value={message} required rows="5" class="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100"></textarea>
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Kategori</span>
			<select bind:value={category} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100">
				{#each categories as item}
					<option value={item.value}>{item.label}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Scope</span>
			<select bind:value={scope} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100">
				{#each scopes as item}
					<option value={item.value}>{item.label}</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Type</span>
			<input bind:value={type} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Topic</span>
			<input bind:value={topic} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Link tujuan</span>
			<input bind:value={link} placeholder="/anime/nama-slug" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
		</label>

		<label class="block">
			<span class="mb-1.5 block text-xs font-bold text-zinc-500">Image URL</span>
			<input bind:value={image} placeholder="opsional" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
		</label>

		{#if scope === 'saved-anime'}
			<label class="block xl:col-span-2">
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Target anime</span>
				<select bind:value={animeId} class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100">
					<option value="">Pilih anime</option>
					{#each animeOptions as anime}
						<option value={String(anime.id)}>{anime.title}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if scope === 'genres'}
			<label class="block xl:col-span-2">
				<span class="mb-1.5 block text-xs font-bold text-zinc-500">Genre segment</span>
				<input bind:value={genres} placeholder="Action, Fantasy, Romance" class="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100" />
			</label>
		{/if}

		<div class="xl:col-span-2 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
			<p class="text-xs text-zinc-500">
				Scope segment pakai data saved anime user yang sudah ada sekarang.
			</p>
			<button disabled={loading} class="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
				{loading ? 'Mengirim...' : 'Kirim Notification'}
			</button>
		</div>
	</form>
</div>
