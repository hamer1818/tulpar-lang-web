import type { Node } from './ast.ts';

export type Value =
	| { kind: 'int'; value: number }
	| { kind: 'float'; value: number }
	| { kind: 'str'; value: string }
	| { kind: 'bool'; value: boolean }
	| { kind: 'array'; value: Value[] }
	| { kind: 'object'; value: Map<string, Value> }
	| { kind: 'null' }
	| { kind: 'void' }
	| {
			kind: 'function';
			name: string;
			params: { name: string; declType: string | null }[];
			body: Node;
			closure: Env;
	  }
	| {
			kind: 'native';
			name: string;
			fn: (args: Value[]) => Value;
	  };

export class TulparError extends Error {
	line?: number;
	col?: number;
	constructor(message: string, line?: number, col?: number) {
		super(message);
		this.line = line;
		this.col = col;
	}
}

export class TulparThrow {
	value: Value;
	constructor(value: Value) {
		this.value = value;
	}
}

export class ReturnSignal {
	value: Value;
	constructor(value: Value) {
		this.value = value;
	}
}

export class BreakSignal {}
export class ContinueSignal {}

export class Env {
	private vars = new Map<string, Value>();
	parent: Env | null;
	constructor(parent: Env | null = null) {
		this.parent = parent;
	}

	define(name: string, value: Value): void {
		this.vars.set(name, value);
	}

	get(name: string): Value | undefined {
		if (this.vars.has(name)) return this.vars.get(name);
		if (this.parent) return this.parent.get(name);
		return undefined;
	}

	set(name: string, value: Value): boolean {
		if (this.vars.has(name)) {
			this.vars.set(name, value);
			return true;
		}
		if (this.parent) return this.parent.set(name, value);
		return false;
	}

	defineOrSet(name: string, value: Value): void {
		if (!this.set(name, value)) this.define(name, value);
	}

	has(name: string): boolean {
		if (this.vars.has(name)) return true;
		return this.parent ? this.parent.has(name) : false;
	}
}

export const NULL: Value = { kind: 'null' };
export const VOID: Value = { kind: 'void' };

export function makeInt(n: number): Value {
	return { kind: 'int', value: Math.trunc(n) };
}
export function makeFloat(n: number): Value {
	return { kind: 'float', value: n };
}
export function makeStr(s: string): Value {
	return { kind: 'str', value: s };
}
export function makeBool(b: boolean): Value {
	return { kind: 'bool', value: b };
}
export function makeArr(items: Value[]): Value {
	return { kind: 'array', value: items };
}
export function makeObj(pairs: [string, Value][] = []): Value {
	const m = new Map<string, Value>();
	for (const [k, v] of pairs) m.set(k, v);
	return { kind: 'object', value: m };
}

export function isTruthy(v: Value): boolean {
	switch (v.kind) {
		case 'bool':
			return v.value;
		case 'int':
		case 'float':
			return v.value !== 0;
		case 'str':
			return v.value.length > 0;
		case 'array':
			return v.value.length > 0;
		case 'object':
			return v.value.size > 0;
		case 'null':
		case 'void':
			return false;
		default:
			return true;
	}
}

export function valuesEqual(a: Value, b: Value): boolean {
	if ((a.kind === 'int' || a.kind === 'float') && (b.kind === 'int' || b.kind === 'float')) {
		return a.value === b.value;
	}
	if (a.kind !== b.kind) return false;
	switch (a.kind) {
		case 'str':
			return a.value === (b as { value: string }).value;
		case 'bool':
			return a.value === (b as { value: boolean }).value;
		case 'null':
		case 'void':
			return true;
		case 'array': {
			const ba = b as Extract<Value, { kind: 'array' }>;
			if (a.value.length !== ba.value.length) return false;
			for (let i = 0; i < a.value.length; i++) {
				if (!valuesEqual(a.value[i], ba.value[i])) return false;
			}
			return true;
		}
		case 'object': {
			const bo = b as Extract<Value, { kind: 'object' }>;
			if (a.value.size !== bo.value.size) return false;
			for (const [k, v] of a.value) {
				if (!bo.value.has(k)) return false;
				if (!valuesEqual(v, bo.value.get(k)!)) return false;
			}
			return true;
		}
		default:
			return a === b;
	}
}

/**
 * Format a value the same way Tulpar's runtime print does:
 * - int  -> %lld
 * - float -> %g (trims trailing zeros)
 * - str  -> raw chars
 * - bool -> "true" / "false"
 * - array -> [a, b, c]
 * - object -> {"key": value, ...}
 */
export function formatValue(v: Value): string {
	switch (v.kind) {
		case 'int':
			return String(v.value);
		case 'float':
			return formatFloat(v.value);
		case 'str':
			return v.value;
		case 'bool':
			return v.value ? 'true' : 'false';
		case 'null':
			return 'null';
		case 'void':
			return 'void';
		case 'array':
			return '[' + v.value.map(formatValueQuoted).join(', ') + ']';
		case 'object': {
			const parts: string[] = [];
			for (const [k, val] of v.value) {
				parts.push('"' + k + '": ' + formatValueQuoted(val));
			}
			return '{' + parts.join(', ') + '}';
		}
		case 'function':
			return `<func ${v.name}>`;
		case 'native':
			return `<native ${v.name}>`;
	}
}

function formatValueQuoted(v: Value): string {
	if (v.kind === 'str') return '"' + v.value + '"';
	return formatValue(v);
}

function formatFloat(n: number): string {
	if (!Number.isFinite(n)) {
		if (Number.isNaN(n)) return 'nan';
		return n > 0 ? 'inf' : '-inf';
	}
	// emulate %g — at most 6 significant digits, drop trailing zeros, scientific when extreme
	const abs = Math.abs(n);
	if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) {
		return n.toExponential(5).replace(/0+e/, 'e').replace(/\.e/, 'e');
	}
	let s = n.toPrecision(6);
	if (s.includes('.')) {
		s = s.replace(/0+$/, '').replace(/\.$/, '');
	}
	return s;
}
