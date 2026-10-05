// Doc page choreography. Reading comes first, so motion here is quieter
// than on the landing page:
//  - the page header settles in once, over a signal-grid band;
//  - code blocks, callouts, tables, cards and playgrounds lift into place
//    the first time they scroll into view (opacity + transform only — never
//    `visibility`, so find-in-page still matches text that hasn't revealed);
//  - every h2 draws its accent rule as it arrives;
//  - the "On this page" list gets an indicator that slides to the section
//    being read, and a progress bar tracks the whole page.
// Cards get a pointer spotlight; that one also runs under reduced motion.

import {
	EASE,
	ScrollTrigger,
	gsap,
	markBooted,
	motionEnabled,
	scrollProgress,
	spotlight,
	watchReducedMotion,
} from '../motion/core';
import { signalGrid } from '../motion/signal-grid';

const BLOCKS = [
	'.expressive-code',
	'.starlight-aside',
	'.sl-markdown-content > table',
	'.sl-markdown-content > div > table',
	'.card-grid',
	'.sl-link-card',
	'.tulpar-playground',
	'.tablist-wrapper',
].join(', ');

function headIn(head: Element) {
	const q = gsap.utils.selector(head);
	gsap
		.timeline({ defaults: { ease: EASE, duration: 0.7 } })
		.fromTo(q('.tlp-doc-head__eyebrow'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.5 })
		.fromTo(q('h1'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0 }, '<0.05')
		.fromTo(q('.tlp-doc-head__lead'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0 }, '<0.12')
		.fromTo(q('.tlp-doc-head__meta'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.1');
}

/** Lift blocks into place as they arrive. Ones already on screen are left alone. */
function revealBlocks(content: Element) {
	const fold = window.innerHeight;
	const blocks = [...content.querySelectorAll<HTMLElement>(BLOCKS)].filter(
		// Only the outermost match (a playground inside a tab panel moves once).
		(el, _, all) => !all.some((o) => o !== el && o.contains(el)) && el.getBoundingClientRect().top > fold,
	);
	if (!blocks.length) return;
	gsap.set(blocks, { opacity: 0, y: 26 });
	ScrollTrigger.batch(blocks, {
		start: 'top 92%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.08, overwrite: true, clearProps: 'transform' }),
	});
}

/** h2s draw their accent rule as they scroll in (CSS does the drawing). */
function headingRules(content: Element) {
	const fold = window.innerHeight;
	const headings = [...content.querySelectorAll<HTMLElement>('h2')];
	headings.filter((h) => h.getBoundingClientRect().top <= fold).forEach((h) => h.classList.add('is-in'));
	ScrollTrigger.batch(
		headings.filter((h) => !h.classList.contains('is-in')),
		{ start: 'top 88%', once: true, onEnter: (batch) => batch.forEach((h) => h.classList.add('is-in')) },
	);
}

/** A bar in the right-hand TOC that glides to whichever link Starlight marks current. */
function tocIndicator() {
	const list = document.querySelector<HTMLElement>('starlight-toc nav > ul');
	if (!list) return;
	const bar = document.createElement('span');
	bar.className = 'tlp-toc-indicator';
	bar.setAttribute('aria-hidden', 'true');
	list.prepend(bar);

	const move = (instant = false) => {
		// Starlight marks a link only once a heading crosses the band under the
		// navbar; before that the reader is in the overview, i.e. the first link.
		const link = list.querySelector<HTMLElement>('a[aria-current="true"]') ?? list.querySelector<HTMLElement>('a');
		if (!link) return;
		const l = link.getBoundingClientRect();
		const top = l.top - list.getBoundingClientRect().top;
		gsap.to(bar, { y: top, height: l.height, opacity: 1, duration: instant ? 0 : 0.45, ease: 'power3.inOut' });
	};
	new MutationObserver(() => move()).observe(list, { subtree: true, attributeFilter: ['aria-current'] });
	new ResizeObserver(() => move(true)).observe(list);
	move(true);
}

export function boot() {
	const head = document.querySelector<HTMLElement>('[data-doc-head]');
	if (!head) return; // splash pages (landing, 404) have their own layer
	const content = document.querySelector('.sl-markdown-content');
	const motion = motionEnabled();

	document
		.querySelectorAll<HTMLElement>('.sl-link-card, .card-grid .card, .pagination-links a')
		.forEach((el) => spotlight(el));
	signalGrid(head, head.querySelector('.tlp-doc-head__canvas'), motion, { maxSignals: 4, spawnEvery: 900 });
	if (!motion) return;
	markBooted();

	headIn(head);
	if (content) {
		revealBlocks(content);
		headingRules(content);
	}
	tocIndicator();
	scrollProgress();
	watchReducedMotion();
}
