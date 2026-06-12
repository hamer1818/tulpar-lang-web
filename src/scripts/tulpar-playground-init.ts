import { runTulparCode } from './tulpar-interpreter';

function initOne(root: HTMLElement) {
	const editor = root.querySelector<HTMLTextAreaElement>('.tulpar-playground__editor');
	const runBtn = root.querySelector<HTMLButtonElement>('.tulpar-playground__run');
	const statusEl = root.querySelector<HTMLElement>('.tulpar-playground__status');
	const outputWrap = root.querySelector<HTMLElement>('.tulpar-playground__outputWrap');
	const outputEl = root.querySelector<HTMLElement>('.tulpar-playground__output');

	if (!editor || !runBtn) return;

	function setStatus(text: string) {
		if (statusEl) statusEl.textContent = text;
	}

	function setOutput(text: string) {
		if (!outputWrap || !outputEl) return;
		outputWrap.hidden = false;
		outputEl.textContent = text ?? '';
	}

	function setOutputMode(isError: boolean) {
		if (!outputEl) return;
		outputEl.classList.toggle('is-error', Boolean(isError));
	}

	async function run() {
		const code = editor.value;
		runBtn.disabled = true;
		setStatus('Çalışıyor…');
		setOutputMode(false);
		setOutput('');

		try {
			const { output, error } = await runTulparCode(code);
			let text = output || '';

			if (error) {
				setOutputMode(true);
				text = text ? text.replace(/\n?$/, '\n') + error : error;

				// Parser hatalarında kullanıcıya noktalı virgül ipucu ver
				if (/Parser error/i.test(error) && /'.+'/.test(error)) {
					text += '\n\nİpucu: Bu hata çoğu zaman satır sonunda unutulan noktalı virgülden (;) kaynaklanır.';
				}
			}

			setOutput(text);
		} catch (e: any) {
			setOutputMode(true);
			setOutput(e?.message ?? String(e));
		} finally {
			runBtn.disabled = false;
			setStatus('');
		}
	}

	if (!runBtn.dataset.tulparBound) {
		runBtn.addEventListener('click', run);
		runBtn.dataset.tulparBound = '1';
	}
}

export default function initTulparPlaygrounds() {
	document
		.querySelectorAll<HTMLElement>('.tulpar-playground')
		.forEach((root) => initOne(root));
}

// Otomatik init – modül tarayıcıda yüklendiğinde çalışır
if (typeof window !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => initTulparPlaygrounds());
	} else {
		initTulparPlaygrounds();
	}
}

