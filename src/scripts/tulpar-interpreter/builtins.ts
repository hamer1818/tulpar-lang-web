import {
	Env,
	NULL,
	TulparError,
	VOID,
	formatValue,
	isTruthy,
	makeArr,
	makeBool,
	makeFloat,
	makeInt,
	makeObj,
	makeStr,
} from './values.ts';
import type { Value } from './values.ts';

export function registerBuiltins(env: Env, write: (s: string) => void): void {
	const def = (name: string, fn: (args: Value[]) => Value) => {
		env.define(name, { kind: 'native', name, fn });
	};

	const unsupported = (name: string, hint?: string) => {
		def(name, () => {
			throw new TulparError(
				hint
					? `'${name}()' is not supported in the web playground — ${hint}`
					: `'${name}()' is not supported in the web playground. Run locally with the Tulpar CLI.`,
			);
		});
	};

	// === Output ===
	def('print', (args) => {
		const parts = args.map(formatValue);
		write(parts.join(' ') + '\n');
		return VOID;
	});
	def('println', (args) => {
		const parts = args.map(formatValue);
		write(parts.join(' ') + '\n');
		return VOID;
	});

	// === Type conversion ===
	def('toString', (args) => {
		const v = args[0] ?? NULL;
		return makeStr(formatValue(v));
	});
	def('toInt', (args) => {
		const v = args[0] ?? NULL;
		if (v.kind === 'int') return v;
		if (v.kind === 'float') return makeInt(v.value);
		if (v.kind === 'bool') return makeInt(v.value ? 1 : 0);
		if (v.kind === 'str') {
			const n = parseInt(v.value, 10);
			return Number.isNaN(n) ? makeInt(0) : makeInt(n);
		}
		throw new TulparError(`toInt: cannot convert ${v.kind}`);
	});
	def('toFloat', (args) => {
		const v = args[0] ?? NULL;
		if (v.kind === 'float') return v;
		if (v.kind === 'int') return makeFloat(v.value);
		if (v.kind === 'str') {
			const n = parseFloat(v.value);
			return Number.isNaN(n) ? makeFloat(0) : makeFloat(n);
		}
		throw new TulparError(`toFloat: cannot convert ${v.kind}`);
	});
	def('toBool', (args) => makeBool(isTruthy(args[0] ?? NULL)));

	// === Collection helpers ===
	def('length', (args) => {
		const v = args[0] ?? NULL;
		switch (v.kind) {
			case 'str':
				return makeInt(v.value.length);
			case 'array':
				return makeInt(v.value.length);
			case 'object':
				return makeInt(v.value.size);
			default:
				throw new TulparError(`length: cannot apply to ${v.kind}`);
		}
	});
	def('range', (args) => {
		const a0 = args[0];
		const a1 = args[1];
		const a2 = args[2];
		const toNum = (v: Value | undefined, fb: number) => {
			if (!v) return fb;
			if (v.kind === 'int' || v.kind === 'float') return v.value;
			throw new TulparError('range: numeric arg expected');
		};
		let start = 0;
		let stop = 0;
		let step = 1;
		if (a1 === undefined) {
			stop = toNum(a0, 0);
		} else if (a2 === undefined) {
			start = toNum(a0, 0);
			stop = toNum(a1, 0);
		} else {
			start = toNum(a0, 0);
			stop = toNum(a1, 0);
			step = toNum(a2, 1);
			if (step === 0) throw new TulparError('range: step cannot be zero');
		}
		const items: Value[] = [];
		if (step > 0) {
			for (let i = start; i < stop; i += step) items.push(makeInt(i));
		} else {
			for (let i = start; i > stop; i += step) items.push(makeInt(i));
		}
		return makeArr(items);
	});
	def('push', (args) => {
		const arr = args[0];
		if (!arr || arr.kind !== 'array') throw new TulparError('push: array expected');
		arr.value.push(args[1] ?? NULL);
		return arr;
	});
	def('pop', (args) => {
		const arr = args[0];
		if (!arr || arr.kind !== 'array') throw new TulparError('pop: array expected');
		return arr.value.pop() ?? NULL;
	});

	// === Strings ===
	const asStr = (v: Value | undefined, where: string): string => {
		if (!v || v.kind !== 'str') throw new TulparError(`${where}: string expected`);
		return v.value;
	};
	def('lower', (args) => makeStr(asStr(args[0], 'lower').toLowerCase()));
	def('upper', (args) => makeStr(asStr(args[0], 'upper').toUpperCase()));
	def('trim', (args) => makeStr(asStr(args[0], 'trim').trim()));
	def('split', (args) => {
		const s = asStr(args[0], 'split');
		const sep = asStr(args[1], 'split');
		return makeArr(s.split(sep).map(makeStr));
	});
	def('contains', (args) => {
		const haystack = args[0];
		const needle = args[1];
		if (!haystack || !needle) return makeBool(false);
		if (haystack.kind === 'str' && needle.kind === 'str') {
			return makeBool(haystack.value.includes(needle.value));
		}
		if (haystack.kind === 'array') {
			return makeBool(
				haystack.value.some((v) => formatValue(v) === formatValue(needle)),
			);
		}
		throw new TulparError('contains: string or array expected');
	});
	def('replace', (args) => {
		return makeStr(
			asStr(args[0], 'replace').split(asStr(args[1], 'replace')).join(asStr(args[2], 'replace')),
		);
	});
	def('indexOf', (args) => {
		return makeInt(asStr(args[0], 'indexOf').indexOf(asStr(args[1], 'indexOf')));
	});
	def('substring', (args) => {
		const s = asStr(args[0], 'substring');
		const a = args[1];
		const b = args[2];
		const start = a && (a.kind === 'int' || a.kind === 'float') ? Math.trunc(a.value) : 0;
		const end =
			b && (b.kind === 'int' || b.kind === 'float') ? Math.trunc(b.value) : s.length;
		return makeStr(s.substring(start, end));
	});
	def('startsWith', (args) =>
		makeBool(asStr(args[0], 'startsWith').startsWith(asStr(args[1], 'startsWith'))),
	);
	def('endsWith', (args) =>
		makeBool(asStr(args[0], 'endsWith').endsWith(asStr(args[1], 'endsWith'))),
	);

	// === Math ===
	const asNum = (v: Value | undefined, where: string): number => {
		if (!v || (v.kind !== 'int' && v.kind !== 'float')) {
			throw new TulparError(`${where}: numeric expected`);
		}
		return v.value;
	};
	def('abs', (args) => {
		const v = args[0];
		if (!v) throw new TulparError('abs: arg expected');
		if (v.kind === 'int') return makeInt(Math.abs(v.value));
		if (v.kind === 'float') return makeFloat(Math.abs(v.value));
		throw new TulparError('abs: numeric expected');
	});
	def('pow', (args) => makeFloat(Math.pow(asNum(args[0], 'pow'), asNum(args[1], 'pow'))));
	def('sqrt', (args) => makeFloat(Math.sqrt(asNum(args[0], 'sqrt'))));
	def('sin', (args) => makeFloat(Math.sin(asNum(args[0], 'sin'))));
	def('cos', (args) => makeFloat(Math.cos(asNum(args[0], 'cos'))));
	def('tan', (args) => makeFloat(Math.tan(asNum(args[0], 'tan'))));
	def('floor', (args) => makeInt(Math.floor(asNum(args[0], 'floor'))));
	def('ceil', (args) => makeInt(Math.ceil(asNum(args[0], 'ceil'))));
	def('round', (args) => makeInt(Math.round(asNum(args[0], 'round'))));
	def('min', (args) => {
		if (args.length === 0) throw new TulparError('min: at least one arg');
		let best = asNum(args[0], 'min');
		let isFloat = args[0].kind === 'float';
		for (let i = 1; i < args.length; i++) {
			const n = asNum(args[i], 'min');
			if (n < best) best = n;
			if (args[i].kind === 'float') isFloat = true;
		}
		return isFloat ? makeFloat(best) : makeInt(best);
	});
	def('max', (args) => {
		if (args.length === 0) throw new TulparError('max: at least one arg');
		let best = asNum(args[0], 'max');
		let isFloat = args[0].kind === 'float';
		for (let i = 1; i < args.length; i++) {
			const n = asNum(args[i], 'max');
			if (n > best) best = n;
			if (args[i].kind === 'float') isFloat = true;
		}
		return isFloat ? makeFloat(best) : makeInt(best);
	});
	def('random', () => makeFloat(Math.random()));

	// === Date / time ===
	const playgroundStart = Date.now();
	def('timestamp', () => makeInt(Math.floor(Date.now() / 1000)));
	def('time_ms', () => makeInt(Date.now()));
	def('clock_ms', () => makeInt(Date.now() - playgroundStart));
	def('now_iso8601', () => {
		const d = new Date();
		const pad = (n: number, w = 2) => String(n).padStart(w, '0');
		const iso =
			d.getUTCFullYear() +
			'-' +
			pad(d.getUTCMonth() + 1) +
			'-' +
			pad(d.getUTCDate()) +
			'T' +
			pad(d.getUTCHours()) +
			':' +
			pad(d.getUTCMinutes()) +
			':' +
			pad(d.getUTCSeconds()) +
			'Z';
		return makeStr(iso);
	});
	def('sleep', (args) => {
		// Browsers cannot block synchronously; emulate with a quick busy delay
		// only for tiny values, otherwise warn and skip so demos stay responsive.
		const ms = asNum(args[0] ?? makeInt(0), 'sleep');
		if (ms > 50) {
			write(`[playground] sleep(${ms}) skipped — busy-wait disabled in the browser.\n`);
			return VOID;
		}
		const end = Date.now() + ms;
		while (Date.now() < end) {
			// noop
		}
		return VOID;
	});

	// === Input — playground cannot prompt synchronously ===
	unsupported('input', 'no stdin in the browser');
	unsupported('inputInt', 'no stdin in the browser');
	unsupported('inputFloat', 'no stdin in the browser');
	unsupported('readLine', 'no stdin in the browser');

	// === I/O, network, db, threads, http — out of scope for the web sandbox ===
	for (const name of [
		'read_file',
		'write_file',
		'append_file',
		'file_exists',
		'remove_file',
		'list_dir',
		'mkdir',
		'rmdir',
	]) {
		unsupported(name, 'browsers have no filesystem access');
	}
	for (const name of [
		'socket_create',
		'socket_bind',
		'socket_listen',
		'socket_server',
		'socket_accept',
		'socket_connect',
		'socket_send',
		'socket_receive',
		'socket_close',
		'http_get',
		'http_post',
		'http_put',
		'http_delete',
		'http_get_json',
		'http_post_json',
	]) {
		unsupported(name, 'sockets and HTTP are blocked by browser sandboxing');
	}
	for (const name of [
		'db_open',
		'db_query',
		'db_exec',
		'db_close',
		'orm_open',
		'orm_close',
		'orm_create',
		'orm_find',
		'orm_all',
		'orm_update',
		'orm_delete',
		'orm_where',
		'define_model',
	]) {
		unsupported(name, 'SQLite/ORM is not bundled in the web playground');
	}
	for (const name of [
		'thread_create',
		'thread_join',
		'thread_detach',
		'thread_id',
		'mutex_create',
		'mutex_lock',
		'mutex_unlock',
	]) {
		unsupported(name, 'the web playground runs single-threaded');
	}
	for (const name of [
		'get',
		'post',
		'put',
		'delete',
		'listen',
		'listen_async',
		'wings_text',
		'wings_json',
		'wings_html',
	]) {
		unsupported(name, 'the Wings HTTP server needs the CLI');
	}
	// === Test framework — needs CLI ===
	for (const name of [
		'assert',
		'assert_eq_int',
		'assert_eq_str',
		'assert_eq_bool',
		'assert_contains',
		'assert_throws',
		'assert_status',
		'test',
		'test_summary',
	]) {
		unsupported(name, "the test runner ships with the CLI");
	}
}
