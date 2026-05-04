<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import config from '$lib/config';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { adminToast } from '$lib/stores/adminToast.svelte';

	type CookieStatus = {
		exists: boolean;
		path: string;
		size?: number;
		updatedAt?: string;
	};

	let status = $state<CookieStatus | null>(null);
	let selectedFile = $state<File | null>(null);
	let isLoading = $state(false);
	let isUploading = $state(false);
	let errorMessage = $state('');

	function formatBytes(value?: number) {
		if (!value) return '-';
		if (value < 1024) return `${value} B`;
		if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
		return `${(value / 1024 / 1024).toFixed(2)} MB`;
	}

	function formatDate(value?: string) {
		if (!value) return '-';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function loadStatus() {
		isLoading = true;
		errorMessage = '';
		try {
			const response = await auth.authFetch('/api/admin/youtube-tools/cookies');
			const payload = await response.json();
			if (!response.ok) throw new Error(payload?.message ?? 'Gagal membaca status cookies');
			status = payload.data;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Gagal membaca status cookies';
		} finally {
			isLoading = false;
		}
	}

	async function uploadCookies() {
		if (!selectedFile) return;

		isUploading = true;
		errorMessage = '';
		const form = new FormData();
		form.append('file', selectedFile);

		try {
			const response = await auth.authFetch('/api/admin/youtube-tools/cookies', {
				method: 'POST',
				body: form
			});
			const payload = await response.json();
			if (!response.ok) throw new Error(payload?.message ?? 'Gagal upload cookies');
			status = payload.data;
			selectedFile = null;
			adminToast.success('Cookies YouTube disimpan');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Gagal upload cookies';
			adminToast.error(errorMessage);
		} finally {
			isUploading = false;
		}
	}

	onMount(loadStatus);
</script>

<div class="mx-auto max-w-4xl space-y-5">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-black uppercase tracking-[0.2em] text-violet-300">YouTube Tools</p>
			<h1 class="mt-1 text-2xl font-black text-white">yt-dlp Cookies</h1>
			<p class="mt-1 text-sm font-semibold text-zinc-400">
				Upload cookies Netscape untuk fallback subtitle YouTube yang terkena bot check.
			</p>
		</div>
		<button
			type="button"
			onclick={loadStatus}
			disabled={isLoading}
			class="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60"
		>
			<AppIcon name="refresh" class="text-[16px]" />
			Refresh
		</button>
	</div>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
				<p class="text-xs font-bold text-zinc-500">Status</p>
				<p class="mt-2 text-lg font-black {status?.exists ? 'text-emerald-300' : 'text-zinc-300'}">
					{status?.exists ? 'Aktif' : 'Belum ada'}
				</p>
			</div>
			<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
				<p class="text-xs font-bold text-zinc-500">Ukuran</p>
				<p class="mt-2 text-lg font-black text-white">{formatBytes(status?.size)}</p>
			</div>
			<div class="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
				<p class="text-xs font-bold text-zinc-500">Updated</p>
				<p class="mt-2 text-sm font-bold text-white">{formatDate(status?.updatedAt)}</p>
			</div>
		</div>

		<div class="mt-4 rounded-lg border border-zinc-800 bg-black/20 p-3">
			<p class="text-xs font-bold text-zinc-500">Path di server</p>
			<p class="mt-1 break-all font-mono text-xs text-zinc-300">{status?.path ?? '-'}</p>
		</div>
	</section>

	<section class="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
		<h2 class="text-lg font-black text-white">Import Cookies</h2>
		<p class="mt-1 text-sm font-semibold text-zinc-400">
			Gunakan file format Netscape HTTP Cookie File. Cookies disimpan sebagai file lokal server dan dipakai otomatis oleh yt-dlp.
		</p>

		<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
			<label
				class="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-950 px-4 py-3 hover:border-violet-500/70"
			>
				<AppIcon name="upload_file" class="text-[20px] text-violet-300" />
				<span class="truncate text-sm font-bold text-zinc-200">
					{selectedFile?.name ?? 'Pilih cookies.txt'}
				</span>
				<input
					type="file"
					accept=".txt,text/plain"
					class="hidden"
					onchange={(event) => (selectedFile = event.currentTarget.files?.[0] ?? null)}
				/>
			</label>
			<button
				type="button"
				onclick={uploadCookies}
				disabled={!selectedFile || isUploading}
				class="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
			>
				<AppIcon name="cloud_upload" class="text-[17px]" />
				{isUploading ? 'Uploading...' : 'Upload'}
			</button>
		</div>

		{#if errorMessage}
			<p class="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 px-3 py-2 text-sm font-bold text-red-200">
				{errorMessage}
			</p>
		{/if}
	</section>
</div>
