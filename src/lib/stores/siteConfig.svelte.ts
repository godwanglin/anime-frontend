let config = $state<Record<string, string>>({});

function setConfig(nextConfig: Record<string, string>) {
	config = nextConfig ?? {};
}

function get(key: string) {
	return config[key] ?? null;
}

function getJson<T>(key: string) {
	const value = get(key);

	if (!value) return null;

	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function getBool(key: string) {
	return get(key) === 'true';
}

function getNumber(key: string) {
	const value = Number(get(key));
	return Number.isFinite(value) ? value : 0;
}

export const siteConfig = {
	get config() {
		return config;
	},
	setConfig,
	get,
	getJson,
	getBool,
	getNumber
};
