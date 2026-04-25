<!-- BOTTOM NAV — mobile -->
<nav
	class="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md"
>
	<div class="flex items-center justify-around h-14">
		{#each [{ href: '/', icon: 'home', label: 'Home' }, { href: '/browse', icon: 'explore', label: 'Jelajahi' }, { href: '/popular', icon: 'local_fire_department', label: 'Populer' }, { href: '/search', icon: 'search', label: 'Cari' }, { href: '/profile', icon: 'person', label: 'Profil' }] as item}
			<a
				href={item.href}
				class="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-zinc-500 dark:text-zinc-400 hover:text-violet-500 dark:hover:text-violet-400 transition"
			>
				<span class="material-symbols-rounded text-[22px]">{item.icon}</span>
				<span class="text-[10px] font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
