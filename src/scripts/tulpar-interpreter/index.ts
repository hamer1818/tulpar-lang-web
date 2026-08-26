import { tokenize, LexerError } from './lexer.ts';
import { parse, ParserError } from './parser.ts';
import { Evaluator } from './evaluator.ts';
import { TulparError, TulparThrow, formatValue } from './values.ts';
import { registerBuiltins } from './builtins.ts';
import { messages, type Locale } from './i18n.ts';

export interface RunResult {
	output: string;
	error: string | null;
}

export async function runTulparCode(code: string, locale: Locale = 'en'): Promise<RunResult> {
	let buffer = '';
	const write = (s: string) => {
		buffer += s;
	};
	const m = messages(locale);

	try {
		const tokens = tokenize(code);
		const program = parse(tokens);
		const evaluator = new Evaluator({ stdout: write, locale });
		registerBuiltins(evaluator.globals, write, locale);
		evaluator.run(program);
		return { output: buffer, error: null };
	} catch (e) {
		if (e instanceof LexerError) {
			return { output: buffer, error: m.lexerError(e.line) + e.message.replace(/^Lexer error.*?: /, '') };
		}
		if (e instanceof ParserError) {
			return { output: buffer, error: m.parserError(e.line) + e.message.replace(/^Parser error.*?: /, '') };
		}
		if (e instanceof TulparError) {
			return { output: buffer, error: m.runtimeError(e.line) + e.message };
		}
		if (e instanceof TulparThrow) {
			return { output: buffer, error: m.uncaughtThrow(formatValue(e.value)) };
		}
		return { output: buffer, error: (e as Error).message ?? String(e) };
	}
}

export default {
	run: runTulparCode,
};
