<script lang="ts">
	import AppIcon from '$lib/components/AppIcon.svelte';
	import type { createVideoPlayerState } from '../stores/vpstate.svelte';
	import type { PlayerEpisodeList } from '../stores/types';
	import AudioWaveform from './AudioWaveform.svelte';
	import SettingsPanel from './SettingsPanel.svelte';

	type VideoPlayerState = ReturnType<typeof createVideoPlayerState>;

	let {
		vp,
		seekbarEl = $bindable(),
		episodeList,
		showEpisodeDrawer = false,
		onToggleEpisodeDrawer
	}: {
		vp: VideoPlayerState;
		seekbarEl?: HTMLInputElement;
		episodeList?: PlayerEpisodeList;
		showEpisodeDrawer?: boolean;
		onToggleEpisodeDrawer?: () => void;
	} = $props();

	const hasEpisodeList = $derived(
		!!episodeList &&
			((episodeList.episodes?.length ?? 0) > 0 ||
				(episodeList.seasons?.some((s) => s.episodes.length > 0) ?? false))
	);
	const showEpisodeButton = $derived(vp.isFullscreen && hasEpisodeList);
	const subtitleQuickLabel = $derived(getSubtitleQuickLabel());

	function getSubtitleQuickLabel() {
		if (vp.activeSubtitleIndex === -1) return 'OFF';
		const track = vp.allSubtitles[vp.activeSubtitleIndex];
		const label = (track?.lang || track?.label || 'SUB').trim();
		return label.slice(0, 3).toUpperCase();
	}

	function cycleSubtitleQuickSwitch() {
		if (vp.allSubtitles.length === 0) return;
		const nextIndex =
			vp.activeSubtitleIndex === -1
				? 0
				: vp.activeSubtitleIndex >= vp.allSubtitles.length - 1
					? -1
					: vp.activeSubtitleIndex + 1;
		vp.applySubtitle(nextIndex);
	}
</script>

{#if vp.controlsCfg.enabled !== false}
	<button
		type="button"
		class="vp-btn vp-lock-float"
		class:vp-lock-float-visible={vp.showControls || !vp.isPlaying || vp.showSettings}
		class:vp-lock-btn-active={vp.controlsLocked}
		onclick={(e) => {
			e.stopPropagation();
			vp.toggleControlsLock();
		}}
		aria-label={vp.controlsLocked ? 'Unlock controls' : 'Lock controls'}
		aria-pressed={vp.controlsLocked}
	>
		<AppIcon name={vp.controlsLocked ? 'lock' : 'lock_open'} />
	</button>

	{#if !vp.controlsLocked}
	<div
		class="vp-controls-wrapper vp-controls-{vp.controlsCfg.position ?? 'bottom'}"
		class:vp-controls-has-settings={vp.showSettings}
		class:vp-controls-visible={vp.showControls || !vp.isPlaying || vp.showSettings}
	>
		<div class="vp-gradient" aria-hidden="true"></div>

		{#if vp.controlsCfg.showThumbnailPreview !== false && vp.hovering && vp.previewCue && vp.thumbnailCues.length > 0}
			<div class="vp-thumb-preview" style="left: {vp.previewX}px; bottom: 68px;" aria-hidden="true">
				<div
					class="vp-thumb-img"
					style="
					width: {vp.PREVIEW_WIDTH}px;
					height: {vp.PREVIEW_HEIGHT}px;
					background-image: url('{vp.previewCue.url}');
					background-position: -{vp.previewCue.x}px -{vp.previewCue.y}px;
					background-size: auto;
				"
				></div>
				<span class="vp-thumb-time">{vp.formatTime(vp.hoverTime)}</span>
			</div>
		{/if}

		<div class="vp-controls">
			{#if vp.controlsCfg.showSeek !== false}
				<div class="vp-seekbar-row">
					<div class="vp-seekbar-track">
						<AudioWaveform {vp} />
						<div class="vp-seekbar-buffered" style="width: {vp.bufferedPercent}%"></div>
						<div class="vp-seekbar-progress" style="width: {vp.seekPercent}%"></div>
						<div class="vp-seekbar-thumb" style="left: {vp.seekPercent}%"></div>
						{#if vp.hovering && !vp.previewCue}
							<div
								class="vp-seek-tooltip"
								style="left: {vp.clamp(
									vp.hoverX,
									20,
									(seekbarEl?.getBoundingClientRect().width ?? 100) - 20
								)}px"
							>
								{vp.formatTime(vp.hoverTime)}
							</div>
						{/if}
						<input
							bind:this={seekbarEl}
							type="range"
							class="vp-seekbar-range"
							min="0"
							max={vp.duration || 100}
							step="0.1"
							value={vp.currentTime}
							oninput={(e) => {
								if (vp.controlsLocked) return;
								vp.onSeekbarInput();
								vp.seek(parseFloat((e.target as HTMLInputElement).value));
							}}
							onpointerdown={vp.onSeekbarPointerDown}
							onpointerup={vp.onSeekbarPointerRelease}
							onpointercancel={vp.onSeekbarPointerRelease}
							onlostpointercapture={vp.onSeekbarPointerRelease}
							onblur={vp.onSeekbarPointerRelease}
							onmousemove={vp.onSeekbarMouseMove}
							onmouseleave={vp.onSeekbarMouseLeave}
							disabled={vp.controlsLocked}
							aria-label="Seek"
							aria-valuetext={vp.formatTime(vp.currentTime)}
						/>
					</div>
				</div>
			{/if}

			<div class="vp-bottom-row">
				<div class="vp-left-controls">
					{#if vp.controlsCfg.showPlay !== false}
						<button
							class="vp-btn"
							onclick={vp.togglePlay}
							aria-label={vp.isPlaying ? 'Pause' : 'Play'}
						>
							{#if vp.isPlaying}
								<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<rect x="6" y="4" width="4" height="16" rx="1" />
									<rect x="14" y="4" width="4" height="16" rx="1" />
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<polygon points="5,3 19,12 5,21" />
								</svg>
							{/if}
						</button>
					{/if}

					{#if vp.controlsCfg.showSkip !== false}
						<button
							class="vp-btn"
							onclick={vp.skipBackward}
							disabled={vp.controlsLocked}
							aria-label="Rewind"
						>
							<AppIcon name="replay_10" />
						</button>

						<button
							class="vp-btn"
							onclick={vp.skipForward}
							disabled={vp.controlsLocked}
							aria-label="Skip forward"
						>
							<AppIcon name="forward_10" />
						</button>
					{/if}

					{#if vp.controlsCfg.showVolume !== false}
						{@render VolumeControl(vp)}
					{/if}

					{#if vp.controlsCfg.showTime !== false}
						<span class="vp-time" aria-label="Current time">
							{vp.formatTime(vp.currentTime)} / {vp.formatTime(vp.duration)}
						</span>
					{/if}
				</div>

				<div class="vp-right-controls">
					{#if vp.isFullscreen && vp.qualityLevels.length > 0 && vp.controlsCfg.showSettings !== false}
						<button
							type="button"
							class="vp-quality-trigger"
							class:vp-quality-trigger-active={vp.showSettings && vp.settingsSubPanel === 'quality'}
							onclick={(e) => {
								e.stopPropagation();
								vp.openShortcutPanel('quality');
							}}
							aria-label="Pilih resolusi"
							aria-expanded={vp.showSettings && vp.settingsSubPanel === 'quality'}
						>
							<AppIcon name="hd" />
							{vp.currentResolutionLabel()}
						</button>
					{/if}

					{#if vp.isFullscreen && vp.allSubtitles.length > 0}
						<button
							type="button"
							class="vp-subtitle-trigger"
							class:vp-subtitle-trigger-active={vp.activeSubtitleIndex !== -1}
							onclick={(e) => {
								e.stopPropagation();
								cycleSubtitleQuickSwitch();
							}}
							aria-label="Ganti subtitle"
						>
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M4 5h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm0 2v10h16V7H4zm2 4c0-1.1.9-2 2-2h3v2H8v2h3v2H8c-1.1 0-2-.9-2-2v-2zm7 0c0-1.1.9-2 2-2h3v2h-3v2h3v2h-3c-1.1 0-2-.9-2-2v-2z"
								/>
							</svg>
							{subtitleQuickLabel}
						</button>
					{/if}

					{#if showEpisodeButton}
						<button
							type="button"
							class="vp-ep-trigger"
							class:vp-ep-trigger-active={showEpisodeDrawer}
							onclick={(e) => {
								e.stopPropagation();
								onToggleEpisodeDrawer?.();
							}}
							aria-label="Daftar episode"
							aria-expanded={showEpisodeDrawer}
						>
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
								<path
									d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z"
								/>
							</svg>
							{#if episodeList?.currentNumber !== undefined}
								<span class="vp-ep-trigger-num">Ep {episodeList.currentNumber}</span>
							{:else}
								<span class="vp-ep-trigger-num">Episode</span>
							{/if}
						</button>
					{/if}

					{#if vp.controlsCfg.showSourceBadge !== false && vp.srcList.length > 1}
						<span
							class="vp-src-badge"
							title="Source {vp.currentSrcIndex + 1} of {vp.srcList.length}"
						>
							S{vp.currentSrcIndex + 1}/{vp.srcList.length}
						</span>
					{/if}

					{#if vp.controlsCfg.showSettings !== false}
						<div class="vp-settings-wrap">
							<button
								class="vp-btn vp-settings-btn"
								class:vp-settings-btn-active={vp.showSettings}
								onclick={(e) => {
									e.stopPropagation();
									vp.toggleSettings();
								}}
								aria-label="Settings"
								aria-expanded={vp.showSettings}
							>
								<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path
										d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
									/>
								</svg>
							</button>
							<SettingsPanel {vp} />
						</div>
					{/if}

					{#if vp.controlsCfg.showFullscreen !== false}
						<button
							class="vp-btn"
							onclick={vp.toggleFullscreen}
							aria-label={vp.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
						>
							{#if vp.isFullscreen}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M8 3v3a2 2 0 0 1-2 2H3" />
									<path d="M21 8h-3a2 2 0 0 1-2-2V3" />
									<path d="M3 16h3a2 2 0 0 1 2 2v3" />
									<path d="M16 21v-3a2 2 0 0 1 2-2h3" />
								</svg>
							{:else}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M8 3H5a2 2 0 0 0-2 2v3" />
									<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
									<path d="M3 16v3a2 2 0 0 0 2 2h3" />
									<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
	{/if}
{/if}

{#snippet VolumeControl(vp: VideoPlayerState)}
	<div class="vp-volume-group">
		<button
			class="vp-btn"
			onclick={vp.toggleMute}
			disabled={vp.controlsLocked}
			aria-label={vp.isMuted || vp.volume === 0 ? 'Unmute' : 'Mute'}
		>
			{#if vp.isMuted || vp.volume === 0}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<line x1="23" y1="9" x2="17" y2="15" />
					<line x1="17" y1="9" x2="23" y2="15" />
				</svg>
			{:else if vp.volume < 0.5}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				</svg>
			{:else}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
					<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				</svg>
			{/if}
		</button>

		<div class="vp-volume-slider-wrap">
			<div class="vp-vol-track">
				<div class="vp-vol-fill" style="width: {vp.volumePercent}%"></div>
				<input
					type="range"
					class="vp-vol-range"
					min="0"
					max="1"
					step="0.01"
					value={vp.isMuted ? 0 : vp.volume}
					oninput={(e) => {
						if (vp.controlsLocked) return;
						vp.setVolume(parseFloat((e.target as HTMLInputElement).value));
					}}
					disabled={vp.controlsLocked}
					aria-label="Volume"
				/>
			</div>
		</div>
	</div>
{/snippet}
