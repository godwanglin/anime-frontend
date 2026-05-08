<script lang="ts">
	import ShuffleIcon from './icons/ShuffleIcon.svelte';
	import CompassIcon from './icons/CompassIcon.svelte';
	import SparkleIcon from './icons/SparkleIcon.svelte';
	import CalendarIcon from './icons/CalendarIcon.svelte';
</script>

<section class="mb-8" aria-label="Eksplorasi lebih lanjut">
	<div class="cta-shell">
		<!-- Decorative orbs -->
		<div class="cta-orb cta-orb-a" aria-hidden="true"></div>
		<div class="cta-orb cta-orb-b" aria-hidden="true"></div>
		<div class="cta-orb cta-orb-c" aria-hidden="true"></div>

		<!-- Subtle grid pattern overlay -->
		<svg class="cta-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<defs>
				<pattern id="cta-grid-pat" width="6" height="6" patternUnits="userSpaceOnUse">
					<path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.2" />
				</pattern>
			</defs>
			<rect width="100" height="100" fill="url(#cta-grid-pat)" />
		</svg>

		<div class="cta-content">
			<div class="cta-text">
				<span class="cta-eyebrow">
					<SparkleIcon size={11} />
					<span>Pilihan Cerdas</span>
				</span>
				<h3 class="cta-title">
					Ribuan judul.<br />
					<span class="cta-title-accent">Satu klik aja.</span>
				</h3>
				<p class="cta-desc">
					Bingung mau nonton apa? Biarkan kami pilihkan secara acak,
					atau jelajahi koleksi dengan filter yang detail.
				</p>
			</div>

			<div class="cta-actions">
				<a href="/random" class="cta-btn cta-btn-primary group">
					<span class="cta-btn-icon">
						<ShuffleIcon size={16} />
					</span>
					Tonton Acak
				</a>
				<a href="/browse" class="cta-btn cta-btn-secondary">
					<CompassIcon size={15} />
					Jelajah Detail
				</a>
				<a href="/jadwal-rilis" class="cta-btn cta-btn-ghost">
					<CalendarIcon size={15} />
					Jadwal Rilis
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.cta-shell {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border-radius: 28px;
		padding: 32px 24px;
		background:
			radial-gradient(ellipse 80% 60% at 100% 0%, oklch(0.58 0.22 305) 0%, transparent 55%),
			radial-gradient(ellipse 60% 80% at 0% 100%, oklch(0.5 0.2 285) 0%, transparent 60%),
			linear-gradient(135deg, #1a1530 0%, #0f0a1c 60%, #1a0f24 100%);
		box-shadow: 0 24px 72px rgba(76, 29, 149, 0.25), 0 0 0 1px rgba(167, 139, 250, 0.18) inset;
		color: white;
	}

	@media (min-width: 768px) {
		.cta-shell {
			padding: 44px 36px;
		}
	}

	.cta-orb {
		position: absolute;
		border-radius: 9999px;
		filter: blur(48px);
		pointer-events: none;
		z-index: -1;
	}

	.cta-orb-a {
		top: -80px;
		right: -60px;
		height: 240px;
		width: 240px;
		background: oklch(0.6 0.27 320 / 0.55);
	}

	.cta-orb-b {
		bottom: -80px;
		left: -60px;
		height: 220px;
		width: 220px;
		background: oklch(0.55 0.22 270 / 0.5);
	}

	.cta-orb-c {
		top: 50%;
		left: 50%;
		height: 320px;
		width: 320px;
		transform: translate(-50%, -50%);
		background: oklch(0.55 0.22 295 / 0.18);
	}

	.cta-grid {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0.5;
		mix-blend-mode: overlay;
		pointer-events: none;
		z-index: -1;
	}

	.cta-content {
		display: grid;
		gap: 24px;
		align-items: center;
		position: relative;
		z-index: 1;
	}

	@media (min-width: 768px) {
		.cta-content {
			grid-template-columns: 1.4fr auto;
		}
	}

	.cta-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 11px;
		font-size: 10.5px;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #ddd6fe;
		background: oklch(from #ddd6fe l c h / 0.13);
		border: 1px solid rgba(196, 181, 253, 0.3);
		border-radius: 9999px;
		backdrop-filter: blur(8px);
		margin-bottom: 16px;
	}

	.cta-title {
		font-family: 'Bebas Neue', 'Lexend Deca', sans-serif;
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 400;
		line-height: 0.95;
		letter-spacing: 0.005em;
		color: white;
		margin-bottom: 14px;
		text-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
	}

	.cta-title-accent {
		background: linear-gradient(135deg, #c4b5fd, #f0abfc);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.cta-desc {
		font-size: 13px;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.75);
		max-width: 460px;
	}

	@media (min-width: 768px) {
		.cta-desc {
			font-size: 14px;
		}
	}

	.cta-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.cta-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 18px;
		font-size: 12.5px;
		font-weight: 900;
		border-radius: 16px;
		transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.cta-btn-primary {
		background: linear-gradient(135deg, #ffffff, #f4f4f5);
		color: #4c1d95;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.cta-btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 14px 36px rgba(196, 181, 253, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	.cta-btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 26px;
		width: 26px;
		border-radius: 9999px;
		background: linear-gradient(135deg, #7c3aed, #a855f7);
		color: white;
		box-shadow: 0 3px 10px rgba(124, 58, 237, 0.5);
		transition: transform 220ms ease;
	}

	.cta-btn-primary:hover .cta-btn-icon {
		transform: rotate(-25deg) scale(1.05);
	}

	.cta-btn-secondary {
		background: rgba(255, 255, 255, 0.13);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.22);
		backdrop-filter: blur(8px);
	}

	.cta-btn-secondary:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.35);
	}

	.cta-btn-ghost {
		background: transparent;
		color: rgba(255, 255, 255, 0.85);
		padding: 12px 12px;
	}

	.cta-btn-ghost:hover {
		background: rgba(255, 255, 255, 0.08);
		color: white;
	}

	@media (hover: none) {
		.cta-btn-primary:hover {
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cta-btn,
		.cta-btn-primary:hover .cta-btn-icon {
			transition: none;
			transform: none;
		}
	}
</style>
