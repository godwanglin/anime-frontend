const CACHE_VERSION = 'v2';
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const PAGE_CACHE    = `pages-${CACHE_VERSION}`;

// Assets worth caching on install
const PRECACHE_URLS = [
	'/',
	'/offline',
	'/icon.png',
	'/manifest.webmanifest'
];

// ── Install: precache critical assets ────────────────────────────────────────
self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => null)
	);
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
					.map((k) => caches.delete(k))
			)
		).then(() => self.clients.claim())
	);
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET, cross-origin, and extension requests
	if (request.method !== 'GET') return;
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;        // always network for API
	if (url.pathname.startsWith('/_app/immutable/')) {  // hashed assets = cache-first
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}
	if (/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/.test(url.pathname)) {
		event.respondWith(cacheFirst(request, STATIC_CACHE));
		return;
	}

	// HTML navigation = network-first with offline fallback
	if (request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(networkFirstWithFallback(request));
		return;
	}
});

// ── Strategy: cache-first ─────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
	const cached = await caches.match(request);
	if (cached) return cached;
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		return new Response('Offline', { status: 503 });
	}
}

// ── Strategy: network-first, fall back to cache then /offline ────────────────
async function networkFirstWithFallback(request) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(PAGE_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;
		const offline = await caches.match('/offline');
		if (offline) return offline;
		return new Response('<h1>Kamu sedang offline</h1>', {
			status: 503,
			headers: { 'Content-Type': 'text/html' }
		});
	}
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const title = data.title || 'Notifikasi baru';
	const options = {
		body: data.body || '',
		icon: '/icon.png',
		badge: '/icon.png',
		image: data.image || undefined,
		data: {
			link:     data.link     || '/',
			id:       data.id       || null,
			category: data.category || null,
			type:     data.type     || null
		}
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const link = event.notification.data?.link || '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ('focus' in client) {
					client.navigate(link);
					return client.focus();
				}
			}
			if (self.clients.openWindow) return self.clients.openWindow(link);
		})
	);
});
