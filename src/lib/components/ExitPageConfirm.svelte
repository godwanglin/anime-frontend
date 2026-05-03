<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';

	const EXIT_STATE_KEY = '__animeExitGuard';
	const EXIT_PATH_KEY = '__animeExitPath';
	const EXIT_BASE = 'base';
	const EXIT_READY = 'ready';

	let exitConfirmOpen = $state(false);
	let allowExit = false;
	let currentPath = '';

	function appPath() {
		return `${location.pathname}${location.search}${location.hash}`;
	}

	function stateWithExitGuard(role: string, path = appPath()) {
		const state = history.state && typeof history.state === 'object' ? history.state : {};
		return { ...state, [EXIT_STATE_KEY]: role, [EXIT_PATH_KEY]: path };
	}

	function installExitBoundary() {
		currentPath = appPath();
		const currentState = history.state;
		if (currentState?.[EXIT_STATE_KEY] === EXIT_READY) return;

		history.replaceState(stateWithExitGuard(EXIT_BASE, currentPath), '', location.href);
		history.pushState(stateWithExitGuard(EXIT_READY, currentPath), '', location.href);
	}

	function closeExitConfirm() {
		exitConfirmOpen = false;
	}

	function confirmExitPage() {
		allowExit = true;
		exitConfirmOpen = false;
		history.go(-2);

		window.setTimeout(() => {
			allowExit = false;
		}, 1000);
	}

	onMount(() => {
		installExitBoundary();

		function onPopState(event: PopStateEvent) {
			if (allowExit || event.state?.[EXIT_STATE_KEY] !== EXIT_BASE) return;

			const boundaryPath = event.state?.[EXIT_PATH_KEY];
			if (typeof boundaryPath === 'string' && boundaryPath !== currentPath) {
				currentPath = boundaryPath;
				history.pushState(stateWithExitGuard(EXIT_READY, boundaryPath), '', location.href);
				return;
			}

			exitConfirmOpen = true;
			history.pushState(stateWithExitGuard(EXIT_READY), '', location.href);
		}

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	afterNavigate(() => {
		currentPath = appPath();
		const currentState = history.state;
		if (currentState?.[EXIT_STATE_KEY]) {
			history.replaceState(
				{ ...currentState, [EXIT_PATH_KEY]: currentPath },
				'',
				location.href
			);
		}
	});
</script>

{#if exitConfirmOpen}
	<div
		class="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 px-4 py-5 backdrop-blur-sm md:items-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="exit-page-title"
	>
		<button
			type="button"
			class="absolute inset-0"
			aria-label="Batal keluar halaman"
			onclick={closeExitConfirm}
		></button>
		<div
			class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-5 text-center text-white shadow-2xl"
			style="box-shadow: 0 24px 80px rgba(0,0,0,.45);"
		>
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300"
			>
				<AppIcon name="logout" class="text-[24px]" />
			</div>
			<h2 id="exit-page-title" class="text-base font-black">Keluar dari halaman?</h2>
			<p class="mt-2 text-[13px] leading-relaxed text-zinc-400">
				Kamu sudah ada di batas riwayat aplikasi. Pilih Tidak kalau masih mau tetap di sini.
			</p>
			<div class="mt-5 grid grid-cols-2 gap-2.5">
				<button
					type="button"
					class="rounded-full border border-white/10 px-4 py-2.5 text-[12px] font-black text-white/75 transition hover:bg-white/5"
					onclick={closeExitConfirm}
				>
					Tidak
				</button>
				<button
					type="button"
					class="rounded-full px-4 py-2.5 text-[12px] font-black text-white transition active:scale-[0.98]"
					style="background: linear-gradient(135deg, #f59e0b, #ef4444); box-shadow: 0 14px 34px rgba(239,68,68,.28);"
					onclick={confirmExitPage}
				>
					Ya
				</button>
			</div>
		</div>
	</div>
{/if}
