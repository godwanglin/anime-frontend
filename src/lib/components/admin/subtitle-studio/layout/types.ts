/** Zones: left/right = sidebars, center = video, bottom = timeline */
export type ZoneId = 'left' | 'center' | 'right' | 'bottom';

/** Individual sidebar section IDs — each can be in left or right zone independently */
export type SectionId = 'track' | 'source' | 'import' | 'cue';

/** Layout direction for a zone */
export type ZoneDir = 'column' | 'row';

/** Each zone holds an ordered list of sections */
export type ZoneAssignment = {
	left: SectionId[];
	right: SectionId[];
};

/** Pixel sizes for resizable zones */
export type LayoutSizes = {
	leftWidth: number;
	rightWidth: number;
	bottomHeight: number;
};

/** Which optional zones are shown */
export type LayoutVisible = {
	left: boolean;
	right: boolean;
};

export type LayoutState = {
	sizes: LayoutSizes;
	visible: LayoutVisible;
	zones: ZoneAssignment;
	/** flex-direction for each zone — 'column' stacks vertically, 'row' side-by-side */
	zoneDir: { left: ZoneDir; right: ZoneDir };
	/** Per-section flex-grow ratio for proportional sizing within a zone */
	sectionFlex: Partial<Record<SectionId, number>>;
	/** Per-section collapsed state */
	sectionCollapsed: Partial<Record<SectionId, boolean>>;
};
