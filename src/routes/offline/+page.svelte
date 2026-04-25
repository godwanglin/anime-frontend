<svelte:head>
	<title>Sedang Offline</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f11] p-6 text-center text-zinc-100">
	<span class="material-symbols-rounded text-6xl text-zinc-600">wifi_off</span>
	<h1 class="text-2xl font-black">Kamu sedang offline</h1>
	<p class="max-w-sm text-zinc-400">Periksa koneksi internetmu, lalu coba lagi.</p>
	<button
		onclick={() => window.location.reload()}
		class="mt-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
	>
		Coba lagi
	</button>
</div>
