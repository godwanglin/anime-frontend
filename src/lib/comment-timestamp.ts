const LEADING_TIMESTAMP_RE = /^\s*@?(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\s*/;

export type ParsedCommentTimestamp = {
	seconds: number | null;
	label: string | null;
	text: string;
};

export function formatCommentTimestamp(seconds: number) {
	const safe = Math.max(0, Math.floor(Number(seconds) || 0));
	const h = Math.floor(safe / 3600);
	const m = Math.floor((safe % 3600) / 60);
	const s = safe % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseCommentTimestamp(content: string | null | undefined): ParsedCommentTimestamp {
	const value = content ?? '';
	const match = value.match(LEADING_TIMESTAMP_RE);
	if (!match) {
		return { seconds: null, label: null, text: value };
	}

	const first = Number(match[1]);
	const second = Number(match[2]);
	const third = match[3] === undefined ? null : Number(match[3]);
	const seconds = third === null ? first * 60 + second : first * 3600 + second * 60 + third;
	return {
		seconds,
		label: formatCommentTimestamp(seconds),
		text: value.slice(match[0].length).trimStart()
	};
}

export function withCommentTimestamp(content: string, seconds: number | null | undefined) {
	const trimmed = content.trim();
	if (!trimmed) return '';
	if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 1) {
		return trimmed;
	}
	const parsed = parseCommentTimestamp(trimmed);
	const body = parsed.seconds !== null ? parsed.text : trimmed;
	return `@${formatCommentTimestamp(seconds)} ${body}`.trim();
}
