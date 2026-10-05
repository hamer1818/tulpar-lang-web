// Build-time highlighter for the landing page's hand-picked Tulpar snippets.
// Emits `.kw/.str/.num/.fn/.cm` spans (styled in custom.css) and wraps every
// source line in `.ln`, which LandingMotion uses for the typing reveal.

// English + Turkish keywords and type names (both spellings compile to the same thing).
const KEYWORDS = new Set([
	'import', 'func', 'return', 'if', 'else', 'for', 'while', 'in', 'var', 'break', 'continue',
	'true', 'false', 'null', 'try', 'catch', 'finally', 'throw', 'match', 'async', 'await',
	'int', 'float', 'str', 'bool', 'array', 'json', 'void',
	'içe_aktar', 'fonk', 'döndür', 'eğer', 'değilse', 'için', 'içinde', 'değişken', 'iken',
	'tamsayi', 'ondalik', 'metin', 'mantiksal', 'doğru', 'yanlış',
]);

const TOKEN = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*")|(\b\d+(?:\.\d+)?\b)|([\p{L}_][\p{L}\p{N}_]*)/gu;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlightTulpar(code: string): string {
	let out = '';
	let last = 0;
	for (const m of code.matchAll(TOKEN)) {
		const [text, comment, string, number, ident] = m;
		const start = m.index ?? 0;
		out += escape(code.slice(last, start));
		last = start + text.length;
		let cls = '';
		if (comment) cls = 'cm';
		else if (string) cls = 'str';
		else if (number) cls = 'num';
		else if (ident && KEYWORDS.has(ident)) cls = 'kw';
		else if (ident && /^\s*\(/.test(code.slice(last))) cls = 'fn';
		out += cls ? `<span class="${cls}">${escape(text)}</span>` : escape(text);
	}
	out += escape(code.slice(last));
	// Tokens never span lines, so splitting the highlighted HTML on \n is safe.
	return out
		.split('\n')
		.map((line) => `<span class="ln">${line}</span>`)
		.join('\n');
}
