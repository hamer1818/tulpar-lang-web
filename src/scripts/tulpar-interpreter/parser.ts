import type { Token } from './lexer.ts';
import type {
	Node,
	Program,
	VarDecl,
	FuncDecl,
	Block,
	IfStmt,
	WhileStmt,
	ForStmt,
	ForInStmt,
	ReturnStmt,
	TryStmt,
	ThrowStmt,
	ImportStmt,
	ExprStmt,
	Identifier,
} from './ast.ts';

export class ParserError extends Error {
	line: number;
	col: number;
	constructor(message: string, line: number, col: number) {
		super(`Parser error at line ${line}, col ${col}: ${message}`);
		this.line = line;
		this.col = col;
	}
}

export function parse(tokens: Token[]): Program {
	const p = new Parser(tokens);
	return p.parseProgram();
}

class Parser {
	private pos = 0;
	private tokens: Token[];
	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	private peek(offset = 0): Token {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
	}

	private advance(): Token {
		const t = this.tokens[this.pos];
		if (this.pos < this.tokens.length - 1) this.pos++;
		return t;
	}

	private check(type: string, value?: string): boolean {
		const t = this.peek();
		if (t.type !== type) return false;
		if (value !== undefined && t.value !== value) return false;
		return true;
	}

	private match(type: string, value?: string): boolean {
		if (this.check(type, value)) {
			this.advance();
			return true;
		}
		return false;
	}

	private expect(type: string, value?: string, label?: string): Token {
		const t = this.peek();
		if (t.type !== type || (value !== undefined && t.value !== value)) {
			const what = label ?? (value !== undefined ? `${type} '${value}'` : type);
			throw new ParserError(
				`Expected ${what}, got ${t.type} '${t.value}'`,
				t.line,
				t.col,
			);
		}
		return this.advance();
	}

	parseProgram(): Program {
		const body: Node[] = [];
		while (!this.check('EOF')) {
			body.push(this.parseStatement());
		}
		const first = this.tokens[0];
		return { kind: 'Program', body, line: first?.line ?? 1, col: first?.col ?? 1 };
	}

	private parseStatement(): Node {
		const t = this.peek();

		// import "..."
		if (t.type === 'KEYWORD' && t.value === 'import') {
			this.advance();
			const str = this.expect('STRING', undefined, 'string after import');
			this.match('PUNCT', ';');
			return { kind: 'Import', path: str.value, line: t.line, col: t.col } as ImportStmt;
		}

		// func name(params) { ... }
		if (t.type === 'KEYWORD' && t.value === 'func') {
			return this.parseFuncDecl();
		}

		// if / while / for / try / throw / return / break / continue
		if (t.type === 'KEYWORD') {
			switch (t.value) {
				case 'if':
					return this.parseIf();
				case 'while':
					return this.parseWhile();
				case 'for':
					return this.parseFor();
				case 'try':
					return this.parseTry();
				case 'throw':
					return this.parseThrow();
				case 'return':
					return this.parseReturn();
				case 'break':
					this.advance();
					this.match('PUNCT', ';');
					return { kind: 'Break', line: t.line, col: t.col };
				case 'continue':
					this.advance();
					this.match('PUNCT', ';');
					return { kind: 'Continue', line: t.line, col: t.col };
			}
		}

		// Block
		if (t.type === 'PUNCT' && t.value === '{') {
			return this.parseBlock();
		}

		// Typed var decl: TYPE IDENT (= expr)? ;
		if (t.type === 'TYPE') {
			return this.parseVarDecl();
		}

		// Expression statement
		return this.parseExprStmt();
	}

	private parseFuncDecl(): FuncDecl {
		const start = this.advance(); // 'func'
		const name = this.expect('IDENT', undefined, 'function name').value;
		this.expect('PUNCT', '(');
		const params: { name: string; declType: string | null }[] = [];
		if (!this.check('PUNCT', ')')) {
			do {
				let declType: string | null = null;
				if (this.peek().type === 'TYPE') {
					declType = this.advance().value;
				}
				const paramName = this.expect('IDENT', undefined, 'parameter name').value;
				params.push({ name: paramName, declType });
			} while (this.match('PUNCT', ','));
		}
		this.expect('PUNCT', ')');
		const body = this.parseBlock();
		return {
			kind: 'FuncDecl',
			name,
			params,
			body,
			line: start.line,
			col: start.col,
		};
	}

	private parseBlock(): Block {
		const start = this.expect('PUNCT', '{');
		const body: Node[] = [];
		while (!this.check('PUNCT', '}') && !this.check('EOF')) {
			body.push(this.parseStatement());
		}
		this.expect('PUNCT', '}');
		return { kind: 'Block', body, line: start.line, col: start.col };
	}

	private parseIf(): IfStmt {
		const start = this.advance(); // 'if'
		this.expect('PUNCT', '(');
		const cond = this.parseExpression();
		this.expect('PUNCT', ')');
		const then = this.parseStatement();
		let else_: Node | null = null;
		if (this.match('KEYWORD', 'else')) {
			else_ = this.parseStatement();
		}
		return { kind: 'If', cond, then, else_, line: start.line, col: start.col };
	}

	private parseWhile(): WhileStmt {
		const start = this.advance(); // 'while'
		this.expect('PUNCT', '(');
		const cond = this.parseExpression();
		this.expect('PUNCT', ')');
		const body = this.parseStatement();
		return { kind: 'While', cond, body, line: start.line, col: start.col };
	}

	private parseFor(): ForStmt | ForInStmt {
		const start = this.advance(); // 'for'
		this.expect('PUNCT', '(');

		// for-in detection: IDENT 'in'
		const t0 = this.peek(0);
		const t1 = this.peek(1);
		if (t0.type === 'IDENT' && t1.type === 'KEYWORD' && t1.value === 'in') {
			const varName = this.advance().value;
			this.advance(); // 'in'
			const iter = this.parseExpression();
			this.expect('PUNCT', ')');
			const body = this.parseStatement();
			return {
				kind: 'ForIn',
				varName,
				iter,
				body,
				line: start.line,
				col: start.col,
			};
		}

		// C-style for
		let init: Node | null = null;
		if (!this.check('PUNCT', ';')) {
			if (this.peek().type === 'TYPE') {
				init = this.parseVarDecl(true); // no trailing ; consumption
			} else {
				init = { kind: 'ExprStmt', expr: this.parseExpression(), line: start.line, col: start.col } as ExprStmt;
			}
		}
		this.expect('PUNCT', ';');
		let cond: Node | null = null;
		if (!this.check('PUNCT', ';')) {
			cond = this.parseExpression();
		}
		this.expect('PUNCT', ';');
		let update: Node | null = null;
		if (!this.check('PUNCT', ')')) {
			update = this.parseExpression();
		}
		this.expect('PUNCT', ')');
		const body = this.parseStatement();
		return {
			kind: 'For',
			init,
			cond,
			update,
			body,
			line: start.line,
			col: start.col,
		};
	}

	private parseTry(): TryStmt {
		const start = this.advance(); // 'try'
		const body = this.parseBlock();
		let catchVar: string | null = null;
		let catchBody: Node | null = null;
		let finallyBody: Node | null = null;

		if (this.match('KEYWORD', 'catch')) {
			this.expect('PUNCT', '(');
			catchVar = this.expect('IDENT', undefined, 'catch parameter').value;
			this.expect('PUNCT', ')');
			catchBody = this.parseBlock();
		}
		if (this.match('KEYWORD', 'finally')) {
			finallyBody = this.parseBlock();
		}
		if (!catchBody && !finallyBody) {
			throw new ParserError("'try' must be followed by 'catch' or 'finally'", start.line, start.col);
		}
		return {
			kind: 'Try',
			body,
			catchVar,
			catchBody,
			finallyBody,
			line: start.line,
			col: start.col,
		};
	}

	private parseThrow(): ThrowStmt {
		const start = this.advance(); // 'throw'
		const value = this.parseExpression();
		this.match('PUNCT', ';');
		return { kind: 'Throw', value, line: start.line, col: start.col };
	}

	private parseReturn(): ReturnStmt {
		const start = this.advance(); // 'return'
		let value: Node | null = null;
		if (!this.check('PUNCT', ';') && !this.check('PUNCT', '}')) {
			value = this.parseExpression();
		}
		this.match('PUNCT', ';');
		return { kind: 'Return', value, line: start.line, col: start.col };
	}

	private parseVarDecl(insideFor = false): VarDecl {
		const typeTok = this.expect('TYPE');
		const name = this.expect('IDENT', undefined, 'variable name').value;
		let init: Node | null = null;
		if (this.match('OP', '=')) {
			init = this.parseExpression();
		}
		if (!insideFor) {
			this.match('PUNCT', ';');
		}
		return {
			kind: 'VarDecl',
			declType: typeTok.value,
			name,
			init,
			line: typeTok.line,
			col: typeTok.col,
		};
	}

	private parseExprStmt(): ExprStmt {
		const start = this.peek();
		const expr = this.parseExpression();
		this.match('PUNCT', ';');
		return { kind: 'ExprStmt', expr, line: start.line, col: start.col };
	}

	// === Expressions ===
	// Precedence ladder (lowest -> highest):
	// 1. Assignment (= += -= *= /= %=) right-associative
	// 2. ||
	// 3. &&
	// 4. == !=
	// 5. < > <= >=
	// 6. + -
	// 7. * / %
	// 8. unary (- ! +)
	// 9. postfix (++ --), call (), index [], member .

	private parseExpression(): Node {
		return this.parseAssignment();
	}

	private parseAssignment(): Node {
		const left = this.parseLogicalOr();
		const t = this.peek();
		if (
			t.type === 'OP' &&
			(t.value === '=' ||
				t.value === '+=' ||
				t.value === '-=' ||
				t.value === '*=' ||
				t.value === '/=' ||
				t.value === '%=')
		) {
			this.advance();
			const value = this.parseAssignment();
			if (
				left.kind !== 'Identifier' &&
				left.kind !== 'Index' &&
				left.kind !== 'Member'
			) {
				throw new ParserError(
					'Invalid assignment target',
					(left as { line: number }).line,
					(left as { col: number }).col,
				);
			}
			return {
				kind: 'Assign',
				target: left,
				op: t.value as Assign['op'],
				value,
				line: t.line,
				col: t.col,
			} as Assign;
		}
		return left;
	}

	private parseLogicalOr(): Node {
		let left = this.parseLogicalAnd();
		while (this.check('OP', '||')) {
			const op = this.advance();
			const right = this.parseLogicalAnd();
			left = {
				kind: 'LogicalOp',
				op: '||',
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseLogicalAnd(): Node {
		let left = this.parseEquality();
		while (this.check('OP', '&&')) {
			const op = this.advance();
			const right = this.parseEquality();
			left = {
				kind: 'LogicalOp',
				op: '&&',
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseEquality(): Node {
		let left = this.parseComparison();
		while (this.check('OP', '==') || this.check('OP', '!=')) {
			const op = this.advance();
			const right = this.parseComparison();
			left = {
				kind: 'BinaryOp',
				op: op.value,
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseComparison(): Node {
		let left = this.parseAdditive();
		while (
			this.check('OP', '<') ||
			this.check('OP', '>') ||
			this.check('OP', '<=') ||
			this.check('OP', '>=')
		) {
			const op = this.advance();
			const right = this.parseAdditive();
			left = {
				kind: 'BinaryOp',
				op: op.value,
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseAdditive(): Node {
		let left = this.parseMultiplicative();
		while (this.check('OP', '+') || this.check('OP', '-')) {
			const op = this.advance();
			const right = this.parseMultiplicative();
			left = {
				kind: 'BinaryOp',
				op: op.value,
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseMultiplicative(): Node {
		let left = this.parseUnary();
		while (this.check('OP', '*') || this.check('OP', '/') || this.check('OP', '%')) {
			const op = this.advance();
			const right = this.parseUnary();
			left = {
				kind: 'BinaryOp',
				op: op.value,
				left,
				right,
				line: op.line,
				col: op.col,
			};
		}
		return left;
	}

	private parseUnary(): Node {
		if (this.check('OP', '-') || this.check('OP', '!') || this.check('OP', '+')) {
			const op = this.advance();
			const operand = this.parseUnary();
			return {
				kind: 'UnaryOp',
				op: op.value as '-' | '!' | '+',
				operand,
				line: op.line,
				col: op.col,
			};
		}
		// prefix ++/-- — not in spec but harmless to ignore; treat as postfix-like
		if (this.check('OP', '++') || this.check('OP', '--')) {
			const op = this.advance();
			const operand = this.parseUnary();
			// model as compound assignment to keep semantics
			const one: Node = {
				kind: 'IntLit',
				value: 1,
				line: op.line,
				col: op.col,
			};
			return {
				kind: 'Assign',
				target: operand,
				op: op.value === '++' ? '+=' : '-=',
				value: one,
				line: op.line,
				col: op.col,
			} as Assign;
		}
		return this.parsePostfix();
	}

	private parsePostfix(): Node {
		let expr = this.parsePrimary();
		// chain: ++ -- () [] .
		while (true) {
			const t = this.peek();
			if (t.type === 'OP' && (t.value === '++' || t.value === '--')) {
				this.advance();
				expr = {
					kind: 'Postfix',
					op: t.value as '++' | '--',
					operand: expr,
					line: t.line,
					col: t.col,
				};
			} else if (t.type === 'PUNCT' && t.value === '(') {
				this.advance();
				const args: Node[] = [];
				if (!this.check('PUNCT', ')')) {
					do {
						args.push(this.parseExpression());
					} while (this.match('PUNCT', ','));
				}
				this.expect('PUNCT', ')');
				expr = {
					kind: 'Call',
					callee: expr,
					args,
					line: t.line,
					col: t.col,
				};
			} else if (t.type === 'PUNCT' && t.value === '[') {
				this.advance();
				const index = this.parseExpression();
				this.expect('PUNCT', ']');
				expr = {
					kind: 'Index',
					target: expr,
					index,
					line: t.line,
					col: t.col,
				};
			} else if (t.type === 'PUNCT' && t.value === '.') {
				this.advance();
				const name = this.expect('IDENT', undefined, 'member name').value;
				expr = {
					kind: 'Member',
					target: expr,
					name,
					line: t.line,
					col: t.col,
				};
			} else {
				break;
			}
		}
		return expr;
	}

	private parsePrimary(): Node {
		const t = this.peek();

		if (t.type === 'NUMBER') {
			this.advance();
			if (t.numberKind === 'float') {
				return {
					kind: 'FloatLit',
					value: t.numberValue ?? 0,
					line: t.line,
					col: t.col,
				};
			}
			return {
				kind: 'IntLit',
				value: t.numberValue ?? 0,
				line: t.line,
				col: t.col,
			};
		}

		if (t.type === 'STRING') {
			this.advance();
			return {
				kind: 'StringLit',
				value: t.value,
				line: t.line,
				col: t.col,
			};
		}

		if (t.type === 'KEYWORD' && t.value === 'true') {
			this.advance();
			return { kind: 'BoolLit', value: true, line: t.line, col: t.col };
		}
		if (t.type === 'KEYWORD' && t.value === 'false') {
			this.advance();
			return { kind: 'BoolLit', value: false, line: t.line, col: t.col };
		}
		if (t.type === 'KEYWORD' && t.value === 'null') {
			this.advance();
			return { kind: 'NullLit', line: t.line, col: t.col };
		}

		if (t.type === 'IDENT') {
			this.advance();
			return { kind: 'Identifier', name: t.value, line: t.line, col: t.col } as Identifier;
		}

		if (t.type === 'PUNCT' && t.value === '(') {
			this.advance();
			const expr = this.parseExpression();
			this.expect('PUNCT', ')');
			return expr;
		}

		if (t.type === 'PUNCT' && t.value === '[') {
			this.advance();
			const elements: Node[] = [];
			if (!this.check('PUNCT', ']')) {
				do {
					elements.push(this.parseExpression());
				} while (this.match('PUNCT', ','));
			}
			this.expect('PUNCT', ']');
			return { kind: 'ArrayLit', elements, line: t.line, col: t.col };
		}

		if (t.type === 'PUNCT' && t.value === '{') {
			return this.parseObjectLit();
		}

		throw new ParserError(
			`Unexpected token '${t.value}'`,
			t.line,
			t.col,
		);
	}

	private parseObjectLit(): Node {
		const start = this.expect('PUNCT', '{');
		const pairs: { key: string; value: Node }[] = [];
		if (!this.check('PUNCT', '}')) {
			do {
				if (this.check('PUNCT', '}')) break; // trailing comma tolerance
				const keyTok = this.peek();
				let key: string;
				if (keyTok.type === 'STRING') {
					key = this.advance().value;
				} else if (keyTok.type === 'IDENT') {
					key = this.advance().value;
				} else {
					throw new ParserError(
						"Expected string or identifier as object key",
						keyTok.line,
						keyTok.col,
					);
				}
				this.expect('PUNCT', ':');
				const value = this.parseExpression();
				pairs.push({ key, value });
			} while (this.match('PUNCT', ','));
		}
		this.expect('PUNCT', '}');
		return { kind: 'ObjectLit', pairs, line: start.line, col: start.col };
	}
}

// Local alias to satisfy the strict re-import path used in the assignment helper.
type Assign = import('./ast.ts').Assign;
type ExprStmt = import('./ast.ts').ExprStmt;
