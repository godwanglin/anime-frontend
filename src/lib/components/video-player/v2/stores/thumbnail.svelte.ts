import type { ThumbnailCue } from './types';
import { clamp, timeToSeconds } from './utils';

interface ThumbnailContext {
	getDuration: () => number;
	getSeekbarEl: () => HTMLInputElement | undefined;
	getContainerEl: () => HTMLElement | undefined;
}

export function createThumbnailManager(ctx: ThumbnailContext) {
	let thumbnailCues = $state<ThumbnailCue[]>([]);
	let hovering = $state(false);
	let hoverTime = $state(0);
	let hoverX = $state(0);
	let previewCue = $state<ThumbnailCue | null>(null);
	let previewX = $state(0);

	const PREVIEW_WIDTH = 160;
	const PREVIEW_HEIGHT = 90;

	async function loadThumbnails(vttUrl: string) {
		try {
			const res = await fetch(vttUrl);
			if (!res.ok) return;
			const text = await res.text();
			const base = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);
			const cues: ThumbnailCue[] = [];
			const blocks = text
				.split(/\n\s*\n/)
				.filter((block) => block.trim() && !block.trim().startsWith('WEBVTT'));

			for (const block of blocks) {
				const lines = block.trim().split('\n');
				const timingLine = lines.find((line) => line.includes('-->'));
				if (!timingLine) continue;

				const [startStr, endStr] = timingLine.split('-->');
				const start = timeToSeconds(startStr.trim());
				const end = timeToSeconds(endStr.trim().split(' ')[0]);
				const imgLine = lines.find(
					(line) => !line.includes('-->') && line.trim() && !/^\d+$/.test(line.trim())
				);
				if (!imgLine) continue;

				const hashIdx = imgLine.indexOf('#xywh=');
				if (hashIdx !== -1) {
					const imgPath = imgLine.substring(0, hashIdx).trim();
					const xywh = imgLine.substring(hashIdx + 6).trim();
					const [x, y, w, h] = xywh.split(',').map(Number);
					const url = imgPath.startsWith('http') ? imgPath : base + imgPath;
					cues.push({ start, end, url, x, y, w, h });
				} else {
					const imgPath = imgLine.trim();
					const url = imgPath.startsWith('http') ? imgPath : base + imgPath;
					cues.push({ start, end, url, x: 0, y: 0, w: PREVIEW_WIDTH, h: PREVIEW_HEIGHT });
				}
			}

			thumbnailCues = cues;
		} catch {
			thumbnailCues = [];
		}
	}

	function clearThumbnails() {
		thumbnailCues = [];
		hovering = false;
		previewCue = null;
	}

	function findCueForTime(time: number): ThumbnailCue | null {
		for (const cue of thumbnailCues) {
			if (time >= cue.start && time < cue.end) return cue;
		}
		if (thumbnailCues.length === 0) return null;
		let nearest = thumbnailCues[0];
		let minDist = Math.abs((nearest.start + nearest.end) / 2 - time);
		for (const cue of thumbnailCues) {
			const mid = (cue.start + cue.end) / 2;
			const dist = Math.abs(mid - time);
			if (dist < minDist) {
				minDist = dist;
				nearest = cue;
			}
		}
		return nearest;
	}

	function onSeekbarMouseMove(e: MouseEvent) {
		const seekbarEl = ctx.getSeekbarEl();
		const duration = ctx.getDuration();
		if (!seekbarEl || !duration) return;

		const rect = seekbarEl.getBoundingClientRect();
		const offsetX = clamp(e.clientX - rect.left, 0, rect.width);
		const t = (offsetX / rect.width) * duration;

		hoverX = offsetX;
		hoverTime = t;
		hovering = true;

		if (thumbnailCues.length > 0) {
			previewCue = findCueForTime(t);
			const containerEl = ctx.getContainerEl();
			if (containerEl) {
				const containerRect = containerEl.getBoundingClientRect();
				const absoluteX = e.clientX - containerRect.left;
				previewX = clamp(absoluteX - PREVIEW_WIDTH / 2, 4, containerRect.width - PREVIEW_WIDTH - 4);
			} else {
				previewX = clamp(offsetX - PREVIEW_WIDTH / 2, 4, rect.width - PREVIEW_WIDTH - 4);
			}
		}
	}

	function onSeekbarMouseLeave() {
		hovering = false;
		previewCue = null;
	}

	return {
		loadThumbnails,
		clearThumbnails,
		onSeekbarMouseMove,
		onSeekbarMouseLeave,
		get thumbnailCues() {
			return thumbnailCues;
		},
		get hovering() {
			return hovering;
		},
		get hoverTime() {
			return hoverTime;
		},
		get hoverX() {
			return hoverX;
		},
		get previewCue() {
			return previewCue;
		},
		get previewX() {
			return previewX;
		},
		get PREVIEW_WIDTH() {
			return PREVIEW_WIDTH;
		},
		get PREVIEW_HEIGHT() {
			return PREVIEW_HEIGHT;
		}
	};
}
