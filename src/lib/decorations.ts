export type DecorationType = 'frame' | 'nametag' | 'effect';
export type NameTagStyle = 'aura' | 'glitch' | 'cosmic' | 'glitch-glasses' | 'blood-god' | 'royal';

export type NameTagConfig = {
	style?: NameTagStyle;
};

export type EffectConfig = {
	src?: string;
	blob?: string;
	loop?: boolean;
	duration?: number;
};

export type FrameConfig = {
	scale?: number;
	offsetX?: number;
	offsetY?: number;
	commentOffsetY?: number;
};

export type DecorationConfig = NameTagConfig & EffectConfig & FrameConfig;

export const FRAME_BASE_PATH = '/frame-border';
export const MAX_EQUIPPED_EFFECTS = 3;

export type EquippedDecoration = {
	id: number;
	name: string;
	type: DecorationType;
	asset: string | null;
	assetUrl: string | null;
	config: DecorationConfig;
} | null;

export type EquippedFrame = EquippedDecoration;
export type EquippedNameTag = EquippedDecoration;
export type EquippedEffect = NonNullable<EquippedDecoration>;

export type EquippedDecorations = {
	frame: EquippedFrame;
	nametag: EquippedNameTag;
	effects: EquippedEffect[];
};

export type DecorationItem = {
	id: number;
	name: string;
	type: DecorationType;
	asset: string | null;
	assetUrl: string | null;
	config: DecorationConfig;
	requiredLevel: number;
	priceExp: number;
	sortOrder: number;
};

export type ShopDecoration = DecorationItem & {
	isUnlocked: boolean;
	isOwned: boolean;
	isEquipped: boolean;
	unlockedAt: string | null;
};

export type OwnedDecoration = DecorationItem & {
	isEquipped: boolean;
	unlockedAt: string;
};

export function isAnimatedAsset(asset: string | undefined | null) {
	if (!asset) return false;
	return /\.(gif|webp)$/i.test(asset);
}

export function isRemoteFrameAsset(asset: string | undefined | null) {
	return Boolean(asset?.trim().toLowerCase().startsWith('https://'));
}

export function getFrameAssetUrl(
	frame:
		| {
				asset?: string | null;
				assetUrl?: string | null;
		  }
		| string
		| null
		| undefined
): string | null {
	const asset = typeof frame === 'string' ? frame : frame?.asset;
	const assetUrl = typeof frame === 'string' ? null : frame?.assetUrl;
	const cleanAsset = asset?.trim();
	const cleanAssetUrl = assetUrl?.trim();
	const badRemotePrefix = `${FRAME_BASE_PATH}/https://`;

	if (cleanAsset && isRemoteFrameAsset(cleanAsset)) return cleanAsset;
	if (cleanAssetUrl?.startsWith(badRemotePrefix))
		return cleanAssetUrl.slice(FRAME_BASE_PATH.length + 1);
	if (cleanAssetUrl) return cleanAssetUrl;
	if (!cleanAsset) return null;
	if (cleanAsset.startsWith('/')) return cleanAsset;

	return `${FRAME_BASE_PATH}/${cleanAsset}`;
}

export function getNameTagStyle(nametag: EquippedNameTag | undefined): NameTagStyle | null {
	const style = nametag?.config?.style;
	if (
		style === 'aura' ||
		style === 'glitch' ||
		style === 'cosmic' ||
		style === 'glitch-glasses' ||
		style === 'blood-god' ||
		style === 'royal'
	)
		return style;
	return null;
}

export function getNameTagClass(nametag: EquippedNameTag | undefined) {
	const style = getNameTagStyle(nametag);
	return style ? `nametag-${style}` : '';
}

export function getEffectSrc(
	effect: EquippedEffect | DecorationItem | null | undefined
): string | null {
	if (!effect) return null;
	if (effect.assetUrl) return effect.assetUrl;
	const cfg = effect.config as EffectConfig | undefined;
	return cfg?.src ?? null;
}

export function getEffectLoop(effect: EquippedEffect | DecorationItem | null | undefined): boolean {
	const cfg = effect?.config as EffectConfig | undefined;
	return Boolean(cfg?.loop);
}

export function getEffectDuration(
	effect: EquippedEffect | DecorationItem | null | undefined
): number | undefined {
	const cfg = effect?.config as EffectConfig | undefined;
	return typeof cfg?.duration === 'number' ? cfg.duration : undefined;
}

/**
 * Per-asset scale/offset overrides. Each frame PNG/GIF/WEBP ships with a
 * different amount of transparent padding, so a single hard-coded scale
 * cannot align all of them. The wrapper renders the frame centered via
 * translate(-50%, -50%); these values tune the visible ring relative to the
 * avatar underneath. Offsets are pixels applied on top of the centered
 * transform.
 *
 * Source of truth is the `config` JSON column on each Decoration row in the
 * database. The hardcoded map below stays only as a fallback for rows that
 * have not been migrated yet.
 */
export type FrameTweak = {
	scale: number;
	offsetX?: number;
	offsetY?: number;
	commentOffsetY?: number;
};

const DEFAULT_FRAME_TWEAK: FrameTweak = { scale: 1.24 };

const FRAME_TWEAKS_FALLBACK: Record<string, FrameTweak> = {
	'border1.png': { scale: 1.11, offsetY: 2 },
	'border2.gif': { scale: 1.4 },
	'border3.gif': { scale: 1.4 },
	'border4.webp': { scale: 1.65, offsetY: -1 },
	'border5.gif': { scale: 1.52, offsetY: -12, commentOffsetY: -4 },
	'border6.png': { scale: 1.3 },
	'border7.png': { scale: 1.95 },
	'border8.webp': { scale: 1.6, offsetY: -4, commentOffsetY: 1 },
	'border9.gif': { scale: 1.3, offsetY: -2 },
	'border10.gif': { scale: 1.25, offsetY: 0 }
};

function fallbackForAsset(asset: string | undefined | null): FrameTweak {
	if (!asset) return DEFAULT_FRAME_TWEAK;
	const key = asset.split('/').pop()?.toLowerCase() ?? asset.toLowerCase();
	return FRAME_TWEAKS_FALLBACK[key] ?? DEFAULT_FRAME_TWEAK;
}

type FrameTweakSource =
	| {
			asset?: string | null;
			config?: DecorationConfig | null;
	  }
	| null
	| undefined;

export function getFrameTweak(frame: FrameTweakSource): FrameTweak {
	const fallback = fallbackForAsset(frame?.asset);
	const cfg = (frame?.config ?? {}) as FrameConfig;

	const scale =
		typeof cfg.scale === 'number' && Number.isFinite(cfg.scale) ? cfg.scale : fallback.scale;
	const offsetX = typeof cfg.offsetX === 'number' ? cfg.offsetX : fallback.offsetX;
	const offsetY = typeof cfg.offsetY === 'number' ? cfg.offsetY : fallback.offsetY;
	const commentOffsetY =
		typeof cfg.commentOffsetY === 'number' ? cfg.commentOffsetY : fallback.commentOffsetY;

	return { scale, offsetX, offsetY, commentOffsetY };
}
