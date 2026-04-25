export function formatTime(secs: number): string {
	if (!isFinite(secs) || isNaN(secs)) return '0:00';
	const h = Math.floor(secs / 3600);
	const m = Math.floor((secs % 3600) / 60);
	const s = Math.floor(secs % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export function clamp(val: number, min: number, max: number): number {
	return Math.min(Math.max(val, min), max);
}

export function timeToSeconds(ts: string): number {
	const parts = ts.trim().split(':');
	if (parts.length === 3) {
		return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
	}
	if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
	return parseFloat(parts[0]);
}

export function srtToVtt(srt: string): string {
	const cleaned = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
	const body = cleaned
		.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
		.replace(/^\d+\s*\n(?=\d{2}:\d{2}:\d{2}\.)/gm, '');
	return 'WEBVTT\n\n' + body;
}
