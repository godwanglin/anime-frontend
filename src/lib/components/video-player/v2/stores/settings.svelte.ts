import type { SettingsSubPanel } from './types';

export function createSettingsManager() {
	let showRateMenu = $state(false);
	let showQualityMenu = $state(false);
	let showSubtitleMenu = $state(false);
	let showSettings = $state(false);
	let settingsSubPanel = $state<SettingsSubPanel>(null);
	let closeOnSelect = $state(false);

	function toggleSettings(sub: SettingsSubPanel = null) {
		closeOnSelect = false;
		if (sub === null) {
			showSettings = !showSettings;
			if (!showSettings) settingsSubPanel = null;
		} else {
			showSettings = true;
			settingsSubPanel = settingsSubPanel === sub ? null : sub;
		}
	}

	function openShortcutPanel(sub: SettingsSubPanel) {
		showSettings = true;
		settingsSubPanel = sub;
		closeOnSelect = true;
	}

	function finishSelection() {
		if (closeOnSelect) {
			closeAllMenus();
			return;
		}

		settingsSubPanel = null;
	}

	function closeAllMenus() {
		showSettings = false;
		settingsSubPanel = null;
		closeOnSelect = false;
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
		openShortcutPanel,
		finishSelection,
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
