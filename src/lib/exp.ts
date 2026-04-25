export type ExpBadge = {
	name: string;
	color: string;
};

export type LevelProgress = {
	currentLevelExp: number;
	nextLevelExp: number;
	progress: number;
	remainingExp: number;
};

export function calculateLevel(exp: number) {
	return Math.max(1, Math.floor(Math.sqrt(Math.max(0, exp) / 100)));
}

export function getCultivationBadge(level: number): ExpBadge {
	if (level >= 99) {
		return {
			name: 'God Immortal',
			color: 'linear-gradient(135deg, #fde68a, #f472b6, #a78bfa, #38bdf8)'
		};
	}
	if (level >= 91) {
		return {
			name: 'Ascendant Immortal',
			color: 'linear-gradient(135deg, #e9d5ff, #a78bfa, #22d3ee)'
		};
	}
	if (level >= 71) {
		return {
			name: 'Dao Integration',
			color: 'linear-gradient(135deg, #67e8f9, #60a5fa, #818cf8)'
		};
	}
	if (level >= 51) {
		return {
			name: 'Void Refinement',
			color: 'linear-gradient(135deg, #c084fc, #6366f1, #0f172a)'
		};
	}
	if (level >= 36) {
		return {
			name: 'Soul Transformation',
			color: 'linear-gradient(135deg, #fb7185, #f97316, #facc15)'
		};
	}
	if (level >= 21) {
		return {
			name: 'Nascent Soul',
			color: 'linear-gradient(135deg, #34d399, #14b8a6, #0ea5e9)'
		};
	}
	if (level >= 11) {
		return {
			name: 'Core Formation',
			color: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)'
		};
	}
	if (level >= 6) {
		return {
			name: 'Foundation Establishment',
			color: 'linear-gradient(135deg, #8b5cf6, #6366f1, #22d3ee)'
		};
	}
	return {
		name: 'Qi Condensation',
		color: 'linear-gradient(135deg, #a78bfa, #7c3aed, #4f46e5)'
	};
}

export function getLevelProgress(exp: number, level = calculateLevel(exp)): LevelProgress {
	const currentLevelExp = level <= 1 ? 0 : level ** 2 * 100;
	const nextLevelExp = (level + 1) ** 2 * 100;
	const span = Math.max(1, nextLevelExp - currentLevelExp);
	const progress = Math.min(100, Math.max(0, ((exp - currentLevelExp) / span) * 100));

	return {
		currentLevelExp,
		nextLevelExp,
		progress,
		remainingExp: Math.max(0, nextLevelExp - exp)
	};
}
