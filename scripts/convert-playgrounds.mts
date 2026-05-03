/**
 * One-shot doc converter: walk every .mdx in src/content/docs and replace
 *   ```tulpar
 *   ...print(...)...
 *   ```
 * with <TulparPlayground ... /> — but only when the snippet actually executes
 * cleanly under the playground interpreter. Reference-style snippets and
 * blocks that depend on unsupported features (sockets, db, file I/O, threads,
 * structs, etc.) keep their plain code-block rendering.
 *
 * Run: node --experimental-strip-types scripts/convert-playgrounds.mts
 */

import { readFile, writeFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import * as path from 'node:path';
import { runTulparCode } from '../src/scripts/tulpar-interpreter/index.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'src', 'content', 'docs');

interface Block {
	start: number; // index of opening ``` line (0-based)
	end: number; // index of closing ``` line
	code: string; // body, no fences
	heading: string | null;
}

function findTulparBlocks(lines: string[]): Block[] {
	const blocks: Block[] = [];
	let lastHeading: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const h = /^#{2,6}\s+(.+?)\s*$/.exec(line);
		if (h) {
			lastHeading = h[1].replace(/`/g, '').trim();
		}
		if (line.trimEnd() === '```tulpar') {
			let j = i + 1;
			while (j < lines.length && lines[j].trimEnd() !== '```') j++;
			if (j >= lines.length) break;
			blocks.push({
				start: i,
				end: j,
				code: lines.slice(i + 1, j).join('\n'),
				heading: lastHeading,
			});
			i = j;
		}
	}
	return blocks;
}

function relImportPath(filePath: string): string {
	const fromDir = path.dirname(filePath);
	const target = path.join(ROOT, 'src', 'components', 'TulparPlayground.astro');
	let rel = path.relative(fromDir, target).replace(/\\/g, '/');
	if (!rel.startsWith('.')) rel = './' + rel;
	return rel;
}

function escapeCodeForRaw(code: string): string {
	// String.raw template: only backticks and ${ break parsing. None expected
	// in Tulpar source, but guard anyway.
	return code.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function escapeAttr(s: string): string {
	return s.replace(/"/g, '&quot;');
}

let converted = 0;
let skipped = 0;
let errored = 0;
const reasons = new Map<string, number>();

for await (const fileRel of glob('**/*.{md,mdx}', { cwd: DOCS })) {
	const filePath = path.join(DOCS, fileRel);
	const original = await readFile(filePath, 'utf8');
	const lines = original.split(/\r?\n/);
	const blocks = findTulparBlocks(lines);
	if (blocks.length === 0) continue;

	const replacements: { start: number; end: number; replacement: string[] }[] = [];
	for (const block of blocks) {
		if (!/\bprint(?:ln)?\s*\(/.test(block.code)) {
			skipped++;
			continue;
		}
		const result = await runTulparCode(block.code);
		if (result.error) {
			errored++;
			const key = result.error.split('\n')[0].slice(0, 80);
			reasons.set(key, (reasons.get(key) ?? 0) + 1);
			continue;
		}
		const title = block.heading ?? 'Tulpar';
		const escapedCode = escapeCodeForRaw(block.code);
		const replacement = [
			`<TulparPlayground`,
			`\ttitle="${escapeAttr(title)}"`,
			'\tcode={String.raw`' + escapedCode + '`}',
			`/>`,
		];
		replacements.push({ start: block.start, end: block.end, replacement });
		converted++;
	}

	if (replacements.length === 0) continue;

	// Apply replacements bottom-up so indices stay valid.
	const newLines = [...lines];
	for (const r of [...replacements].reverse()) {
		newLines.splice(r.start, r.end - r.start + 1, ...r.replacement);
	}

	// Inject the import if missing.
	const importPath = relImportPath(filePath);
	const importLine = `import TulparPlayground from '${importPath}';`;
	if (!newLines.some((l) => /TulparPlayground/.test(l) && /^import\s/.test(l))) {
		// Insert after frontmatter (--- ... ---). Aim for: ---\n\nimport ...\n\n<rest>.
		let i = 0;
		if (newLines[0]?.trim() === '---') {
			i = 1;
			while (i < newLines.length && newLines[i].trim() !== '---') i++;
			i = i + 1;
		}
		// Aim for one blank above and below the import. Reuse existing blanks
		// instead of stacking duplicates.
		const hasBlankBefore = newLines[i] === '';
		if (hasBlankBefore) i++;
		const insert: string[] = [];
		if (!hasBlankBefore) insert.push('');
		insert.push(importLine);
		if (newLines[i] !== '') insert.push('');
		newLines.splice(i, 0, ...insert);
	}

	const updated = newLines.join('\n');
	if (updated !== original) {
		await writeFile(filePath, updated, 'utf8');
		console.log(`  rewrote ${path.relative(ROOT, filePath)} — ${replacements.length} block(s)`);
	}
}

console.log(`\nConverted: ${converted}`);
console.log(`Skipped (no print): ${skipped}`);
console.log(`Skipped (interpreter rejected): ${errored}`);
if (reasons.size > 0) {
	console.log(`\nTop reasons for skip:`);
	const sorted = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
	for (const [r, n] of sorted) console.log(`  ${n.toString().padStart(3)}  ${r}`);
}
