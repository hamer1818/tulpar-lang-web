/**
 * Generates public/llms.txt and public/llms-full.txt per the llms.txt
 * convention (https://llmstxt.org/) from the English docs in
 * src/content/docs. Run automatically as a prebuild step (see
 * package.json's "build" script) so both files stay in sync with the docs.
 *
 * llms.txt: a short, curated index (one link per page) — the format coding
 * agents (Claude Code, Cursor, Copilot) look for when pointed at a docs site.
 * llms-full.txt: the entire English doc set concatenated as plain text, for
 * agents that want the whole language reference in a single fetch.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'src', 'content', 'docs');
const SITE = 'https://tulparlang.dev';

const SECTION_LABELS = {
	intro: 'Introduction',
	faq: 'FAQ',
	guide: 'Language Guide',
	stdlib: 'Standard Library',
	ecosystem: 'Ecosystem & Tooling',
	reference: 'Reference',
	examples: 'Examples',
};
const SECTION_ORDER = Object.keys(SECTION_LABELS);

function parseFrontmatter(raw) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
	if (!match) return { data: {}, body: raw };
	const data = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
		if (kv) data[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
	}
	return { data, body: raw.slice(match[0].length) };
}

function slugFor(fileRel) {
	const noExt = fileRel.replace(/\.mdx?$/, '');
	if (noExt === 'index') return '/';
	return `/${noExt}/`;
}

// Turns the hand-authored MDX (custom playground/tab components) into plain
// markdown so an LLM reading llms-full.txt as text gets real ```tulpar
// fences instead of raw JSX.
function mdxToPlainMarkdown(body) {
	let out = body;
	out = out.replace(/^import\s.*$/gm, '');
	out = out.replace(/<TulparPlayground\b([\s\S]*?)\/>/g, (_, attrs) => {
		const titleMatch = /title="([^"]*)"/.exec(attrs);
		const codeMatch = /code=\{String\.raw`([\s\S]*?)`\}|code=\{`([\s\S]*?)`\}/.exec(attrs);
		const title = titleMatch ? titleMatch[1] : null;
		let code = codeMatch ? (codeMatch[1] ?? codeMatch[2]) : '';
		code = code.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
		const heading = title ? `**${title}**\n\n` : '';
		return `${heading}\`\`\`tulpar\n${code}\n\`\`\``;
	});
	out = out.replace(/<\/?TulparTabs[^>]*>/g, '');
	out = out.replace(/<TulparTabItem\s+label="([^"]*)"[^>]*>/g, '\n**$1**\n');
	out = out.replace(/<\/TulparTabItem>/g, '');
	out = out.replace(/\n{3,}/g, '\n\n');
	return out.trim();
}

async function loadDocs() {
	const docs = [];
	for await (const fileRel of glob('**/*.{md,mdx}', { cwd: DOCS })) {
		if (fileRel.startsWith('tr/') || fileRel === '404.mdx') continue;
		const filePath = path.join(DOCS, fileRel);
		const raw = await readFile(filePath, 'utf8');
		const { data, body } = parseFrontmatter(raw);
		const section =
			fileRel === 'index.mdx' ? null : fileRel.includes('/') ? fileRel.split('/')[0] : fileRel.replace(/\.mdx?$/, '');
		docs.push({
			fileRel,
			section,
			title: data.title ?? fileRel,
			description: data.description ?? '',
			url: SITE + slugFor(fileRel),
			body,
		});
	}
	docs.sort((a, b) => a.fileRel.localeCompare(b.fileRel));
	return docs;
}

function buildLlmsTxt(docs) {
	const home = docs.find((d) => d.section === null);
	const lines = [];
	lines.push(`# Tulpar Language`);
	lines.push('');
	lines.push(`> ${home?.description ?? 'A statically-typed, AOT-compiled programming language with an LLVM backend.'}`);
	lines.push('');
	lines.push(
		'Tulpar compiles ahead-of-time via LLVM (no bytecode VM, no REPL) and ships HTTP, JSON, SQLite, an ORM and OpenAPI generation built into the runtime. Source files use the `.tpr` extension.',
	);
	lines.push('');

	for (const section of SECTION_ORDER) {
		const pages = docs.filter((d) => d.section === section);
		if (pages.length === 0) continue;
		lines.push(`## ${SECTION_LABELS[section]}`);
		for (const d of pages) {
			const desc = d.description ? `: ${d.description}` : '';
			lines.push(`- [${d.title}](${d.url})${desc}`);
		}
		lines.push('');
	}

	lines.push('## Optional');
	lines.push(
		`- [Full documentation](${SITE}/llms-full.txt): every page above concatenated as plain text, for agents that want the whole language reference in one fetch.`,
	);
	lines.push(`- [GitHub repository](https://github.com/hamer1818/TulparLang): compiler source, issues, releases.`);
	lines.push('');

	return lines.join('\n');
}

function buildLlmsFullTxt(docs) {
	const home = docs.find((d) => d.section === null);
	const rest = docs.filter((d) => d.section !== null);
	const ordered = home ? [home, ...rest] : rest;

	const parts = [];
	for (const d of ordered) {
		parts.push(`# ${d.title}`);
		parts.push(`Source: ${d.url}`);
		if (d.description) parts.push(`\n${d.description}`);
		parts.push('');
		parts.push(mdxToPlainMarkdown(d.body));
		parts.push('\n---\n');
	}
	return parts.join('\n');
}

const docs = await loadDocs();
await writeFile(path.join(ROOT, 'public', 'llms.txt'), buildLlmsTxt(docs), 'utf8');
await writeFile(path.join(ROOT, 'public', 'llms-full.txt'), buildLlmsFullTxt(docs), 'utf8');
console.log(`llms.txt / llms-full.txt written from ${docs.length} English doc pages.`);
