<script lang="ts">
	import { imageUploader } from '$lib/stores/image-uploader.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	type ApiEnvelope<T> = {
		status: number;
		message: string | null;
		data: T;
		meta?: Record<string, unknown>;
	};

	type R2Asset = {
		key: string;
		url: string;
		filename: string;
		size: number;
		lastModified: string | null;
		etag: string | null;
	};

	type UploadResponse = {
		url: string;
		key: string;
		filename: string;
		contentType: string;
		size: number;
	};

	const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

	let mode = $state<'file' | 'url'>('file');
	let assets = $state<R2Asset[]>([]);
	let selectedFile = $state<File | null>(null);
	let remoteUrl = $state('');
	let remoteFilename = $state('');
	let loading = $state(false);
	let uploading = $state(false);
	let deletingKey = $state<string | null>(null);
	let copiedKey = $state<string | null>(null);
	let error = $state('');
	let notice = $state('');
	let bucket = $state('');
	let prefix = $state('content/assets/');
	let hasLoadedForOpen = $state(false);
	let deleteTarget = $state<R2Asset | null>(null);

	const totalSize = $derived(assets.reduce((sum, item) => sum + Number(item.size ?? 0), 0));
	const canUploadFile = $derived(Boolean(selectedFile) && !uploading);
	const canUploadUrl = $derived(remoteUrl.trim().length > 0 && !uploading);

	async function parseApi<T>(response: Response) {
		const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
		if (!response.ok) throw new Error(payload?.message ?? 'Request gagal');
		return payload as ApiEnvelope<T>;
	}

	async function authedFetch(path: string, init: RequestInit = {}) {
		if (!auth.accessToken) await auth.refreshToken();
		return auth.authFetch(path, init);
	}

	function sortAssets(items: R2Asset[]) {
		return [...items].sort((a, b) => {
			const left = a.lastModified ? new Date(a.lastModified).getTime() : 0;
			const right = b.lastModified ? new Date(b.lastModified).getTime() : 0;
			return right - left;
		});
	}

	async function loadAssets() {
		loading = true;
		error = '';
		notice = '';

		try {
			const nextItems: R2Asset[] = [];
			let cursor: string | null = null;

			do {
				const query = new URLSearchParams({ limit: '100' });
				if (cursor) query.set('cursor', cursor);

				const response = await authedFetch(`/api/uploads/assets?${query.toString()}`);
				const payload = await parseApi<R2Asset[]>(response);
				nextItems.push(...payload.data);
				cursor = (payload.meta?.nextCursor as string | null | undefined) ?? null;
				bucket = String(payload.meta?.bucket ?? bucket);
				prefix = String(payload.meta?.prefix ?? prefix);
			} while (cursor);

			assets = sortAssets(nextItems);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Gagal memuat asset';
		} finally {
			loading = false;
		}
	}

	function setSelectedFile(file: File | null) {
		error = '';
		notice = '';

		if (!file) {
			selectedFile = null;
			return;
		}

		if (!file.type.startsWith('image/')) {
			error = 'File harus bertipe image/*';
			selectedFile = null;
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			error = 'Ukuran gambar maksimal 10MB';
			selectedFile = null;
			return;
		}

		selectedFile = file;
	}

	function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setSelectedFile(input.files?.[0] ?? null);
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		setSelectedFile(event.dataTransfer?.files?.[0] ?? null);
	}

	async function uploadFile() {
		if (!selectedFile || uploading) return;
		uploading = true;
		error = '';
		notice = '';

		try {
			const form = new FormData();
			form.append('file', selectedFile);
			const response = await authedFetch('/api/uploads/assets/file', {
				method: 'POST',
				body: form
			});
			const payload = await parseApi<UploadResponse>(response);
			notice = `Uploaded: ${payload.data.filename}`;
			selectedFile = null;
			await loadAssets();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload file gagal';
		} finally {
			uploading = false;
		}
	}

	async function uploadUrl() {
		const url = remoteUrl.trim();
		if (!url || uploading) return;
		uploading = true;
		error = '';
		notice = '';

		try {
			const response = await authedFetch('/api/uploads/assets/url', {
				method: 'POST',
				body: JSON.stringify({
					url,
					filename: remoteFilename.trim() || undefined
				})
			});
			const payload = await parseApi<UploadResponse>(response);
			notice = `Uploaded: ${payload.data.filename}`;
			remoteUrl = '';
			remoteFilename = '';
			await loadAssets();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Upload URL gagal';
		} finally {
			uploading = false;
		}
	}

	async function copyUrl(asset: R2Asset) {
		try {
			await navigator.clipboard.writeText(asset.url);
			copiedKey = asset.key;
			setTimeout(() => {
				if (copiedKey === asset.key) copiedKey = null;
			}, 1400);
		} catch {
			error = 'Browser gagal copy URL';
		}
	}

	async function deleteAsset() {
		if (!deleteTarget || deletingKey) return;
		deletingKey = deleteTarget.key;
		error = '';
		notice = '';

		try {
			const response = await authedFetch('/api/uploads/assets', {
				method: 'DELETE',
				body: JSON.stringify({ key: deleteTarget.key })
			});
			await parseApi(response);
			assets = assets.filter((item) => item.key !== deleteTarget?.key);
			notice = 'Asset dihapus dari R2';
			deleteTarget = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Delete asset gagal';
		} finally {
			deletingKey = null;
		}
	}

	function closeModal() {
		imageUploader.close();
		deleteTarget = null;
		error = '';
	}

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'u') {
			event.preventDefault();
			imageUploader.open();
			return;
		}

		if (event.key === 'Escape' && imageUploader.isOpen) {
			event.preventDefault();
			closeModal();
		}
	}

	function formatBytes(bytes: number) {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
		const value = bytes / 1024 ** index;
		return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
	}

	function formatDate(value: string | null) {
		if (!value) return '-';
		return new Date(value).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	$effect(() => {
		if (imageUploader.isOpen && !hasLoadedForOpen) {
			hasLoadedForOpen = true;
			void loadAssets();
		}

		if (!imageUploader.isOpen) hasLoadedForOpen = false;
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if imageUploader.isOpen}
	<div class="fixed inset-0 z-[120] overflow-y-auto bg-black/70 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6">
		<button class="fixed inset-0 cursor-default" aria-label="Tutup uploader" onclick={closeModal}></button>

		<div
			class="relative mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/60"
			role="dialog"
			aria-modal="true"
			aria-label="Image uploader"
		>
			<header class="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-5">
				<div class="min-w-0">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">
						R2 Asset Manager
					</p>
					<h2 class="mt-1 text-lg font-black text-zinc-50 sm:text-xl">Upload Gambar</h2>
					<p class="mt-1 truncate text-xs font-semibold text-zinc-500">
						{bucket || 'anime-assets'} / {prefix}
					</p>
				</div>

				<div class="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onclick={loadAssets}
						disabled={loading}
						class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-violet-500/60 hover:text-violet-200 disabled:opacity-50"
						aria-label="Refresh asset"
						title="Refresh"
					>
						<span class="material-symbols-rounded text-[19px]">refresh</span>
					</button>
					<button
						type="button"
						onclick={closeModal}
						class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-50"
						aria-label="Tutup uploader"
						title="Tutup"
					>
						<span class="material-symbols-rounded text-[19px]">close</span>
					</button>
				</div>
			</header>

			<div class="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
				<aside class="shrink-0 border-b border-zinc-800 bg-zinc-950/95 p-4 lg:border-b-0 lg:border-r lg:p-5">
					<div class="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
						<button
							type="button"
							onclick={() => (mode = 'file')}
							class="flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black transition {mode ===
							'file'
								? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
								: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}"
						>
							<span class="material-symbols-rounded text-[17px]">upload_file</span>
							File
						</button>
						<button
							type="button"
							onclick={() => (mode = 'url')}
							class="flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black transition {mode ===
							'url'
								? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
								: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}"
						>
							<span class="material-symbols-rounded text-[17px]">link</span>
							URL
						</button>
					</div>

					{#if mode === 'file'}
						<label
							ondragover={(event) => event.preventDefault()}
							ondrop={onDrop}
							class="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-5 text-center transition hover:border-violet-500/70 hover:bg-violet-500/10"
						>
							<input type="file" accept="image/*" class="hidden" onchange={onFileChange} />
							<span class="material-symbols-rounded mb-3 text-4xl text-violet-300">
								add_photo_alternate
							</span>
							<p class="text-sm font-black text-zinc-100">
								{selectedFile ? selectedFile.name : 'Pilih gambar'}
							</p>
							<p class="mt-1 text-xs font-semibold text-zinc-500">
								{selectedFile ? formatBytes(selectedFile.size) : 'image/* maksimal 10MB'}
							</p>
						</label>

						<button
							type="button"
							onclick={uploadFile}
							disabled={!canUploadFile}
							class="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="material-symbols-rounded text-[18px]">cloud_upload</span>
							{uploading ? 'Uploading...' : 'Upload File'}
						</button>
					{:else}
						<div class="space-y-3">
							<label class="block">
								<span class="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-500">
									Image URL
								</span>
								<input
									bind:value={remoteUrl}
									type="url"
									placeholder="https://..."
									class="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
								/>
							</label>
							<label class="block">
								<span class="mb-1.5 block text-xs font-black uppercase tracking-widest text-zinc-500">
									Filename
								</span>
								<input
									bind:value={remoteFilename}
									type="text"
									placeholder="optional"
									class="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
								/>
							</label>
						</div>

						<button
							type="button"
							onclick={uploadUrl}
							disabled={!canUploadUrl}
							class="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span class="material-symbols-rounded text-[18px]">download</span>
							{uploading ? 'Downloading...' : 'Upload URL'}
						</button>
					{/if}

					{#if error}
						<div class="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
							{error}
						</div>
					{/if}

					{#if notice}
						<div class="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
							{notice}
						</div>
					{/if}

					<div class="mt-5 grid grid-cols-2 gap-3">
						<div class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
							<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Asset</p>
							<p class="mt-1 text-xl font-black text-zinc-50">{assets.length}</p>
						</div>
						<div class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
							<p class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Size</p>
							<p class="mt-1 text-xl font-black text-zinc-50">{formatBytes(totalSize)}</p>
						</div>
					</div>
				</aside>

				<div class="min-h-0 overflow-y-auto p-4 sm:p-5">
					{#if loading}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
							{#each Array(8) as _}
								<div class="aspect-[4/5] animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"></div>
							{/each}
						</div>
					{:else if assets.length === 0}
						<div class="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 text-center">
							<span class="material-symbols-rounded mb-3 text-4xl text-zinc-600">image</span>
							<p class="text-sm font-black text-zinc-300">Belum ada asset</p>
							<p class="mt-1 text-xs font-semibold text-zinc-600">Upload pertama akan masuk ke prefix {prefix}</p>
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
							{#each assets as asset (asset.key)}
								<article class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
									<a
										href={asset.url}
										target="_blank"
										rel="noopener"
										class="block aspect-square bg-zinc-950"
									>
										<img
											src={asset.url}
											alt={asset.filename}
											loading="lazy"
											class="h-full w-full object-cover"
										/>
									</a>

									<div class="space-y-2 p-3">
										<div class="min-w-0">
											<p class="truncate text-xs font-black text-zinc-100" title={asset.filename}>
												{asset.filename}
											</p>
											<p class="mt-1 text-[11px] font-semibold text-zinc-500">
												{formatBytes(asset.size)} / {formatDate(asset.lastModified)}
											</p>
										</div>
										<p class="line-clamp-2 break-all font-mono text-[10px] leading-4 text-zinc-600" title={asset.key}>
											{asset.key}
										</p>

										<div class="grid grid-cols-2 gap-2">
											<button
												type="button"
												onclick={() => copyUrl(asset)}
												class="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 text-xs font-black text-zinc-300 transition hover:border-violet-500/70 hover:text-violet-200"
											>
												<span class="material-symbols-rounded text-[16px]">
													{copiedKey === asset.key ? 'check' : 'content_copy'}
												</span>
												{copiedKey === asset.key ? 'Copied' : 'Copy'}
											</button>
											<button
												type="button"
												onclick={() => (deleteTarget = asset)}
												disabled={deletingKey === asset.key}
												class="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
											>
												<span class="material-symbols-rounded text-[16px]">delete</span>
												Delete
											</button>
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if deleteTarget}
			<div class="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4">
				<div class="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl shadow-black/60">
					<p class="text-[11px] font-black uppercase tracking-[0.22em] text-red-300">Delete R2 Asset</p>
					<h3 class="mt-2 text-lg font-black">Hapus gambar ini?</h3>
					<p class="mt-2 break-all text-xs leading-5 text-zinc-500">{deleteTarget.key}</p>
					<div class="mt-5 flex justify-end gap-2">
						<button
							type="button"
							onclick={() => (deleteTarget = null)}
							class="h-10 rounded-xl border border-zinc-700 px-4 text-sm font-black text-zinc-300 hover:bg-zinc-900"
						>
							Batal
						</button>
						<button
							type="button"
							onclick={deleteAsset}
							disabled={Boolean(deletingKey)}
							class="h-10 rounded-xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500 disabled:opacity-50"
						>
							{deletingKey ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
