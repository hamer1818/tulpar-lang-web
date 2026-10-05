// Shared motion vocabulary for the landing page and the docs. Everything
// that moves is gated on `.tlp-anim`, which the inline gate in Head.astro
// sets before first paint (and only when the visitor allows motion).

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const EASE = 'power3.out';
export const CHAR_TIME = 0.0065; // seconds per typed character

export const motionEnabled = () => document.documentElement.classList.contains('tlp-anim');

/** Tell the inline gate's safety net that the motion bundle booted. */
export const markBooted = () => ((window as any).__tlpMotion = true);

/** Play `tl` once, the first time `trigger` scrolls into view. */
export function onEnter(trigger: Element, tl: gsap.core.Timeline, start = 'top 80%') {
	tl.pause();
	ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
	return tl;
}

/** Clip-reveal each `.ln` left→right in character-sized steps (monospace). */
export function typeLines(lines: Element[], tl = gsap.timeline(), charTime = CHAR_TIME) {
	for (const line of lines) {
		const n = (line.textContent ?? '').length;
		if (n === 0) {
			tl.set(line, { clipPath: 'inset(0 0% 0 0)' });
			continue;
		}
		tl.fromTo(
			line,
			{ clipPath: 'inset(0 100% 0 0)' },
			{ clipPath: 'inset(0 0% 0 0)', duration: Math.max(0.04, n * charTime), ease: `steps(${n})` },
		);
	}
	return tl;
}

/** Tween the first number inside `el`'s text, keeping prefix/suffix and decimals. */
export function countUp(el: Element, duration: number) {
	const text = el.textContent ?? '';
	const m = text.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/s);
	if (!m || parseFloat(m[2]) === 0) return gsap.timeline();
	const [, pre, num, post] = m;
	const decimals = num.includes('.') ? num.split('.')[1].length : 0;
	const state = { v: 0 };
	return gsap.timeline().to(state, {
		v: parseFloat(num),
		duration,
		ease: EASE,
		onUpdate: () => {
			el.textContent = pre + state.v.toFixed(decimals) + post;
		},
		onComplete: () => {
			el.textContent = text;
		},
	});
}

/**
 * Pointer-following light. Writes the pointer position (relative to each
 * target) into `--mx/--my`; CSS draws the glow. With `items`, every item
 * tracks the pointer while it moves anywhere over `area` (the edge light
 * then spans a whole grid); without, `area` tracks only itself.
 */
export function spotlight(area: HTMLElement, items: HTMLElement[] = [area]) {
	let frame = 0;
	area.addEventListener('pointermove', (e) => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			for (const item of items) {
				const r = item.getBoundingClientRect();
				item.style.setProperty('--mx', `${e.clientX - r.left}px`);
				item.style.setProperty('--my', `${e.clientY - r.top}px`);
			}
		});
	});
}

/** The thin bar under the header that tracks reading progress. */
export function scrollProgress() {
	const bar = document.querySelector('.tlp-progress');
	if (!bar) return;
	gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

/** Reduced motion switched on mid-visit: jump everything to its end state. */
export function watchReducedMotion() {
	matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
		if (!e.matches) return;
		gsap.globalTimeline.getChildren(false, true, true).forEach((t) => t.progress(1));
		ScrollTrigger.getAll().forEach((st) => st.kill());
		document.documentElement.classList.remove('tlp-anim');
	});
}
