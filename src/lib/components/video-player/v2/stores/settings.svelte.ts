import type { SettingsSubPanel } from './types';

export function createSettingsManager() {
	let showRateMenu = $state(false);
	let showQualityMenu = $state(false);
	let showSubtitleMenu = $state(false);
	let showSettings = $state(false);
	let settingsSubPanel = $state<SettingsSubPanel>(null);

	function toggleSettings(sub: SettingsSubPanel = null) {
		if (sub === null) {
			showSettings = !showSettings;
			if (!showSettings) settingsSubPanel = null;
		} else {
			showSettings = true;
			settingsSubPanel = settingsSubPanel === sub ? null : sub;
		}
	}

	function closeAllMenus() {
		showSettings = false;
		settingsSubPanel = null;
		showRateMenu = false;
		showQualityMenu = false;
		showSubtitleMenu = false;
	}

	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (
			!target.closest('.vp-settings-panel') &&
			!target.closest('.vp-settings-btn') &&
			!target.closest('.vp-settings-wrap')
		) {
			closeAllMenus();
		}
	}

	return {
		toggleSettings,
		closeAllMenus,
		onDocClick,
		get showSettings() {
			return showSettings;
		},
		get settingsSubPanel() {
			return settingsSubPanel;
		},
		set settingsSubPanel(value: SettingsSubPanel) {
			settingsSubPanel = value;
		}
	};
}
