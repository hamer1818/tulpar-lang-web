import type {
	Node,
	Program,
	VarDecl,
	Assign,
	BinaryOp,
	LogicalOp,
	UnaryOp,
	Postfix,
	Call,
	IndexExpr,
	MemberExpr,
	IntLit,
	FloatLit,
	StringLit,
	BoolLit,
	Identifier,
	ArrayLit,
	ObjectLit,
	Block,
	IfStmt,
	WhileStmt,
	ForStmt,
	ForInStmt,
	FuncDecl,
	ReturnStmt,
	TryStmt,
	ThrowStmt,
	ExprStmt,
	ImportStmt,
} from './ast.ts';
import {
	BreakSignal,
	ContinueSignal,
	Env,
	NULL,
	ReturnSignal,
	TulparError,
	TulparThrow,
	VOID,
	formatValue,
	isTruthy,
	makeArr,
	makeBool,
	makeFloat,
	makeInt,
	makeObj,
	makeStr,
	valuesEqual,
} from './values.ts';
import type { Value } from './values.ts';

export interface RunOptions {
	stdout: (line: string) => void;
	maxOps?: number; // execution-step ceiling to keep the browser alive
}

export interface RunContext {
	stdout: (s: string) => void;
	ops: number;
	maxOps: number;
}

export class Evaluator {
	private globalEnv = new Env(null);
	private ctx: RunContext;

	constructor(opts: RunOptions) {
		this.ctx = {
			stdout: opts.stdout,
			ops: 0,
			maxOps: opts.maxOps ?? 5_000_000,
		};
	}

	get globals(): Env {
		return this.globalEnv;
	}

	run(program: Program): void {
		// First pass: hoist function declarations so call-before-define works.
		for (const stmt of program.body) {
			if (stmt.kind === 'FuncDecl') {
				this.execFuncDecl(stmt as FuncDecl, this.globalEnv);
			}
		}
		for (const stmt of program.body) {
			if (stmt.kind === 'FuncDecl') continue;
			this.execStmt(stmt, this.globalEnv);
		}
	}

	private tick(line?: number): void {
		this.ctx.ops++;
		if (this.ctx.ops > this.ctx.maxOps) {
			throw new TulparError(
				'Execution limit exceeded (over ' +
					this.ctx.maxOps.toLocaleString() +
					' operations). The web playground caps long-running programs — try smaller inputs.',
				line,
			);
		}
	}

	private execStmt(node: Node, env: Env): void {
		this.tick(node.line);
		switch (node.kind) {
			case 'VarDecl':
				this.execVarDecl(node, env);
				return;
			case 'ExprStmt':
				this.evaluate((node as ExprStmt).expr, env);
				return;
			case 'Block':
				this.execBlock(node as Block, new Env(env));
				return;
			case 'If':
				this.execIf(node as IfStmt, env);
				return;
			case 'While':
				this.execWhile(node as WhileStmt, env);
				return;
			case 'For':
				this.execFor(node as ForStmt, env);
				return;
			case 'ForIn':
				this.execForIn(node as ForInStmt, env);
				return;
			case 'FuncDecl':
				this.execFuncDecl(node as FuncDecl, env);
				return;
			case 'Return': {
				const r = node as ReturnStmt;
				const v = r.value ? this.evaluate(r.value, env) : VOID;
				throw new ReturnSignal(v);
			}
			case 'Break':
				throw new BreakSignal();
			case 'Continue':
				throw new ContinueSignal();
			case 'Try':
				this.execTry(node as TryStmt, env);
				return;
			case 'Throw': {
				const t = node as ThrowStmt;
				const v = this.evaluate(t.value, env);
				throw new TulparThrow(v);
			}
			case 'Import':
				// Modules are not loaded in the playground. Silently ignore.
				return;
			default:
				throw new TulparError(`Unsupported statement: ${node.kind}`, node.line);
		}
	}

	private execVarDecl(node: VarDecl, env: Env): void {
		let value: Value;
		if (node.init) {
			value = this.evaluate(node.init, env);
			value = coerceToDeclType(value, node.declType);
		} else {
			value = defaultForType(node.declType);
		}
		env.define(node.name, value);
	}

	private execBlock(node: Block, env: Env): void {
		for (const s of node.body) {
			this.execStmt(s, env);
		}
	}

	private execIf(node: IfStmt, env: Env): void {
		const cond = this.evaluate(node.cond, env);
		if (isTruthy(cond)) {
			this.execStmt(node.then, env);
		} else if (node.else_) {
			this.execStmt(node.else_, env);
		}
	}

	private execWhile(node: WhileStmt, env: Env): void {
		while (true) {
			const c = this.evaluate(node.cond, env);
			if (!isTruthy(c)) break;
			try {
				this.execStmt(node.body, env);
			} catch (e) {
				if (e instanceof BreakSignal) break;
				if (e instanceof ContinueSignal) continue;
				throw e;
			}
		}
	}

	private execFor(node: ForStmt, env: Env): void {
		const loopEnv = new Env(env);
		if (node.init) this.execStmt(node.init, loopEnv);
		while (true) {
			if (node.cond) {
				const c = this.evaluate(node.cond, loopEnv);
				if (!isTruthy(c)) break;
			}
			try {
				this.execStmt(node.body, loopEnv);
			} catch (e) {
				if (e instanceof BreakSignal) break;
				if (e instanceof ContinueSignal) {
					// fall through to update
				} else {
					throw e;
				}
			}
			if (node.update) this.evaluate(node.update, loopEnv);
		}
	}

	private execForIn(node: ForInStmt, env: Env): void {
		const iter = this.evaluate(node.iter, env);
		const loopEnv = new Env(env);
		loopEnv.define(node.varName, NULL);
		const items = iterableValues(iter, node.line);
		for (const item of items) {
			loopEnv.set(node.varName, item);
			try {
				this.execStmt(node.body, loopEnv);
			} catch (e) {
				if (e instanceof BreakSignal) break;
				if (e instanceof ContinueSignal) continue;
				throw e;
			}
		}
	}

	private execFuncDecl(node: FuncDecl, env: Env): void {
		const fn: Value = {
			kind: 'function',
			name: node.name,
			params: node.params,
			body: node.body,
			closure: env,
		};
		env.define(node.name, fn);
	}

	private execTry(node: TryStmt, env: Env): void {
		try {
			this.execStmt(node.body, new Env(env));
		} catch (e) {
			if (e instanceof TulparThrow) {
				if (node.catchBody) {
					const catchEnv = new Env(env);
					if (node.catchVar) catchEnv.define(node.catchVar, e.value);
					this.execStmt(node.catchBody, catchEnv);
				} else {
					if (node.finallyBody) this.execStmt(node.finallyBody, new Env(env));
					throw e;
				}
			} else {
				if (node.finallyBody) this.execStmt(node.finallyBody, new Env(env));
				throw e;
			}
		}
		if (node.finallyBody) this.execStmt(node.finallyBody, new Env(env));
	}

	// === Expressions ===

	evaluate(node: Node, env: Env): Value {
		this.tick(node.line);
		switch (node.kind) {
			case 'IntLit':
				return makeInt((node as IntLit).value);
			case 'FloatLit':
				return makeFloat((node as FloatLit).value);
			case 'StringLit':
				return makeStr((node as StringLit).value);
			case 'BoolLit':
				return makeBool((node as BoolLit).value);
			case 'NullLit':
				return NULL;
			case 'Identifier': {
				const id = node as Identifier;
				const v = env.get(id.name);
				if (v === undefined) {
					throw new TulparError(`Undefined name '${id.name}'`, node.line);
				}
				return v;
			}
			case 'ArrayLit': {
				const arr = node as ArrayLit;
				return makeArr(arr.elements.map((e) => this.evaluate(e, env)));
			}
			case 'ObjectLit': {
				const obj = node as ObjectLit;
				const pairs: [string, Value][] = obj.pairs.map((p) => [
					p.key,
					this.evaluate(p.value, env),
				]);
				return makeObj(pairs);
			}
			case 'BinaryOp':
				return this.evalBinary(node as BinaryOp, env);
			case 'LogicalOp':
				return this.evalLogical(node as LogicalOp, env);
			case 'UnaryOp':
				return this.evalUnary(node as UnaryOp, env);
			case 'Postfix':
				return this.evalPostfix(node as Postfix, env);
			case 'Assign':
				return this.evalAssign(node as Assign, env);
			case 'Call':
				return this.evalCall(node as Call, env);
			case 'Index':
				return this.evalIndex(node as IndexExpr, env);
			case 'Member':
				return this.evalMember(node as MemberExpr, env);
			case 'ExprStmt':
				return this.evaluate((node as ExprStmt).expr, env);
		}
		throw new TulparError(`Unsupported expression: ${node.kind}`, node.line);
	}

	private evalBinary(node: BinaryOp, env: Env): Value {
		const left = this.evaluate(node.left, env);
		const right = this.evaluate(node.right, env);
		return applyBinary(node.op, left, right, node.line);
	}

	private evalLogical(node: LogicalOp, env: Env): Value {
		const left = this.evaluate(node.left, env);
		if (node.op === '&&') {
			if (!isTruthy(left)) return makeBool(false);
			const right = this.evaluate(node.right, env);
			return makeBool(isTruthy(right));
		}
		// ||
		if (isTruthy(left)) return makeBool(true);
		const right = this.evaluate(node.right, env);
		return makeBool(isTruthy(right));
	}

	private evalUnary(node: UnaryOp, env: Env): Value {
		const v = this.evaluate(node.operand, env);
		switch (node.op) {
			case '-':
				if (v.kind === 'int') return makeInt(-v.value);
				if (v.kind === 'float') return makeFloat(-v.value);
				throw new TulparError(`Cannot negate ${v.kind}`, node.line);
			case '+':
				return v;
			case '!':
				return makeBool(!isTruthy(v));
		}
	}

	private evalPostfix(node: Postfix, env: Env): Value {
		const old = this.evaluate(node.operand, env);
		const delta = node.op === '++' ? 1 : -1;
		let next: Value;
		if (old.kind === 'int') next = makeInt(old.value + delta);
		else if (old.kind === 'float') next = makeFloat(old.value + delta);
		else throw new TulparError(`Cannot ${node.op} non-numeric`, node.line);
		this.assignTo(node.operand, next, env);
		return old;
	}

	private evalAssign(node: Assign, env: Env): Value {
		let next: Value;
		if (node.op === '=') {
			next = this.evaluate(node.value, env);
		} else {
			const cur = this.evaluate(node.target, env);
			const rhs = this.evaluate(node.value, env);
			const op = node.op[0]; // strip the trailing '='
			next = applyBinary(op, cur, rhs, node.line);
		}
		this.assignTo(node.target, next, env);
		return next;
	}

	private assignTo(target: Node, value: Value, env: Env): void {
		if (target.kind === 'Identifier') {
			const name = (target as Identifier).name;
			if (env.has(name)) env.set(name, value);
			else env.define(name, value);
			return;
		}
		if (target.kind === 'Index') {
			const t = target as IndexExpr;
			const container = this.evaluate(t.target, env);
			const idx = this.evaluate(t.index, env);
			assignIndex(container, idx, value, t.line);
			return;
		}
		if (target.kind === 'Member') {
			const t = target as MemberExpr;
			const container = this.evaluate(t.target, env);
			if (container.kind !== 'object') {
				throw new TulparError('Member assignment on non-object', t.line);
			}
			container.value.set(t.name, value);
			return;
		}
		throw new TulparError('Invalid assignment target', target.line);
	}

	private evalCall(node: Call, env: Env): Value {
		const callee = this.evaluate(node.callee, env);
		const args = node.args.map((a) => this.evaluate(a, env));

		if (callee.kind === 'native') {
			try {
				return callee.fn(args);
			} catch (e) {
				if (e instanceof TulparError) throw e;
				if (e instanceof TulparThrow) throw e;
				throw new TulparError(
					`Error in '${callee.name}': ${(e as Error).message}`,
					node.line,
				);
			}
		}
		if (callee.kind === 'function') {
			const callEnv = new Env(callee.closure);
			for (let i = 0; i < callee.params.length; i++) {
				const p = callee.params[i];
				const arg = i < args.length ? args[i] : VOID;
				callEnv.define(p.name, p.declType ? coerceToDeclType(arg, p.declType) : arg);
			}
			try {
				this.execStmt(callee.body, callEnv);
			} catch (e) {
				if (e instanceof ReturnSignal) return e.value;
				throw e;
			}
			return VOID;
		}
		throw new TulparError(`Not callable: ${callee.kind}`, node.line);
	}

	private evalIndex(node: IndexExpr, env: Env): Value {
		const target = this.evaluate(node.target, env);
		const idx = this.evaluate(node.index, env);
		return readIndex(target, idx, node.line);
	}

	private evalMember(node: MemberExpr, env: Env): Value {
		const target = this.evaluate(node.target, env);
		if (target.kind === 'object') {
			const v = target.value.get(node.name);
			return v ?? NULL;
		}
		throw new TulparError(`Cannot read member '${node.name}' on ${target.kind}`, node.line);
	}
}

// === Helpers ===

function coerceToDeclType(v: Value, declType: string): Value {
	if (!declType) return v;
	switch (declType) {
		case 'int':
			if (v.kind === 'int') return v;
			if (v.kind === 'float') return makeInt(v.value);
			if (v.kind === 'bool') return makeInt(v.value ? 1 : 0);
			if (v.kind === 'str') {
				const n = parseInt(v.value, 10);
				return Number.isNaN(n) ? makeInt(0) : makeInt(n);
			}
			return v;
		case 'float':
			if (v.kind === 'float') return v;
			if (v.kind === 'int') return makeFloat(v.value);
			if (v.kind === 'str') {
				const n = parseFloat(v.value);
				return Number.isNaN(n) ? makeFloat(0) : makeFloat(n);
			}
			return v;
		case 'str':
			if (v.kind === 'str') return v;
			return makeStr(formatValue(v));
		case 'bool':
			if (v.kind === 'bool') return v;
			return makeBool(isTruthy(v));
		default:
			return v;
	}
}

function defaultForType(declType: string): Value {
	switch (declType) {
		case 'int':
			return makeInt(0);
		case 'float':
			return makeFloat(0);
		case 'str':
			return makeStr('');
		case 'bool':
			return makeBool(false);
		case 'array':
		case 'arrayInt':
		case 'arrayFloat':
		case 'arrayStr':
		case 'arrayBool':
			return makeArr([]);
		case 'arrayJson':
		case 'json':
			return makeObj();
		default:
			return NULL;
	}
}

function applyBinary(op: string, a: Value, b: Value, line?: number): Value {
	if (op === '+') {
		if (a.kind === 'str' || b.kind === 'str') {
			return makeStr(formatValue(a) + formatValue(b));
		}
		if (a.kind === 'array' && b.kind === 'array') {
			return makeArr([...a.value, ...b.value]);
		}
		return numericOp(a, b, '+', line);
	}
	if (op === '-' || op === '*' || op === '/' || op === '%') {
		return numericOp(a, b, op, line);
	}
	if (op === '==') return makeBool(valuesEqual(a, b));
	if (op === '!=') return makeBool(!valuesEqual(a, b));
	if (op === '<' || op === '>' || op === '<=' || op === '>=') {
		return compareOp(a, b, op, line);
	}
	throw new TulparError(`Unsupported operator '${op}'`, line);
}

function numericOp(a: Value, b: Value, op: string, line?: number): Value {
	if (
		(a.kind !== 'int' && a.kind !== 'float') ||
		(b.kind !== 'int' && b.kind !== 'float')
	) {
		throw new TulparError(`Cannot apply '${op}' to ${a.kind} and ${b.kind}`, line);
	}
	const isFloat = a.kind === 'float' || b.kind === 'float';
	const x = a.value;
	const y = b.value;
	let r: number;
	switch (op) {
		case '+':
			r = x + y;
			break;
		case '-':
			r = x - y;
			break;
		case '*':
			r = x * y;
			break;
		case '/':
			if (y === 0) throw new TulparError('Division by zero', line);
			if (isFloat) r = x / y;
			else r = Math.trunc(x / y);
			break;
		case '%':
			if (y === 0) throw new TulparError('Modulo by zero', line);
			r = x % y;
			break;
		default:
			throw new TulparError(`Unsupported numeric op '${op}'`, line);
	}
	return isFloat ? makeFloat(r) : makeInt(r);
}

function compareOp(a: Value, b: Value, op: string, line?: number): Value {
	let cmp: number;
	if (
		(a.kind === 'int' || a.kind === 'float') &&
		(b.kind === 'int' || b.kind === 'float')
	) {
		cmp = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
	} else if (a.kind === 'str' && b.kind === 'str') {
		cmp = a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
	} else {
		throw new TulparError(`Cannot compare ${a.kind} and ${b.kind}`, line);
	}
	switch (op) {
		case '<':
			return makeBool(cmp < 0);
		case '>':
			return makeBool(cmp > 0);
		case '<=':
			return makeBool(cmp <= 0);
		case '>=':
			return makeBool(cmp >= 0);
	}
	return makeBool(false);
}

function readIndex(container: Value, idx: Value, line?: number): Value {
	if (container.kind === 'array') {
		if (idx.kind !== 'int' && idx.kind !== 'float') {
			throw new TulparError('Array index must be integer', line);
		}
		const i = Math.trunc(idx.value);
		if (i < 0 || i >= container.value.length) {
			throw new TulparError(`Array index out of range: ${i}`, line);
		}
		return container.value[i];
	}
	if (container.kind === 'object') {
		const key = idx.kind === 'str' ? idx.value : formatValue(idx);
		const v = container.value.get(key);
		return v ?? NULL;
	}
	if (container.kind === 'str') {
		if (idx.kind !== 'int' && idx.kind !== 'float') {
			throw new TulparError('String index must be integer', line);
		}
		const i = Math.trunc(idx.value);
		if (i < 0 || i >= container.value.length) {
			throw new TulparError(`String index out of range: ${i}`, line);
		}
		return makeStr(container.value[i]);
	}
	throw new TulparError(`Cannot index ${container.kind}`, line);
}

function assignIndex(container: Value, idx: Value, value: Value, line?: number): void {
	if (container.kind === 'array') {
		if (idx.kind !== 'int' && idx.kind !== 'float') {
			throw new TulparError('Array index must be integer', line);
		}
		const i = Math.trunc(idx.value);
		while (container.value.length <= i) container.value.push(NULL);
		container.value[i] = value;
		return;
	}
	if (container.kind === 'object') {
		const key = idx.kind === 'str' ? idx.value : formatValue(idx);
		container.value.set(key, value);
		return;
	}
	throw new TulparError(`Cannot assign index on ${container.kind}`, line);
}

function iterableValues(v: Value, line?: number): Value[] {
	if (v.kind === 'array') return v.value;
	if (v.kind === 'object') return Array.from(v.value.keys()).map((k) => makeStr(k));
	if (v.kind === 'str') return Array.from(v.value).map((c) => makeStr(c));
	throw new TulparError(`Cannot iterate ${v.kind}`, line);
}
