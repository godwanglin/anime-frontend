import { load, save, clampSize, DEFAULT } from './engine';
import type { LayoutState, LayoutSizes, SectionId, ZoneDir } from './types';

function createLayoutStore() {
	let s = $state<LayoutState>(load());
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function flush() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => save(s), 350);
	}

	return {
		get sizes() { return s.sizes; },
		get visible() { return s.visible; },
		get zones() { return s.zones; },
		get zoneDir() { return s.zoneDir; },
		get sectionFlex() { return s.sectionFlex; },
		get sectionCollapsed() { return s.sectionCollapsed; },

		resizeLeft(px: number) {
			s = { ...s, sizes: { ...s.sizes, leftWidth: clampSize('leftWidth', px) } };
			flush();
		},
		resizeRight(px: number) {
			s = { ...s, sizes: { ...s.sizes, rightWidth: clampSize('rightWidth', px) } };
			flush();
		},
		resizeBottom(px: number) {
			s = { ...s, sizes: { ...s.sizes, bottomHeight: clampSize('bottomHeight', px) } };
			flush();
		},

		toggleLeft() {
			s = { ...s, visible: { ...s.visible, left: !s.visible.left } };
			flush();
		},
		toggleRight() {
			s = { ...s, visible: { ...s.visible, right: !s.visible.right } };
			flush();
		},

		toggleSection(id: SectionId) {
			s = { ...s, sectionCollapsed: { ...s.sectionCollapsed, [id]: !(s.sectionCollapsed[id] ?? false) } };
			flush();
		},

		setZoneDir(zone: 'left' | 'right', dir: ZoneDir) {
			s = { ...s, zoneDir: { ...s.zoneDir, [zone]: dir } };
			flush();
		},

		resizeSections(idA: SectionId, flexA: number, idB: SectionId, flexB: number) {
			s = {
				...s,
				sectionFlex: {
					...s.sectionFlex,
					[idA]: Math.max(0.1, flexA),
					[idB]: Math.max(0.1, flexB)
				}
			};
			flush();
		},

		/**
		 * Move/reorder a section.
		 * insertBefore=null → append to end of targetZone.
		 * Auto-shows target zone; auto-hides source zone if empty.
		 */
		reorder(id: SectionId, targetZone: 'left' | 'right', insertBefore: SectionId | null) {
			const newLeft = s.zones.left.filter(x => x !== id);
			const newRight = s.zones.right.filter(x => x !== id);
			const target = targetZone === 'left' ? newLeft : newRight;

			if (insertBefore !== null) {
				const idx = target.indexOf(insertBefore);
				if (idx >= 0) target.splice(idx, 0, id);
				else target.push(id);
			} else {
				target.push(id);
			}

			s = {
				...s,
				zones: { left: newLeft, right: newRight },
				visible: {
					left: newLeft.length > 0 ? (targetZone === 'left' ? true : s.visible.left) : false,
					right: newRight.length > 0 ? (targetZone === 'right' ? true : s.visible.right) : false
				}
			};
			flush();
		},

		/** Legacy moveTo — append to end of zone */
		moveTo(id: SectionId, zone: 'left' | 'right') {
			this.reorder(id, zone, null);
		},

		reset() {
			s = structuredClone(DEFAULT);
			save(s);
		}
	};
}

export const layout = createLayoutStore();
