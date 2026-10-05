// Signal grid: light pulses running along the page's 40px background grid
// (as if it were a bus), dots on its intersections, and a soft halo that
// follows the pointer. Used behind the landing hero and every doc page
// header. Plain Canvas 2D: the static dots are rasterised once into an
// offscreen layer and only lit things are drawn per frame. The loop sleeps
// while the host is off-screen or the tab is hidden; without `animate`
// only the static matrix is drawn.

const GAP = 40; // must match the body background grid in custom.css
const BASE_ALPHA = 0.28;
const HALO = 170;
const MAX_SIGNALS = 9;

interface Signal {
	horizontal: boolean;
	lane: number; // row (horizontal) or column (vertical)
	forward: boolean;
	head: number; // position in cells
	speed: number; // cells / second
	len: number; // trail length in cells
}

function accentRgb(): string {
	const hex = getComputedStyle(document.documentElement).getPropertyValue('--sl-color-accent').trim();
	const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
	return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '0,229,255';
}

export interface SignalGridOptions {
	/** Upper bound on concurrent pulses (smaller hosts want fewer). */
	maxSignals?: number;
	/** Milliseconds between pulse spawns. */
	spawnEvery?: number;
}

/** `host` receives pointer events and gates the loop on visibility; `canvas` is drawn into. */
export function signalGrid(host: HTMLElement, canvas: HTMLCanvasElement | null, animate: boolean, opts: SignalGridOptions = {}) {
	const maxSignals = opts.maxSignals ?? MAX_SIGNALS;
	const spawnEvery = opts.spawnEvery ?? 420;
	const ctx = canvas?.getContext('2d');
	if (!canvas || !ctx) return;

	const base = document.createElement('canvas');
	const bctx = base.getContext('2d')!;
	let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, ox = 0, oy = 0;
	let rgb = accentRgb();
	const signals: Signal[] = [];
	const pointer = { x: 0, y: 0, on: false };
	let visible = true;
	let raf = 0;
	let last = 0;
	let lastSpawn = 0;

	const dot = (c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) => {
		c.globalAlpha = a;
		c.beginPath();
		c.arc(x, y, r, 0, Math.PI * 2);
		c.fill();
	};

	function layout() {
		const rect = canvas!.getBoundingClientRect();
		w = rect.width;
		h = rect.height;
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		for (const c of [canvas!, base]) {
			c.width = Math.round(w * dpr);
			c.height = Math.round(h * dpr);
		}
		// Land on the body grid's line crossings: tiles are centred
		// horizontally (`center top`), so lines sit at centre − 20 + k·40.
		const bodyW = document.body.clientWidth;
		const pageTop = rect.top + window.scrollY;
		ox = (((bodyW / 2 - GAP / 2 - rect.left) % GAP) + GAP) % GAP + 0.5;
		oy = ((GAP - (pageTop % GAP)) % GAP) + 0.5;
		cols = Math.floor((w - ox) / GAP) + 1;
		rows = Math.floor((h - oy) / GAP) + 1;

		bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		bctx.clearRect(0, 0, w, h);
		bctx.fillStyle = `rgb(${rgb})`;
		for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dot(bctx, ox + c * GAP, oy + r * GAP, 1.2, BASE_ALPHA);
		draw(0);
	}

	function spawn() {
		const horizontal = Math.random() < 0.6;
		signals.push({
			horizontal,
			lane: Math.floor(Math.random() * (horizontal ? rows : cols)),
			forward: Math.random() < 0.5,
			head: 0,
			speed: 5 + Math.random() * 6,
			len: 3 + Math.random() * 4,
		});
	}

	function draw(dt: number) {
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx!.clearRect(0, 0, w, h);
		ctx!.globalAlpha = 1;
		ctx!.drawImage(base, 0, 0, w, h);
		ctx!.fillStyle = `rgb(${rgb})`;

		for (let i = signals.length - 1; i >= 0; i--) {
			const s = signals[i];
			s.head += s.speed * dt;
			const span = s.horizontal ? cols : rows;
			if (s.head - s.len > span) {
				signals.splice(i, 1);
				continue;
			}
			// A streak along the wire: transparent tail → bright head.
			const at = (cells: number) => {
				const along = (s.forward ? cells : span - 1 - cells) * GAP;
				return s.horizontal
					? [ox + along, oy + s.lane * GAP]
					: [ox + s.lane * GAP, oy + along];
			};
			const [hx, hy] = at(Math.min(s.head, span - 1));
			const [tx, ty] = at(Math.max(0, s.head - s.len));
			const g = ctx!.createLinearGradient(tx, ty, hx, hy);
			g.addColorStop(0, `rgba(${rgb},0)`);
			g.addColorStop(1, `rgba(${rgb},0.9)`);
			ctx!.globalAlpha = 1;
			ctx!.strokeStyle = g;
			ctx!.lineWidth = 1.5;
			ctx!.beginPath();
			ctx!.moveTo(tx, ty);
			ctx!.lineTo(hx, hy);
			ctx!.stroke();
			if (s.head <= span - 1) {
				dot(ctx!, hx, hy, 2.2, 0.95);
				dot(ctx!, hx, hy, 7, 0.14);
			}
		}

		if (pointer.on) {
			const c0 = Math.max(0, Math.floor((pointer.x - ox - HALO) / GAP));
			const c1 = Math.min(cols - 1, Math.ceil((pointer.x - ox + HALO) / GAP));
			const r0 = Math.max(0, Math.floor((pointer.y - oy - HALO) / GAP));
			const r1 = Math.min(rows - 1, Math.ceil((pointer.y - oy + HALO) / GAP));
			for (let r = r0; r <= r1; r++) {
				for (let c = c0; c <= c1; c++) {
					const x = ox + c * GAP, y = oy + r * GAP;
					const d = Math.hypot(x - pointer.x, y - pointer.y);
					if (d > HALO) continue;
					const f = 1 - d / HALO;
					dot(ctx!, x, y, 1.2 + f * 1.8, 0.15 + f * f * 0.8);
				}
			}
		}
		ctx!.globalAlpha = 1;
	}

	function tick(now: number) {
		raf = 0;
		const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
		last = now;
		if (now - lastSpawn > spawnEvery && signals.length < maxSignals) {
			spawn();
			lastSpawn = now;
		}
		draw(dt);
		schedule();
	}

	function schedule() {
		if (!raf && animate && visible && !document.hidden) raf = requestAnimationFrame(tick);
		else if (!visible || document.hidden) last = 0;
	}

	new ResizeObserver(layout).observe(canvas);
	new MutationObserver(() => {
		rgb = accentRgb();
		layout();
	}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	if (!animate) return;

	new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		schedule();
	}).observe(host);
	document.addEventListener('visibilitychange', schedule);

	host.addEventListener('pointermove', (e) => {
		const rect = canvas.getBoundingClientRect();
		pointer.x = e.clientX - rect.left;
		pointer.y = e.clientY - rect.top;
		pointer.on = e.pointerType === 'mouse';
	});
	host.addEventListener('pointerleave', () => (pointer.on = false));
	schedule();
}
