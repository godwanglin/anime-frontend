<script lang="ts">
	import { browser, dev } from '$app/environment';
	import { page } from '$app/state';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';

	type VersionPayload = {
		version?: string;
	};

	const checkIntervalMs = 60_000;
	let currentVersion = $state<string | null>(null);
	let updateVersion = $state<string | null>(null);
	let dismissedVersion = $state<string | null>(null);
	let checking = false;
	let started = false;
	let timer: ReturnType<typeof setInterval> | null = null;
	const hasUpdate = $derived(Boolean(updateVersion && updateVersion !== dismissedVersion));

	async function fetchVersion() {
		const response = await fetch(`/_app/version.json?t=${Date.now()}`, {
			cache: 'no-store',
			headers: { 'cache-control': 'no-cache' }
		});
		if (!response.ok) return null;

		const payload = (await response.json().catch(() => null)) as VersionPayload | null;
		return payload?.version ?? null;
	}

	async function checkVersion() {
		if (!browser || dev || checking) return;
		checking = true;
		try {
			const nextVersion = await fetchVersion();
			if (!nextVersion) return;

			if (!currentVersion) {
				currentVersion = nextVersion;
				return;
			}

			if (nextVersion !== currentVersion) {
				updateVersion = nextVersion;
			}
		} finally {
			checking = false;
		}
	}

	function reloadNow() {
		window.location.reload();
	}

	function dismiss() {
		dismissedVersion = updateVersion;
	}

	function onVisible() {
		if (document.visibilityState === 'visible') checkVersion();
	}

	$effect(() => {
		page.url.pathname;
		if (started) checkVersion();
	});

	onMount(() => {
		if (dev) return;
		started = true;
		checkVersion();
		timer = setInterval(checkVersion, checkIntervalMs);
		document.addEventListener('visibilitychange', onVisible);

		return () => {
			if (timer) clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

{#if hasUpdate}
	<div
		class="fixed inset-x-3 bottom-4 z-[90] mx-auto max-w-md rounded-2xl border border-white/15 bg-zinc-950/90 p-3 text-zinc-50 shadow-2xl shadow-black/45 backdrop-blur-xl md:bottom-5"
		role="status"
		aria-live="polite"
	>
		<div class="flex items-start gap-3">
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-200 ring-1 ring-violet-300/20"
			>
				<AppIcon name="new_releases" class="text-[20px]" />
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-black">Update baru tersedia</p>
				<p class="mt-0.5 text-xs leading-5 text-zinc-400">
					Muat ulang halaman untuk pakai versi terbaru.
				</p>
				<div class="mt-3 flex items-center gap-2">
					<button
						type="button"
						onclick={reloadNow}
						class="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-black text-zinc-950 transition hover:bg-zinc-200"
					>
						<AppIcon name="refresh" class="text-[16px]" />
						Muat ulang
					</button>
					<button
						type="button"
						onclick={dismiss}
						class="h-9 rounded-full px-3 text-xs font-black text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
					>
						Nanti
					</button>
				</div>
			</div>
			<button
				type="button"
				onclick={dismiss}
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-100"
				aria-label="Tutup update"
			>
				<AppIcon name="close" class="text-[18px]" />
			</button>
		</div>
	</div>
{/if}
