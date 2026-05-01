<script lang="ts">
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let { vp }: { vp: VideoPlayerState } = $props();
</script>

{#if vp.showSettings}
	<button
		type="button"
		class="vp-settings-mobile-backdrop"
		aria-label="Close settings"
		onclick={(e) => {
			e.stopPropagation();
			vp.closeAllMenus();
		}}
	></button>
	<div
		class="vp-settings-panel"
		role="dialog"
		aria-label="Settings"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="vp-settings-mobile-handle" aria-hidden="true"></div>
		{#if vp.settingsSubPanel === null}
			<div class="vp-settings-main">
				<button class="vp-settings-row" onclick={() => vp.toggleSettings('speed')}>
					<span class="vp-settings-row-label">
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							class="vp-settings-row-icon"
							aria-hidden="true"
							><path
								d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"
							/></svg
						>
						Speed
					</span>
					<span class="vp-settings-row-value">
						{vp.playbackRate === 1 ? 'Normal' : `${vp.playbackRate}x`}
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							class="vp-settings-row-chevron"
							aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
						>
					</span>
				</button>

				{#if vp.qualityLevels.length > 0}
					<button class="vp-settings-row" onclick={() => vp.toggleSettings('quality')}>
						<span class="vp-settings-row-label">
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								class="vp-settings-row-icon"
								aria-hidden="true"
								><path
									d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12zm-10-9H8v2H6v2h2v2h3v-2h2v-2h-2z"
								/></svg
							>
							Quality
						</span>
						<span class="vp-settings-row-value">
							{vp.currentQualityLabel()}
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								class="vp-settings-row-chevron"
								aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
							>
						</span>
					</button>
				{/if}

				{#if vp.allSubtitles.length > 0}
					<button class="vp-settings-row" onclick={() => vp.toggleSettings('subtitle')}>
						<span class="vp-settings-row-label">
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								class="vp-settings-row-icon"
								aria-hidden="true"
								><path
									d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"
								/></svg
							>
							Subtitle
						</span>
						<span class="vp-settings-row-value">
							{vp.activeSubtitleIndex === -1
								? 'Off'
								: (vp.allSubtitles[vp.activeSubtitleIndex]?.label ?? 'On')}
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								class="vp-settings-row-chevron"
								aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
							>
						</span>
					</button>
				{/if}

				<button class="vp-settings-row" onclick={vp.toggleStats}>
					<span class="vp-settings-row-label">
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							class="vp-settings-row-icon"
							aria-hidden="true"
							><path
								d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 10h2v2H7v-2zm0-4h2v2H7v-2zm0-4h2v2H7V7zm4 8h6v2h-6v-2zm0-4h6v2h-6v-2zm0-4h6v2h-6V7z"
							/></svg
						>
						Stats
					</span>
					<span class="vp-settings-row-value">
						{vp.statsVisible ? 'On' : 'Off'}
					</span>
				</button>

				<button class="vp-settings-row" onclick={() => vp.toggleSettings('sleep')}>
					<span class="vp-settings-row-label">
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							class="vp-settings-row-icon"
							aria-hidden="true"
							><path
								d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2zm1 5h-2v6l5 3 .95-1.64L13 12.01V7z"
							/></svg
						>
						Timer tidur
					</span>
					<span class="vp-settings-row-value">
						{vp.sleepTimerActive ? vp.sleepTimerCountdown : 'Off'}
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							class="vp-settings-row-chevron"
							aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg
						>
					</span>
				</button>
			</div>
		{:else}
			<div class="vp-settings-subpanel">
				<button class="vp-settings-back" onclick={() => (vp.settingsSubPanel = null)}>
					<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
						><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg
					>
					{vp.settingsSubPanel === 'speed'
						? 'Speed'
						: vp.settingsSubPanel === 'quality'
							? 'Quality'
							: vp.settingsSubPanel === 'subtitle'
								? 'Subtitle'
								: 'Timer tidur'}
				</button>

				<div class="vp-settings-list">
					{#if vp.settingsSubPanel === 'speed'}
						{#each vp.RATES as rate}
							<button
								class="vp-settings-item"
								class:vp-settings-item-active={vp.playbackRate === rate}
								onclick={() => {
									vp.setPlaybackRate(rate);
									vp.settingsSubPanel = null;
								}}
							>
								{@render Check(vp.playbackRate === rate)}
								{rate === 1 ? 'Normal' : `${rate}x`}
							</button>
						{/each}
					{:else if vp.settingsSubPanel === 'quality'}
						<button
							class="vp-settings-item"
							class:vp-settings-item-active={vp.currentQuality === -1}
							onclick={() => {
								vp.setQuality(-1);
								vp.settingsSubPanel = null;
							}}
						>
							{@render Check(vp.currentQuality === -1)}
							Auto
						</button>
						{#each vp.qualityLevels as q}
							<button
								class="vp-settings-item"
								class:vp-settings-item-active={vp.currentQuality === q.level}
								onclick={() => {
									vp.setQuality(q.level);
									vp.settingsSubPanel = null;
								}}
							>
								{@render Check(vp.currentQuality === q.level)}
								{q.height}p
								{#if q.bitrate}
									<span class="vp-settings-item-sub">{Math.round(q.bitrate / 1000)}k</span>
								{/if}
							</button>
						{/each}
					{:else if vp.settingsSubPanel === 'subtitle'}
						<button
							class="vp-settings-item"
							class:vp-settings-item-active={vp.activeSubtitleIndex === -1}
							onclick={() => {
								vp.applySubtitle(-1);
								vp.settingsSubPanel = null;
							}}
						>
							{@render Check(vp.activeSubtitleIndex === -1)}
							Off
						</button>
						{#each vp.allSubtitles as track, i}
							<button
								class="vp-settings-item"
								class:vp-settings-item-active={vp.activeSubtitleIndex === i}
								onclick={() => {
									vp.applySubtitle(i);
									vp.settingsSubPanel = null;
								}}
							>
								{@render Check(vp.activeSubtitleIndex === i)}
								{track.label}
							</button>
						{/each}
					{:else if vp.settingsSubPanel === 'sleep'}
						{#if vp.sleepTimerActive}
							<button
								class="vp-settings-item"
								onclick={() => {
									vp.cancelSleepTimer();
									vp.settingsSubPanel = null;
								}}
							>
								{@render Check(false)}
								Off
							</button>
						{/if}
						{#each vp.sleepTimerOptions as item}
							<button
								class="vp-settings-item"
								class:vp-settings-item-active={vp.sleepTimerOption === item.value}
								onclick={() => {
									vp.toggleSleepTimer(item.value);
									vp.settingsSubPanel = null;
								}}
							>
								{@render Check(vp.sleepTimerOption === item.value)}
								{item.label}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

{#snippet Check(active: boolean)}
	{#if active}
		<svg viewBox="0 0 24 24" fill="currentColor" class="vp-settings-check" aria-hidden="true">
			<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
		</svg>
	{:else}
		<span class="vp-settings-check-placeholder"></span>
	{/if}
{/snippet}
