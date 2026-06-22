// User-facing playground messages. The docs site renders English pages at the
// root and Turkish under /tr/; the playground passes the page locale here so an
// English page never shows Turkish error text (and vice versa).

export type Locale = 'en' | 'tr';

export interface Messages {
	lexerError: (line: number) => string;
	parserError: (line: number) => string;
	runtimeError: (line: number | null | undefined) => string;
	uncaughtThrow: (value: string) => string;
	unsupportedWithHint: (name: string, hint: string) => string;
	unsupportedNoHint: (name: string) => string;
	execLimit: (ops: string) => string;
	hints: {
		stdin: string;
		fs: string;
		net: string;
		db: string;
		threads: string;
		wings: string;
		test: string;
	};
}

const EN: Messages = {
	lexerError: (l) => `Lexer error (line ${l}): `,
	parserError: (l) => `Parser error (line ${l}): `,
	runtimeError: (l) => `Runtime error${l ? ` (line ${l})` : ''}: `,
	uncaughtThrow: (v) => `Uncaught throw: ${v}`,
	unsupportedWithHint: (name, hint) =>
		`'${name}()' is not supported in the web playground — ${hint}`,
	unsupportedNoHint: (name) =>
		`'${name}()' is not supported in the web playground. Run locally with the Tulpar CLI.`,
	execLimit: (ops) =>
		`Execution limit exceeded (over ${ops} operations). The web playground caps long-running programs — try smaller inputs.`,
	hints: {
		stdin: 'no stdin in the browser',
		fs: 'browsers have no filesystem access',
		net: 'sockets and HTTP are blocked by browser sandboxing',
		db: 'SQLite/ORM is not bundled in the web playground',
		threads: 'the web playground runs single-threaded',
		wings: 'the Wings HTTP server needs the CLI',
		test: 'the test runner ships with the CLI',
	},
};

const TR: Messages = {
	lexerError: (l) => `Sözcük hatası (satır ${l}): `,
	parserError: (l) => `Söz dizimi hatası (satır ${l}): `,
	runtimeError: (l) => `Çalışma zamanı hatası${l ? ` (satır ${l})` : ''}: `,
	uncaughtThrow: (v) => `Yakalanmayan throw: ${v}`,
	unsupportedWithHint: (name, hint) =>
		`'${name}()' web playground'da desteklenmiyor — ${hint}`,
	unsupportedNoHint: (name) =>
		`'${name}()' web playground'da desteklenmiyor. Tulpar CLI ile yerelde çalıştırın.`,
	execLimit: (ops) =>
		`Çalıştırma sınırı aşıldı (${ops} işlemden fazla). Web playground uzun süren programları sınırlar — daha küçük girdiler deneyin.`,
	hints: {
		stdin: 'tarayıcıda stdin yok',
		fs: 'tarayıcıların dosya sistemi erişimi yok',
		net: 'soketler ve HTTP tarayıcı sandbox’ı tarafından engellenir',
		db: 'SQLite/ORM web playground’a paketlenmemiştir',
		threads: 'web playground tek thread çalışır',
		wings: 'Wings HTTP sunucusu CLI gerektirir',
		test: 'test koşucusu CLI ile gelir',
	},
};

export function messages(locale: Locale): Messages {
	return locale === 'tr' ? TR : EN;
}
