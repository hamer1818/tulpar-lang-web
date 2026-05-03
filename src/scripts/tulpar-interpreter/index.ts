import { tokenize, LexerError } from './lexer.ts';
import { parse, ParserError } from './parser.ts';
import { Evaluator } from './evaluator.ts';
import { TulparError, TulparThrow, formatValue } from './values.ts';
import { registerBuiltins } from './builtins.ts';

export interface RunResult {
	output: string;
	error: string | null;
}

export async function runTulparCode(code: string): Promise<RunResult> {
	let buffer = '';
	const write = (s: string) => {
		buffer += s;
	};

	try {
		const tokens = tokenize(code);
		const program = parse(tokens);
		const evaluator = new Evaluator({ stdout: write });
		registerBuiltins(evaluator.globals, write);
		evaluator.run(program);
		return { output: buffer, error: null };
	} catch (e) {
		if (e instanceof LexerError) {
			return { output: buffer, error: `Lexer error (line ${e.line}): ${e.message.replace(/^Lexer error.*?: /, '')}` };
		}
		if (e instanceof ParserError) {
			return { output: buffer, error: `Parser error (line ${e.line}): ${e.message.replace(/^Parser error.*?: /, '')}` };
		}
		if (e instanceof TulparError) {
			const where = e.line ? ` (line ${e.line})` : '';
			return { output: buffer, error: `Runtime error${where}: ${e.message}` };
		}
		if (e instanceof TulparThrow) {
			return { output: buffer, error: `Uncaught throw: ${formatValue(e.value)}` };
		}
		return { output: buffer, error: (e as Error).message ?? String(e) };
	}
}

export default {
	run: runTulparCode,
};
