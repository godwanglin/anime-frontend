const ABSOLUTE_FORMAT = new Intl.DateTimeFormat('en-US', {
	month: 'long',
	day: 'numeric',
	year: 'numeric'
});

export function formatRelativeID(input: string | Date | null | undefined): string {
	if (!input) return '';
	const date = typeof input === 'string' ? new Date(input) : input;
	if (Number.isNaN(date.getTime())) return '';

	const diff = Date.now() - date.getTime();
	if (diff < 30_000) return 'baru saja';

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} menit lalu`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} jam lalu`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} hari lalu`;

	if (days < 30) {
		const weeks = Math.floor(days / 7);
		return `${weeks} minggu lalu`;
	}

	if (days < 365) {
		const months = Math.floor(days / 30);
		return `${months} bulan lalu`;
	}

	return ABSOLUTE_FORMAT.format(date);
}
