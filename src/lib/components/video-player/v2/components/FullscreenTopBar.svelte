<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp, title }: { vp: VideoPlayerState; title: string } = $props();

	const showBack = $derived(vp.fullscreenCfg.showBackButton !== false);
	const showTitle = $derived(vp.fullscreenCfg.showTitle !== false);
	const visible = $derived(!vp.controlsLocked && (vp.showControls || !vp.isPlaying));

	let batteryLevel = $state<number | null>(null);
	let batteryCharging = $state(false);
	let batterySupported = $state(false);

	$effect(() => {
		if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return;

		let battery: BatteryManager | null = null;

		const onLevelChange = () => { if (battery) batteryLevel = battery.level; };
		const onChargingChange = () => { if (battery) batteryCharging = battery.charging; };

		(navigator as Navigator & { getBattery(): Promise<BatteryManager> })
			.getBattery()
			.then((bat) => {
				battery = bat;
				batterySupported = true;
				batteryLevel = bat.level;
				batteryCharging = bat.charging;
				bat.addEventListener('levelchange', onLevelChange);
				bat.addEventListener('chargingchange', onChargingChange);
			})
			.catch(() => {});

		return () => {
			if (battery) {
				battery.removeEventListener('levelchange', onLevelChange);
				battery.removeEventListener('chargingchange', onChargingChange);
			}
		};
	});

	let currentTime = $state('');

	$effect(() => {
		function tick() {
			const now = new Date();
			const h = now.getHours().toString().padStart(2, '0');
			const m = now.getMinutes().toString().padStart(2, '0');
			currentTime = `${h}:${m}`;
		}
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	const batteryPercent = $derived(batteryLevel !== null ? Math.round(batteryLevel * 100) : null);
	const batteryColor = $derived(
		batteryCharging
			? '#4ade80'
			: batteryPercent !== null && batteryPercent <= 20
				? '#f87171'
				: batteryPercent !== null && batteryPercent <= 40
					? '#fbbf24'
					: 'white'
	);
</script>

{#if vp.isFullscreen && visible && vp.fullscreenCfg.showTopBar !== false && (showBack || showTitle)}
	<div class="vp-fullscreen-topbar">
		<div class="vp-fullscreen-topbar-left">
			{#if showBack}
				<button class="vp-fullscreen-back" onclick={vp.toggleFullscreen} aria-label="Exit fullscreen">
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
					</svg>
				</button>
			{/if}
			{#if showTitle}
				<span class="vp-fullscreen-title">{title}</span>
			{/if}
		</div>

		<div class="vp-topbar-right">
			{#if currentTime}
				<span class="vp-clock" aria-label="Jam {currentTime}">{currentTime}</span>
			{/if}

			{#if batterySupported && batteryPercent !== null}
			<div class="vp-battery" aria-label="Baterai {batteryPercent}%{batteryCharging ? ', sedang mengisi daya' : ''}" style:color={batteryColor}>
				{#if batteryCharging}
					<svg class="vp-battery-bolt" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M7 2v11h3v9l7-12h-4l4-8z" />
					</svg>
				{/if}
				<svg class="vp-battery-icon" viewBox="0 0 24 24" aria-hidden="true">
					<rect x="1" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
					<rect x="19" y="9.5" width="2.5" height="5" rx="1" fill="currentColor" opacity="0.6" />
					<rect
						x="2.5"
						y="7.5"
						width={Math.round((batteryPercent / 100) * 15)}
						height="9"
						rx="1"
						fill="currentColor"
					/>
				</svg>
				<span class="vp-battery-label">{batteryPercent}%</span>
			</div>
		{/if}
		</div>
	</div>
{/if}

<style>
	.vp-fullscreen-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.vp-fullscreen-topbar-left {
		display: flex;
		align-items: center;
		gap: 0;
		min-width: 0;
		flex: 1;
	}

	.vp-battery {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 600;
		opacity: 0.9;
		transition: color 0.3s ease;
	}

	.vp-battery-icon {
		width: 26px;
		height: 14px;
	}

	.vp-battery-bolt {
		width: 12px;
		height: 12px;
	}

	.vp-battery-label {
		letter-spacing: 0.02em;
	}

	.vp-topbar-right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.vp-clock {
		font-size: 13px;
		font-weight: 600;
		color: white;
		opacity: 0.9;
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
	}
</style>
