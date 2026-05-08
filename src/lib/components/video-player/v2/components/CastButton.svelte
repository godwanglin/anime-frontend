<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();

	let open = $state(false);
	let panelEl = $state<HTMLDivElement>();
	let buttonEl = $state<HTMLButtonElement>();

	function toggle(e: MouseEvent) {
		e.stopPropagation();
		open = !open;
		if (open) vp.castStartScan();
	}

	function close() {
		open = false;
	}

	function handlePick(e: MouseEvent) {
		e.stopPropagation();
		vp.castStart();
		// Browser native picker takes over; close our popup
		close();
	}

	function handleStop(e: MouseEvent) {
		e.stopPropagation();
		vp.castStop();
		close();
	}

	$effect(() => {
		if (!open) return;
		const onDocClick = (ev: MouseEvent) => {
			const target = ev.target as Node;
			if (panelEl?.contains(target) || buttonEl?.contains(target)) return;
			close();
		};
		const onKey = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') close();
		};
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});

	const statusLabel = $derived.by(() => {
		if (!vp.castSupported) return 'Tidak tersedia';
		if (vp.castIsCasting)
			return vp.castState === 'connecting' ? 'Menghubungkan…' : 'Sedang cast';
		if (vp.castAvailable) return 'Perangkat ditemukan';
		if (vp.castScanning) return 'Mencari perangkat…';
		return 'Tidak ada perangkat';
	});
</script>

<div class="vp-cast-wrap">
	<button
		bind:this={buttonEl}
		type="button"
		class="vp-cast-fab"
		class:vp-cast-fab-active={vp.castIsCasting}
		class:vp-cast-fab-open={open}
		onclick={toggle}
		aria-label="Cast ke TV"
		aria-expanded={open}
	>
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
			/>
			<path
				d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"
			/>
		</svg>
		<span class="vp-cast-fab-badge">BETA</span>
	</button>

	{#if open}
		<div bind:this={panelEl} class="vp-cast-panel" role="dialog" aria-label="Cast ke perangkat">
			<div class="vp-cast-panel-header">
				<span class="vp-cast-panel-title">Cast ke perangkat</span>
				<span class="vp-cast-panel-pill">BETA</span>
			</div>

			<div class="vp-cast-panel-status">
				<span
					class="vp-cast-panel-dot"
					class:vp-cast-dot-on={vp.castIsCasting || vp.castAvailable}
					class:vp-cast-dot-warn={!vp.castSupported}
					class:vp-cast-dot-pulse={vp.castScanning && !vp.castAvailable}
				></span>
				<span>{statusLabel}</span>
			</div>

			{#if !vp.castSupported}
				<div class="vp-cast-panel-body">
					<p class="vp-cast-panel-msg">
						Fitur cast belum tersedia di sini.
						{#if vp.castUnsupportedReason}
							<br /><span class="vp-cast-panel-reason">{vp.castUnsupportedReason}</span>
						{/if}
					</p>
					<ul class="vp-cast-panel-tips">
						<li>Pakai <b>Chrome</b> atau <b>Edge</b> di desktop/Android untuk Chromecast.</li>
						<li>Pakai <b>Safari</b> di iOS/macOS untuk AirPlay.</li>
						<li>Halaman harus diakses lewat <b>HTTPS</b>.</li>
					</ul>
				</div>
			{:else if vp.castIsCasting}
				<div class="vp-cast-panel-body">
					<p class="vp-cast-panel-msg">
						Sedang cast ke perangkat. Tutup tab atau klik tombol di bawah untuk menghentikan.
					</p>
					<button type="button" class="vp-cast-action vp-cast-action-stop" onclick={handleStop}>
						Hentikan Cast
					</button>
				</div>
			{:else if vp.castAvailable}
				<div class="vp-cast-panel-body">
					<p class="vp-cast-panel-msg">Klik tombol di bawah untuk membuka pemilih perangkat browser.</p>
					<button type="button" class="vp-cast-action" onclick={handlePick}>
						Pilih Perangkat
					</button>
				</div>
			{:else}
				<div class="vp-cast-panel-body">
					{#if vp.castScanning}
						<p class="vp-cast-panel-msg">Sedang mencari Chromecast / AirPlay di jaringan…</p>
					{:else}
						<p class="vp-cast-panel-msg">Belum ada perangkat ditemukan. Pastikan:</p>
						<ul class="vp-cast-panel-tips">
							<li>Chromecast / Apple TV menyala.</li>
							<li>Perangkat ini & TV di <b>WiFi yang sama</b>.</li>
							<li>VPN dimatikan (memblok mDNS discovery).</li>
						</ul>
					{/if}
					<button
						type="button"
						class="vp-cast-action vp-cast-action-secondary"
						onclick={(e) => {
							e.stopPropagation();
							vp.castStartScan();
						}}
					>
						{vp.castScanning ? 'Memindai…' : 'Pindai Ulang'}
					</button>
				</div>
			{/if}

			{#if vp.castError}
				<div class="vp-cast-panel-error">{vp.castError}</div>
			{/if}
		</div>
	{/if}
</div>
