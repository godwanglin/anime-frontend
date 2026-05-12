<script lang="ts">
	import Icon from 'heroicons-for-svelte';
	import * as SolidIcons from 'heroicons-for-svelte/icons/solid';

	type MaterialSet = 'rounded' | 'outlined' | 'sharp';
	type Props = {
		name: string;
		class?: string;
		set?: MaterialSet;
		[key: string]: any;
	};

	let { name, class: className = '', set = 'rounded', ...rest }: Props = $props();

	const heroIcons = SolidIcons as Record<string, string>;
	const iconMap: Record<string, string> = {
		add: 'Plus',
		add_photo_alternate: 'Photograph',
		alternate_email: 'AtSymbol',
		arrow_back: 'ArrowLeft',
		arrow_back_ios: 'ChevronLeft',
		arrow_forward: 'ArrowRight',
		arrow_outward: 'ExternalLink',
		auto_awesome: 'Sparkles',
		autorenew: 'Refresh',
		badge: 'Identification',
		bookmark: 'Bookmark',
		bookmark_remove: 'BookmarkAlt',
		bookmarks: 'BookmarkAlt',
		calendar_month: 'Calendar',
		category: 'ViewGrid',
		chat_bubble: 'ChatAlt2',
		chat_bubble_outline: 'ChatAlt',
		check: 'Check',
		check_circle: 'CheckCircle',
		chevron_left: 'ChevronLeft',
		chevron_right: 'ChevronRight',
		close: 'X',
		cloud_done: 'Cloud',
		cloud_upload: 'CloudUpload',
		colorize: 'ColorSwatch',
		contrast: 'Moon',
		delete: 'Trash',
		delete_sweep: 'Trash',
		done_all: 'ClipboardCheck',
		download: 'Download',
		drafts: 'MailOpen',
		drag_handle: 'MenuAlt4',
		drag_indicator: 'MenuAlt4',
		edit: 'PencilAlt',
		edit_note: 'DocumentText',
		event_busy: 'XCircle',
		expand_more: 'ChevronDown',
		explore: 'LocationMarker',
		favorite: 'Heart',
		fiber_new: 'Sparkles',
		fingerprint: 'FingerPrint',
		flag: 'Flag',
		font_download: 'Translate',
		format_size: 'Variable',
		forum: 'ChatAlt2',
		forward_10: 'FastForward',
		forward_5: 'FastForward',
		fullscreen: 'ArrowsExpand',
		grid_view: 'ViewGrid',
		hd: 'DesktopComputer',
		history: 'Clock',
		hourglass_top: 'Clock',
		image: 'Photograph',
		info: 'InformationCircle',
		inventory_2: 'Archive',
		keyboard_arrow_down: 'ChevronDown',
		keyboard_arrow_up: 'ChevronUp',
		layers: 'Collection',
		left_panel_open: 'ViewBoards',
		link: 'Link',
		lock: 'LockClosed',
		lock_open: 'LockOpen',
		login: 'Login',
		logout: 'Logout',
		manage_accounts: 'UserCircle',
		menu: 'Menu',
		movie: 'Film',
		my_location: 'LocationMarker',
		notifications: 'Bell',
		notifications_active: 'Bell',
		opacity: 'ColorSwatch',
		open_in_new: 'ExternalLink',
		palette: 'ColorSwatch',
		person: 'User',
		person_off: 'UserRemove',
		play_arrow: 'Play',
		play_circle: 'Play',
		progress_activity: 'Refresh',
		refresh: 'Refresh',
		replay_10: 'Rewind',
		replay_5: 'Rewind',
		reply: 'Reply',
		report: 'ExclamationCircle',
		right_panel_open: 'ViewBoards',
		save: 'Save',
		schedule: 'Clock',
		search: 'Search',
		search_off: 'SearchCircle',
		select_all: 'Selector',
		send: 'PaperAirplane',
		share: 'Share',
		shield: 'ShieldCheck',
		shuffle: 'SwitchHorizontal',
		skip_next: 'FastForward',
		skip_previous: 'Rewind',
		star: 'Star',
		storefront: 'ShoppingBag',
		straighten: 'Scale',
		subdirectory_arrow_right: 'ArrowNarrowRight',
		table_rows: 'Table',
		thumb_down: 'ThumbDown',
		thumb_up: 'ThumbUp',
		timeline: 'PresentationChartLine',
		tune: 'Adjustments',
		upload_file: 'Upload',
		vertical_align_bottom: 'ArrowDown',
		vertical_split: 'ViewBoards',
		video_library: 'Film',
		video_off: 'VideoCamera',
		videocam: 'VideoCamera',
		videocam_off: 'VideoCamera',
		visibility: 'Eye',
		volume_up: 'VolumeUp',
		wifi_off: 'StatusOffline',
		workspace_premium: 'BadgeCheck',
		zoom_in: 'ZoomIn',
		zoom_out: 'ZoomOut'
	};

	const iconName = $derived(iconMap[name]);
	const heroIcon = $derived(iconName ? heroIcons[iconName] : undefined);
	const fallbackClass = $derived(
		`material-symbols-${set}${className ? ` ${className}` : ''}`
	);
</script>

{#if heroIcon}
	<Icon icon={heroIcon} class={className} {...rest} />
{:else}
	<span class={fallbackClass} {...rest}>{name}</span>
{/if}
