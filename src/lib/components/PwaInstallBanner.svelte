<script lang="ts">
	import { browser } from '$app/environment';
	import AppIcon from '$lib/components/AppIcon.svelte';
	import { onMount } from 'svelte';

	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	};

	type Props = {
		siteName: string;
		siteLogo: string;
		onVisibleChange?: (visible: boolean) => void;
	};

	let { siteName, siteLogo, onVisibleChange }: Props = $props();

	let installPrompt = $state<BeforeInstallPromptEvent | null>(null);
	let isStandalone = $state(true);
	let installDismissed = $state(false);
	let openDismissed = $state(false);
	let installed = $state(false);
	let ready = $state(false);
	let showingHint = $state(false);

	const visible = $derived(
		ready && !isStandalone && (installed ? !openDismissed : !installDismissed)
	);
	const actionLabel = $derived(installPrompt ? 'Install' : installed ? 'Buka App' : 'Install');
	const helperText = $derived(
		installed
			? showingHint
				? 'Buka dari shortcut app di desktop.'
				: 'Sudah terinstall, lanjut dari app.'
			: showingHint
				? 'Buka menu browser lalu pilih install app.'
				: 'Buka lebih cepat dari layar utama.'
	);

	function readStandaloneMode() {
		const iosStandalone =
			'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
		isStandalone = window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
	}

	function dismiss() {
		if (installed) {
			openDismissed = true;
			localStorage.setItem('pwa_open_banner_dismissed_at', String(Date.now()));
			return;
		}

		installDismissed = true;
		localStorage.setItem('pwa_install_banner_dismissed_at', String(Date.now()));
	}

	async function handleAction() {
		if (installPrompt) {
			const prompt = installPrompt;
			installPrompt = null;
			await prompt.prompt();
			const choice = await prompt.userChoice.catch(() => null);
			if (choice?.outcome === 'accepted') {
				installed = true;
				showingHint = false;
				localStorage.setItem('pwa_installed', 'true');
			}
			return;
		}

		if (installed) {
			showingHint = true;
			return;
		}

		showingHint = true;
	}

	onMount(() => {
		if (!browser) return;

		const installDismissedAt = Number(
			localStorage.getItem('pwa_install_banner_dismissed_at') ?? 0
		);
		const openDismissedAt = Number(localStorage.getItem('pwa_open_banner_dismissed_at') ?? 0);
		const installDismissExpired =
			!installDismissedAt || Date.now() - installDismissedAt > 1000 * 60 * 60 * 24 * 7;
		const openDismissExpired =
			!openDismissedAt || Date.now() - openDismissedAt > 1000 * 60 * 60 * 24 * 7;
		installDismissed = !installDismissExpired;
		openDismissed = !openDismissExpired;
		installed = localStorage.getItem('pwa_installed') === 'true';
		readStandaloneMode();
		ready = true;

		const media = window.matchMedia('(display-mode: standalone)');
		const onDisplayModeChange = () => readStandaloneMode();
		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			installPrompt = event as BeforeInstallPromptEvent;
			showingHint = false;
		};
		const onAppInstalled = () => {
			installed = true;
			installPrompt = null;
			localStorage.setItem('pwa_installed', 'true');
			localStorage.removeItem('pwa_install_banner_dismissed_at');
			installDismissed = false;
		};

		media.addEventListener('change', onDisplayModeChange);
		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);

		return () => {
			media.removeEventListener('change', onDisplayModeChange);
			window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
			window.removeEventListener('appinstalled', onAppInstalled);
		};
	});

	$effect(() => {
		onVisibleChange?.(visible);
	});
</script>

{#if visible}
	<div
		class="pwa-install-banner h-12 md:h-[46px] px-3 md:px-5 flex items-center justify-center"
	>
		<div class="w-full max-w-7xl flex items-center gap-2.5">
			<div class="pwa-install-logo shrink-0">
				<img src={siteLogo} alt="" class="h-full w-full object-contain" />
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-[12px] md:text-[13px] font-black leading-4 truncate text-white">
					{siteName} App
				</p>
				<p class="text-[10px] md:text-[11px] font-semibold leading-3 text-white/78 truncate">
					{helperText}
				</p>
			</div>
			<button
				type="button"
				onclick={handleAction}
				class="pwa-install-action h-8 px-4 rounded-full text-[11px] font-black transition active:scale-95"
			>
				<AppIcon name={installPrompt ? 'download' : 'open_in_new'} style="font-size:14px;" />
				{actionLabel}
			</button>
			<button
				type="button"
				onclick={dismiss}
				aria-label="Tutup banner app"
				class="h-8 w-8 rounded-full flex items-center justify-center text-white/80 transition hover:bg-white/12 active:scale-95 shrink-0"
			>
				<AppIcon name="close" style="font-size:18px;" />
			</button>
		</div>
	</div>
{/if}

<style>
	.pwa-install-banner {
		position: relative;
		overflow: hidden;
		color: white;
		background:
			linear-gradient(0deg, oklch(0 0 0 / 0.18), oklch(0 0 0 / 0.18)),
			radial-gradient(circle at 18% 0%, oklch(0.7 0.18 310 / 0.5), transparent 34%),
			radial-gradient(circle at 78% 20%, oklch(0.62 0.18 250 / 0.38), transparent 30%),
			linear-gradient(90deg, oklch(0.36 0.16 290 / 0.88), oklch(0.45 0.18 285 / 0.82));
		backdrop-filter: blur(18px) saturate(160%);
		-webkit-backdrop-filter: blur(18px) saturate(160%);
		border-bottom: 1px solid oklch(1 0 0 / 0.16);
		box-shadow:
			0 1px 0 oklch(1 0 0 / 0.18) inset,
			0 12px 28px oklch(0 0 0 / 0.16);
	}

	.pwa-install-banner::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(180deg, oklch(1 0 0 / 0.12), transparent 54%);
	}

	.pwa-install-banner > div {
		position: relative;
		z-index: 1;
	}

	.pwa-install-logo {
		height: 32px;
		width: 32px;
		padding: 3px;
		border-radius: 12px;
		background: oklch(1 0 0 / 0.14);
		border: 1px solid oklch(1 0 0 / 0.18);
		box-shadow:
			0 8px 18px oklch(0 0 0 / 0.18),
			0 1px 0 oklch(1 0 0 / 0.25) inset;
	}

	.pwa-install-action {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: oklch(0.45 0.18 290);
		background: oklch(1 0 0 / 0.94);
		box-shadow:
			0 8px 18px oklch(0 0 0 / 0.16),
			0 1px 0 oklch(1 0 0 / 0.86) inset;
	}

	.pwa-install-action:hover {
		background: white;
		transform: translateY(-1px);
	}
</style>
