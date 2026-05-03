export type TokenType =
	| 'NUMBER'
	| 'STRING'
	| 'IDENT'
	| 'KEYWORD'
	| 'TYPE'
	| 'PUNCT'
	| 'OP'
	| 'EOF';

export interface Token {
	type: TokenType;
	value: string;
	line: number;
	col: number;
	numberKind?: 'int' | 'float';
	numberValue?: number;
}

const KEYWORDS = new Set([
	'if',
	'else',
	'while',
	'for',
	'in',
	'break',
	'continue',
	'func',
	'return',
	'true',
	'false',
	'try',
	'catch',
	'finally',
	'throw',
	'import',
	'null',
]);

const TYPES = new Set([
	'int',
	'float',
	'str',
	'bool',
	'array',
	'arrayInt',
	'arrayFloat',
	'arrayStr',
	'arrayBool',
	'arrayJson',
	'json',
	'void',
]);

const TWO_CHAR_OPS = new Set([
	'==',
	'!=',
	'<=',
	'>=',
	'&&',
	'||',
	'++',
	'--',
	'+=',
	'-=',
	'*=',
	'/=',
	'%=',
]);

const SINGLE_CHAR_OPS = new Set([
	'+',
	'-',
	'*',
	'/',
	'%',
	'=',
	'<',
	'>',
	'!',
]);

const PUNCT = new Set(['(', ')', '{', '}', '[', ']', ',', ';', '.', ':']);

export class LexerError extends Error {
	line: number;
	col: number;
	constructor(message: string, line: number, col: number) {
		super(`Lexer error at line ${line}, col ${col}: ${message}`);
		this.line = line;
		this.col = col;
	}
}

export function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	let line = 1;
	let col = 1;
	const len = source.length;

	const peek = (offset = 0) => (i + offset < len ? source[i + offset] : '');
	const advance = () => {
		const ch = source[i];
		i++;
		if (ch === '\n') {
			line++;
			col = 1;
		} else {
			col++;
		}
		return ch;
	};

	while (i < len) {
		const startLine = line;
		const startCol = col;
		const ch = peek();

		// Whitespace
		if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
			advance();
			continue;
		}

		// Line comment
		if (ch === '/' && peek(1) === '/') {
			while (i < len && peek() !== '\n') advance();
			continue;
		}

		// Block comment
		if (ch === '/' && peek(1) === '*') {
			advance();
			advance();
			while (i < len && !(peek() === '*' && peek(1) === '/')) advance();
			if (i < len) {
				advance();
				advance();
			}
			continue;
		}

		// String literal
		if (ch === '"') {
			advance();
			let value = '';
			while (i < len && peek() !== '"') {
				const c = peek();
				if (c === '\\') {
					advance();
					const esc = peek();
					switch (esc) {
						case 'n':
							value += '\n';
							break;
						case 't':
							value += '\t';
							break;
						case 'r':
							value += '\r';
							break;
						case '\\':
							value += '\\';
							break;
						case '"':
							value += '"';
							break;
						case "'":
							value += "'";
							break;
						case '0':
							value += '\0';
							break;
						default:
							value += esc;
					}
					advance();
				} else if (c === '\n') {
					throw new LexerError('Unterminated string literal', startLine, startCol);
				} else {
					value += advance();
				}
			}
			if (i >= len) {
				throw new LexerError('Unterminated string literal', startLine, startCol);
			}
			advance();
			tokens.push({ type: 'STRING', value, line: startLine, col: startCol });
			continue;
		}

		// Numbers (supports 0x, 0o, 0b, decimal, float, scientific)
		if (isDigit(ch)) {
			let raw = '';
			let kind: 'int' | 'float' = 'int';
			let numericValue: number;

			if (ch === '0' && (peek(1) === 'x' || peek(1) === 'X')) {
				raw += advance();
				raw += advance();
				while (i < len && isHex(peek())) raw += advance();
				numericValue = parseInt(raw.slice(2), 16);
			} else if (ch === '0' && (peek(1) === 'o' || peek(1) === 'O')) {
				raw += advance();
				raw += advance();
				while (i < len && isOct(peek())) raw += advance();
				numericValue = parseInt(raw.slice(2), 8);
			} else if (ch === '0' && (peek(1) === 'b' || peek(1) === 'B')) {
				raw += advance();
				raw += advance();
				while (i < len && (peek() === '0' || peek() === '1')) raw += advance();
				numericValue = parseInt(raw.slice(2), 2);
			} else {
				while (i < len && isDigit(peek())) raw += advance();
				if (peek() === '.' && isDigit(peek(1))) {
					kind = 'float';
					raw += advance();
					while (i < len && isDigit(peek())) raw += advance();
				}
				if (peek() === 'e' || peek() === 'E') {
					kind = 'float';
					raw += advance();
					if (peek() === '+' || peek() === '-') raw += advance();
					while (i < len && isDigit(peek())) raw += advance();
				}
				numericValue = kind === 'float' ? parseFloat(raw) : parseInt(raw, 10);
			}

			tokens.push({
				type: 'NUMBER',
				value: raw,
				line: startLine,
				col: startCol,
				numberKind: kind,
				numberValue: numericValue,
			});
			continue;
		}

		// Identifier / keyword / type
		if (isIdentStart(ch)) {
			let value = '';
			while (i < len && isIdentCont(peek())) value += advance();
			let type: TokenType = 'IDENT';
			if (KEYWORDS.has(value)) type = 'KEYWORD';
			else if (TYPES.has(value)) type = 'TYPE';
			tokens.push({ type, value, line: startLine, col: startCol });
			continue;
		}

		// Punctuation
		if (PUNCT.has(ch)) {
			advance();
			tokens.push({ type: 'PUNCT', value: ch, line: startLine, col: startCol });
			continue;
		}

		// Two-char ops
		const two = ch + peek(1);
		if (TWO_CHAR_OPS.has(two)) {
			advance();
			advance();
			tokens.push({ type: 'OP', value: two, line: startLine, col: startCol });
			continue;
		}

		// Single-char ops
		if (SINGLE_CHAR_OPS.has(ch)) {
			advance();
			tokens.push({ type: 'OP', value: ch, line: startLine, col: startCol });
			continue;
		}

		throw new LexerError(`Unexpected character: ${JSON.stringify(ch)}`, startLine, startCol);
	}

	tokens.push({ type: 'EOF', value: '', line, col });
	return tokens;
}

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}
function isHex(ch: string): boolean {
	return isDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}
function isOct(ch: string): boolean {
	return ch >= '0' && ch <= '7';
}
function isIdentStart(ch: string): boolean {
	return (
		(ch >= 'a' && ch <= 'z') ||
		(ch >= 'A' && ch <= 'Z') ||
		ch === '_' ||
		// allow Unicode letters (Turkish identifiers)
		ch.charCodeAt(0) > 127
	);
}
function isIdentCont(ch: string): boolean {
	return isIdentStart(ch) || isDigit(ch);
}
