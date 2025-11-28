// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Tulpar Language',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/hamer1818/TulparLang' }],
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'Getting Started', slug: 'intro/getting-started' },
						{ label: 'Installation', slug: 'intro/installation' },
					],
				},
				{
					label: 'Language Guide',
					items: [
						{ label: 'Syntax & Variables', slug: 'guide/syntax' },
						{ label: 'Control Flow', slug: 'guide/control-flow' },
						{ label: 'Functions', slug: 'guide/functions' },
						{ label: 'Arrays & JSON', slug: 'guide/arrays-json' },
						{ label: 'Structs', slug: 'guide/structs' },
						{ label: 'Modules & Imports', slug: 'guide/modules' },
					],
				},
				{
					label: 'Standard Library',
					items: [
						{ label: 'Built-in Functions', slug: 'stdlib/builtins' },
						{ label: 'Math Functions', slug: 'stdlib/math' },
						{ label: 'String Functions', slug: 'stdlib/string' },
						{ label: 'File I/O', slug: 'stdlib/file-io' },
						{ label: 'Network (Sockets)', slug: 'stdlib/network' },
						{ label: 'Database (SQLite)', slug: 'stdlib/database' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Basic Examples', slug: 'examples/basic' },
						{ label: 'Advanced Examples', slug: 'examples/advanced' },
					],
				},
			],
		}),
	],
});
