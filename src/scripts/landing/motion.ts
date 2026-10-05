// Landing page choreography. One deliberate moment per section, all driven
// by GSAP: entrance + typing in the hero, then each section plays once when
// it scrolls into view. Interaction-only effects (copy button, keyword
// twins, card spotlight, static hero matrix) also run for reduced-motion
// visitors; everything that moves things around is gated on `.tlp-anim`.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroCanvas } from './hero-canvas';

gsap.registerPlugin(ScrollTrigger);

const CHAR_TIME = 0.0065; // seconds per typed character
const EASE = 'power3.out';

/** Play `tl` once, the first time `trigger` scrolls into view. */
function onEnter(trigger: Element, tl: gsap.core.Timeline, start = 'top 80%') {
	tl.pause();
	ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
	return tl;
}

/** Clip-reveal each `.ln` left→right in character-sized steps (monospace). */
function typeLines(lines: Element[], tl = gsap.timeline(), charTime = CHAR_TIME) {
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
function countUp(el: Element, duration: number) {
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

/* --- Hero --------------------------------------------------------------- */

function typePanel(panel: Element) {
	const tl = gsap.timeline();
	typeLines([...panel.querySelectorAll('.tlp-window__code .ln')], tl);
	tl.add(() => panel.classList.add('is-typing-cmd'), '+=0.15');
	typeLines([...panel.querySelectorAll('.tlp-window__term .ln')], tl);
	tl.add(() => {
		panel.classList.remove('is-typing-cmd');
		panel.classList.add('is-typed');
	});
	return tl;
}

function heroTimeline(hero: Element) {
	const q = gsap.utils.selector(hero);
	const reveal = { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE };
	const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

	tl.fromTo(q('.tlp-hero__badge'), { autoAlpha: 0, y: 12 }, reveal)
		.fromTo(q('.tlp-hero__title'), { autoAlpha: 0, y: 28 }, reveal, '<0.08')
		.fromTo(q('.tlp-hero__title span'), { autoAlpha: 0, y: 18 }, reveal, '<0.12')
		.fromTo(q('.tlp-hero__lead'), { autoAlpha: 0, y: 16 }, reveal, '<0.12')
		.fromTo(q('.tlp-hero__actions > *'), { autoAlpha: 0, y: 12 }, { ...reveal, stagger: 0.06 }, '<0.1')
		.fromTo(
			q('.tlp-window'),
			{ autoAlpha: 0, y: 40, scale: 0.96, rotationX: 8, transformPerspective: 1100 },
			{ ...reveal, scale: 1, rotationX: 0, duration: 1 },
			0.2,
		)
		.addLabel('type', 0.75)
		// One light sweep across the gradient half of the headline.
		.fromTo(
			q('.tlp-hero__title span'),
			{ backgroundPosition: '140% 0%, 0% 0%' },
			{ backgroundPosition: '-40% 0%, 0% 0%', duration: 1.3, ease: 'power2.inOut' },
			'type+=0.1',
		);

	const panel = hero.querySelector('.tlp-window__panel.is-active');
	if (panel) tl.add(typePanel(panel), 'type');

	tl.fromTo(q('.tlp-hero__stats'), { autoAlpha: 0, y: 12 }, reveal, 'type+=0.2');
	q('.tlp-hero__stat b').forEach((b) => tl.add(countUp(b, 1.6), 'type+=0.3'));
	return tl;
}

function bindTabTyping(hero: Element, heroTl: gsap.core.Timeline) {
	const typed = new WeakSet<Element>();
	const active = hero.querySelector('.tlp-window__panel.is-active');
	if (active) typed.add(active);
	hero.querySelector('[data-codetabs]')?.addEventListener('tlp:tabchange', (e) => {
		const panel = (e as CustomEvent<{ panel: Element }>).detail.panel;
		heroTl.progress(1); // the visitor took over: finish the intro instantly
		if (typed.has(panel)) return;
		typed.add(panel);
		typePanel(panel);
	});
}

/** The code window leans toward the pointer (fine pointers only). */
function heroTilt(hero: Element) {
	const preview = hero.querySelector<HTMLElement>('.tlp-hero__preview');
	if (!preview || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
	gsap.set(preview, { transformPerspective: 1100 });
	const rx = gsap.quickTo(preview, 'rotationX', { duration: 0.7, ease: 'power3' });
	const ry = gsap.quickTo(preview, 'rotationY', { duration: 0.7, ease: 'power3' });
	preview.addEventListener('pointermove', (e) => {
		const r = preview.getBoundingClientRect();
		ry(((e.clientX - r.left) / r.width - 0.5) * 8);
		rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
	});
	preview.addEventListener('pointerleave', () => {
		rx(0);
		ry(0);
	});
}

/* --- Sections ----------------------------------------------------------- */

function sectionHead(head: Element) {
	const q = gsap.utils.selector(head);
	const tl = gsap.timeline({ defaults: { ease: EASE } });
	tl.fromTo(q('.tlp-eyebrow'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.5 })
		.fromTo(
			q('h2'),
			{ autoAlpha: 0, y: 26, clipPath: 'inset(0 0 100% 0)' },
			{ autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.8, clearProps: 'clipPath' },
			'<0.05',
		);
	if (q('p').length) tl.fromTo(q('p'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6 }, '<0.2');
	onEnter(head, tl, 'top 85%');
}

function pipelineMotion(pipe: HTMLElement) {
	const stages = [...pipe.querySelectorAll<HTMLElement>('.tlp-pipe__stage')];
	const fill = pipe.querySelector('.tlp-pipe__fill');
	const packet = pipe.querySelector('.tlp-pipe__packet');
	const rail = pipe.querySelector<HTMLElement>('.tlp-pipe__rail');
	if (!stages.length || !fill || !packet || !rail) return;

	const STEP = 0.55;
	const mm = gsap.matchMedia();
	mm.add({ wide: '(min-width: 50.0625rem)', narrow: '(max-width: 50rem)' }, (ctx) => {
		const wide = !!ctx.conditions?.wide;
		const axis = wide ? 'x' : 'y';
		const scale = wide ? 'scaleX' : 'scaleY';
		const travel = () => (wide ? rail.offsetWidth : rail.offsetHeight);

		const tl = gsap.timeline({
			paused: true,
			onStart: () => pipe.classList.add('is-running'),
			onComplete: () => pipe.classList.remove('is-running'),
		});
		tl.fromTo(fill, { [scale]: 0 }, { [scale]: 1, duration: STEP * (stages.length - 1), ease: 'none' }, 0)
			.fromTo(
				packet,
				{ [axis]: 0, autoAlpha: 1 },
				{ [axis]: travel, duration: STEP * (stages.length - 1), ease: 'none' },
				0,
			)
			.to(packet, { autoAlpha: 0, duration: 0.25 });
		stages.forEach((stage, i) => {
			tl.add(() => stage.classList.add('is-lit'), i * STEP + 0.01);
			tl.fromTo(
				stage.querySelector('.tlp-pipe__node'),
				{ scale: 1 },
				{ scale: 1.35, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' },
				i * STEP,
			);
		});

		const run = () => {
			stages.forEach((s) => s.classList.remove('is-lit'));
			tl.play(0);
		};
		ScrollTrigger.create({ trigger: pipe, start: 'top 72%', once: true, onEnter: run });
		const replay = pipe.querySelector('[data-pipe-replay]');
		replay?.addEventListener('click', run);
		return () => {
			replay?.removeEventListener('click', run);
			stages.forEach((s) => s.classList.add('is-lit'));
		};
	});
}

function benchMotion(bench: Element) {
	const tl = gsap.timeline();
	tl.fromTo(
		bench.querySelectorAll('.tlp-bench__fill'),
		{ scaleX: 0 },
		{ scaleX: 1, duration: 1.3, ease: EASE, stagger: 0.12 },
		0,
	);
	bench.querySelectorAll('.tlp-bench__val').forEach((v, i) => tl.add(countUp(v, 1.3), i * 0.12));
	onEnter(bench, tl, 'top 78%');
}

function compareMotion(table: Element) {
	const tl = gsap.timeline({ defaults: { ease: EASE } });
	tl.fromTo(table.querySelectorAll('thead th'), { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 })
		.fromTo(
			table.querySelectorAll('tbody tr'),
			{ autoAlpha: 0, x: -18 },
			{ autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.07 },
			'<0.1',
		)
		.fromTo(
			table.querySelectorAll('.tlp-compare__mark'),
			{ scale: 0 },
			{ scale: 1, duration: 0.45, ease: 'back.out(2.5)', stagger: 0.03 },
			'<0.25',
		);
	onEnter(table, tl);
}

function bentoMotion(grid: Element) {
	const items = grid.querySelectorAll('.tlp-bento__item');
	gsap.set(items, { autoAlpha: 0, y: 30 });
	ScrollTrigger.batch(items, {
		start: 'top 88%',
		once: true,
		onEnter: (batch) =>
			gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.08, overwrite: true }),
	});

	// The feature card "switches on" what Wings gives you, one by one.
	const chips = [...grid.querySelectorAll('.tlp-chips li')];
	const tl = gsap.timeline();
	chips.forEach((li, i) => tl.add(() => li.classList.add('is-on'), 0.5 + i * 0.14));
	onEnter(grid, tl, 'top 75%');
}

function bilingualMotion(root: Element) {
	const panes = [...root.querySelectorAll('.tlp-bilingual__pane')];
	const tl = gsap.timeline();
	tl.fromTo(panes, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE, stagger: 0.12 });
	// Both files type in lock-step: same program, two keyword sets.
	panes.forEach((pane) => tl.add(typeLines([...pane.querySelectorAll('.ln')], gsap.timeline(), 0.011), 0.35));
	const [a, b] = panes.map((p) => [...p.querySelectorAll('.kw')]);
	const t0 = tl.duration() + 0.2;
	a?.forEach((kw, i) => {
		const twin = b?.[i];
		if (!twin) return;
		tl.add(() => [kw, twin].forEach((k) => k.classList.add('is-paired')), t0 + i * 0.28);
		tl.add(() => [kw, twin].forEach((k) => k.classList.remove('is-paired')), t0 + i * 0.28 + 0.45);
	});
	onEnter(root, tl);
}

function playgroundMotion(frame: Element) {
	const tl = gsap.timeline();
	tl.fromTo(frame, { autoAlpha: 0, y: 36, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: EASE });
	onEnter(frame, tl, 'top 85%');
}

function crudMotion(crud: Element) {
	const routes = [...crud.querySelectorAll('.tlp-routes li')];
	const tl = gsap.timeline({ defaults: { ease: EASE } });
	tl.fromTo(crud.querySelector('.tlp-crud__code'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.7 })
		.fromTo(crud.querySelector('.tlp-routes'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.7 }, '<0.12');
	// Routes register one after another, like a server coming up.
	routes.forEach((li, i) => {
		const at = 0.7 + i * 0.22;
		tl.add(() => li.classList.add('is-on'), at);
		tl.fromTo(
			li,
			{ backgroundColor: 'rgba(0, 229, 255, 0.16)' },
			{ backgroundColor: 'rgba(0, 229, 255, 0)', duration: 0.9, ease: 'power2.out', clearProps: 'backgroundColor' },
			at,
		);
	});
	onEnter(crud, tl, 'top 75%');
}

function ctaMotion(cta: Element) {
	const tl = gsap.timeline({ defaults: { ease: EASE } });
	tl.fromTo(cta, { autoAlpha: 0, y: 40, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9 });
	typeLines([...cta.querySelectorAll('.tlp-cta__cmd .ln')], tl, 0.022);
	tl.fromTo(
		cta.querySelectorAll('.tlp-cta__links > *'),
		{ autoAlpha: 0, y: 12 },
		{ autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 },
		'<0.2',
	);
	onEnter(cta, tl, 'top 85%');
}

function scrollProgress() {
	const bar = document.querySelector('.tlp-progress');
	if (!bar) return;
	gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

/* --- Interaction (also without motion) ---------------------------------- */

function copyButtons(root: Element) {
	root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
		const label = btn.querySelector('span');
		const idle = label?.textContent ?? '';
		btn.addEventListener('click', async () => {
			const text = btn.parentElement?.querySelector('[data-copy-text]')?.textContent?.trim() ?? '';
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				return; // no clipboard permission: the command stays selectable
			}
			btn.classList.add('is-done');
			if (label) label.textContent = btn.dataset.labelDone ?? idle;
			setTimeout(() => {
				btn.classList.remove('is-done');
				if (label) label.textContent = idle;
			}, 1800);
		});
	});
}

/** Hover a keyword in one pane → its counterpart in the other lights up. */
function keywordTwins(root: Element) {
	const [a, b] = [...root.querySelectorAll('.tlp-bilingual__pane')].map((p) => [...p.querySelectorAll('.kw')]);
	if (!a || !b) return;
	const pair = (list: Element[], other: Element[]) =>
		list.forEach((kw, i) => {
			const twin = other[i];
			if (!twin) return;
			kw.addEventListener('pointerenter', () => [kw, twin].forEach((k) => k.classList.add('is-paired')));
			kw.addEventListener('pointerleave', () => [kw, twin].forEach((k) => k.classList.remove('is-paired')));
		});
	pair(a, b);
	pair(b, a);
}

/** Feed the pointer position to every card so the edge light spans the grid. */
function bentoSpotlight(grid: HTMLElement) {
	const items = [...grid.querySelectorAll<HTMLElement>('.tlp-bento__item')];
	let frame = 0;
	grid.addEventListener('pointermove', (e) => {
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

/** The vertical (narrow-layout) rail spans first node → last node; CSS can't know that height. */
function measureRail(pipe: HTMLElement) {
	const nodes = pipe.querySelectorAll<HTMLElement>('.tlp-pipe__node');
	if (nodes.length < 2) return;
	const update = () => {
		const first = nodes[0].getBoundingClientRect();
		const last = nodes[nodes.length - 1].getBoundingClientRect();
		pipe.style.setProperty('--rail-h', `${Math.max(0, last.top - first.top)}px`);
	};
	new ResizeObserver(update).observe(pipe);
	update();
}

/* --- Boot ----------------------------------------------------------------- */

export function boot() {
	const landing = document.querySelector('.tlp-landing');
	if (!landing) return;
	const $$ = <T extends Element = HTMLElement>(sel: string) => [...landing.querySelectorAll<T>(sel)];
	const motion = document.documentElement.classList.contains('tlp-anim');

	$$('[data-pipe]').forEach(measureRail);
	copyButtons(landing);
	$$('[data-bilingual]').forEach(keywordTwins);
	$$('[data-bento]').forEach(bentoSpotlight);
	const hero = landing.querySelector<HTMLElement>('.tlp-hero');
	if (hero) heroCanvas(hero, motion);
	if (!motion) return;
	(window as any).__tlpMotion = true;

	if (hero) {
		const tl = heroTimeline(hero);
		bindTabTyping(hero, tl);
		heroTilt(hero);
		if (import.meta.env.DEV) {
			// Seek harness for screenshot checks: /?tlp-t=1.2 freezes the hero at 1.2s.
			const t = new URLSearchParams(location.search).get('tlp-t');
			if (t !== null) tl.pause(parseFloat(t));
		}
	}
	$$('.tlp-section__head').forEach(sectionHead);
	$$('[data-pipe]').forEach(pipelineMotion);
	$$('.tlp-bench').forEach(benchMotion);
	$$('.tlp-compare').forEach(compareMotion);
	$$('[data-bento]').forEach(bentoMotion);
	$$('[data-bilingual]').forEach(bilingualMotion);
	$$('.tlp-try').forEach(playgroundMotion);
	$$('.tlp-crud').forEach(crudMotion);
	$$('[data-cta]').forEach(ctaMotion);
	scrollProgress();

	// Reduced motion switched on mid-visit: jump everything to its end state.
	matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
		if (!e.matches) return;
		gsap.globalTimeline.getChildren(false, true, true).forEach((t) => t.progress(1));
		ScrollTrigger.getAll().forEach((st) => st.kill());
		document.documentElement.classList.remove('tlp-anim');
	});
}
