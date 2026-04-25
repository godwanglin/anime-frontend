import type { LayoutState, LayoutSizes, SectionId, ZoneDir } from './types';

const STORAGE_KEY = 'sst-layout-v3';

export const DEFAULT: LayoutState = {
	sizes: { leftWidth: 280, rightWidth: 340, bottomHeight: 240 },
	visible: { left: false, right: true },
	zones: { left: [], right: ['track', 'source', 'import', 'cue'] },
	zoneDir: { left: 'column', right: 'column' },
	sectionFlex: {},
	sectionCollapsed: {}
};

export const LIMITS: Record<keyof LayoutSizes, { min: number; max: number }> = {
	leftWidth: { min: 280, max: 560 },
	rightWidth: { min: 280, max: 620 },
	bottomHeight: { min: 140, max: 540 }
};

const ALL_SECTIONS: SectionId[] = ['track', 'source', 'import', 'cue'];
const VALID = new Set(ALL_SECTIONS);
const VALID_DIRS = new Set<ZoneDir>(['column', 'row']);

export function clampSize(key: keyof LayoutSizes, value: number): number {
	const { min, max } = LIMITS[key];
	return Math.max(min, Math.min(max, Math.round(value)));
}

export function load(): LayoutState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return structuredClone(DEFAULT);
		return validate(JSON.parse(raw) as Partial<LayoutState>);
	} catch {
		return structuredClone(DEFAULT);
	}
}

export function save(state: LayoutState): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		/* storage unavailable */
	}
}

function toSectionArray(raw: unknown): SectionId[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((x): x is SectionId => typeof x === 'string' && VALID.has(x as SectionId));
}

function toZoneDir(raw: unknown): ZoneDir {
	return VALID_DIRS.has(raw as ZoneDir) ? (raw as ZoneDir) : 'column';
}

export function validate(raw: Partial<LayoutState>): LayoutState {
	const def = structuredClone(DEFAULT);

	const seen = new Set<SectionId>();
	const left: SectionId[] = [];
	const right: SectionId[] = [];

	for (const id of toSectionArray(raw.zones?.left)) {
		if (!seen.has(id)) { left.push(id); seen.add(id); }
	}
	for (const id of toSectionArray(raw.zones?.right)) {
		if (!seen.has(id)) { right.push(id); seen.add(id); }
	}
	for (const id of ALL_SECTIONS) {
		if (!seen.has(id)) right.push(id);
	}

	const sectionFlex: Partial<Record<SectionId, number>> = {};
	if (raw.sectionFlex && typeof raw.sectionFlex === 'object') {
		for (const id of ALL_SECTIONS) {
			const v = (raw.sectionFlex as Record<string, unknown>)[id];
			if (typeof v === 'number' && v > 0) sectionFlex[id] = v;
		}
	}

	const sectionCollapsed: Partial<Record<SectionId, boolean>> = {};
	if (raw.sectionCollapsed && typeof raw.sectionCollapsed === 'object') {
		for (const id of ALL_SECTIONS) {
			const v = (raw.sectionCollapsed as Record<string, unknown>)[id];
			if (typeof v === 'boolean') sectionCollapsed[id] = v;
		}
	}

	return {
		sizes: {
			leftWidth: clampSize('leftWidth', Number(raw.sizes?.leftWidth) || def.sizes.leftWidth),
			rightWidth: clampSize('rightWidth', Number(raw.sizes?.rightWidth) || def.sizes.rightWidth),
			bottomHeight: clampSize('bottomHeight', Number(raw.sizes?.bottomHeight) || def.sizes.bottomHeight)
		},
		visible: {
			left: typeof raw.visible?.left === 'boolean' ? raw.visible.left : def.visible.left,
			right: typeof raw.visible?.right === 'boolean' ? raw.visible.right : def.visible.right
		},
		zones: { left, right },
		zoneDir: {
			left: toZoneDir(raw.zoneDir?.left),
			right: toZoneDir(raw.zoneDir?.right)
		},
		sectionFlex,
		sectionCollapsed
	};
}
