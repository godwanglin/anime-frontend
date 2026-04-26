<script lang="ts">
	type Props = {
		siteConfig?: Record<string, string>;
	};

	let { siteConfig = {} }: Props = $props();

	const enabled = $derived(siteConfig['analytics.enabled'] === 'true');
	const gtmId = $derived((siteConfig['analytics.googleTagManagerId'] ?? '').replace(/[^A-Za-z0-9_-]/g, ''));
	const gaId = $derived((siteConfig['analytics.googleTagId'] ?? '').replace(/[^A-Za-z0-9_-]/g, ''));
	const searchConsoleToken = $derived(siteConfig['analytics.googleSearchConsoleVerification'] ?? '');
	const clarityId = $derived((siteConfig['analytics.clarityProjectId'] ?? '').replace(/[^A-Za-z0-9_-]/g, ''));
	
	const scriptOpen = '<' + 'script>';
	const scriptClose = '</' + 'script>';


	const gtmScript = $derived(
		scriptOpen +
			`
			(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
			new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
			j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
			'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
			})(window,document,'script','dataLayer','${gtmId}');
	` +
			scriptClose
	);
	// const gaScript = $derived(`
	// 		<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}">
	// ` + 		scriptClose+
	// 	scriptOpen +
	// 		`
	// 		window.dataLayer = window.dataLayer || [];
	// 		function gtag(){dataLayer.push(arguments);}
	// 		gtag('js', new Date());
	// 		gtag('config', '${gaId}');
	// ` +
	// 		scriptClose
	// );
	const clarityScript = $derived(
		scriptOpen +
			`
			(function(c,l,a,r,i,t,y){
				c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
				t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
				y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
			})(window, document, "clarity", "script", "${clarityId}");
	` +
			scriptClose
	);
</script>

<svelte:head>
	{#if enabled && searchConsoleToken}
		<meta name="google-site-verification" content={searchConsoleToken} />
	{/if}

	{#if enabled && gtmId}
		{@html gtmScript}
	{/if}
	{#if enabled && gaId}
		{@html `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
			<script>
			window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			gtag('js', new Date());
			gtag('config', '${gaId}');
			</script>`
		}
	{/if}

	{#if enabled && clarityId}
		{@html clarityScript}
	{/if}
</svelte:head>

{#if enabled && gtmId}
	<noscript>
		<iframe
			title="Google Tag Manager"
			src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
			height="0"
			width="0"
			style="display:none;visibility:hidden"
		></iframe>
	</noscript>
{/if}
