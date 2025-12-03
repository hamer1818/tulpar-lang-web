// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Tulpar Language',
			favicon: './public/favicon.svg',

			customCss: ['./src/styles/custom.css'],
			logo: {
				src: './src/assets/icon.png',
			},
			head: [
				{ tag: 'link', attrs: { rel: 'icon', href: '/icon.png', type: 'image/png' } },
			],
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
				tr: {
					label: 'Türkçe',
					lang: 'tr',
				},
			},
			expressiveCode: {
				themes: ['dracula', 'github-light'],
				styleOverrides: {
                    frames: {
                        // Terminal başlığı görünümü
                        frameBoxShadowCssValue: '0 0 20px rgba(0, 229, 255, 0.15)',
                        editorActiveTabBackground: 'rgba(0, 229, 255, 0.1)',
                        editorActiveTabBorderColor: '#00e5ff',
                    }
                },
				shiki: {
					langAlias: {
						tulpar: 'c',
					},
				},
			},
			sidebar: [
				{
					label: 'Introduction',
					translations: { tr: 'Giriş' },
					items: [
						{ label: 'Getting Started', translations: { tr: 'Başlarken' }, slug: 'intro/getting-started' },
						{ label: 'Installation', translations: { tr: 'Kurulum' }, slug: 'intro/installation' },
					],
				},
				{
					label: 'Language Guide',
					translations: { tr: 'Dil Rehberi' },
					items: [
						{ label: 'Syntax & Variables', translations: { tr: 'Sözdizimi ve Değişkenler' }, slug: 'guide/syntax' },
						{ label: 'Control Flow', translations: { tr: 'Kontrol Akışı' }, slug: 'guide/control-flow' },
						{ label: 'Functions', translations: { tr: 'Fonksiyonlar' }, slug: 'guide/functions' },
						{ label: 'Arrays & JSON', translations: { tr: 'Diziler ve JSON' }, slug: 'guide/arrays-json' },
						{ label: 'Structs', translations: { tr: 'Yapılar (Structs)' }, slug: 'guide/structs' },
						{ label: 'Modules & Imports', translations: { tr: 'Modüller ve İçe Aktarma' }, slug: 'guide/modules' },
						{ label: 'Tulpar vs C', translations: { tr: 'Tulpar ve C Karşılaştırma' }, slug: 'guide/tulpar-vs-c' },
					],
				},
				{
					label: 'Standard Library',
					translations: { tr: 'Standart Kütüphane' },
					items: [
						{ label: 'Built-in Functions', translations: { tr: 'Yerleşik Fonksiyonlar' }, slug: 'stdlib/builtins' },
						{ label: 'Math Functions', translations: { tr: 'Matematik Fonksiyonları' }, slug: 'stdlib/math' },
						{ label: 'String Functions', translations: { tr: 'Metin Fonksiyonları' }, slug: 'stdlib/string' },
						{ label: 'File I/O', translations: { tr: 'Dosya İşlemleri' }, slug: 'stdlib/file-io' },
						{ label: 'Network (Sockets)', translations: { tr: 'Ağ (Socket)' }, slug: 'stdlib/network' },
						{ label: 'Database (SQLite)', translations: { tr: 'Veritabanı (SQLite)' }, slug: 'stdlib/database' },
					],
				},
				{
					label: 'Examples',
					translations: { tr: 'Örnekler' },
					items: [
						{ label: 'Basic Examples', translations: { tr: 'Temel Örnekler' }, slug: 'examples/basic' },
						{ label: 'Advanced Examples', translations: { tr: 'İleri Seviye Örnekler' }, slug: 'examples/advanced' },
					],
				},
			],
		}),
	],
});
