const QUALITY_LADDER = [1080, 720, 540, 480, 360, 240, 144] as const;

export function normalizedQualityHeight(height: number) {
	if (!Number.isFinite(height) || height <= 0) return 0;

	for (let i = QUALITY_LADDER.length - 1; i >= 0; i -= 1) {
		const candidate = QUALITY_LADDER[i];
		if (height <= candidate) return candidate;
	}

	return QUALITY_LADDER[0];
}

export function qualityLabel(height: number) {
	const normalized = normalizedQualityHeight(height);
	return normalized ? `${normalized}p` : 'Auto';
}
