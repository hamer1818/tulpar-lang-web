/**
 * Tulpar WebAssembly JavaScript Wrapper
 * 
 * WebAssembly modülünü yükler ve kolay bir API sağlar.
 */

interface TulparWasmModule {
	ccall: (func: string, returnType: string, argTypes: string[], args: any[]) => any;
	stringToUTF8: (str: string) => number;
	UTF8ToString: (ptr: number) => string;
	_free: (ptr: number) => void;
	addFunction: (func: Function, sig: string) => number;
	onRuntimeInitialized?: () => void;
	onAbort?: (error: any) => void;
	locateFile?: (path: string) => string;
}

interface ModuleFactory {
	(defaults?: {
		onRuntimeInitialized?: () => void;
		onAbort?: (error: any) => void;
		locateFile?: (path: string) => string;
	}): Promise<TulparWasmModule>;
}

class TulparWasm {
	private module: TulparWasmModule | null = null;
	private initialized = false;
	private outputBuffer: string[] = [];
	private printCallback: ((str: string) => void) | null = null;

	/**
	 * WebAssembly modülünü yükle
	 * @returns {Promise<void>}
	 */
	async load(): Promise<void> {
		if (this.module) {
			return; // Zaten yüklü
		}

		try {
			// Emscripten modülünü dinamik olarak yükle
			// public/tulpar_wasm.js dosyasını script tag ile yükle
			await this.loadEmscriptenModule();
			
			// Print callback'i ayarla
			this.setupPrintCallback();
			
			// Modülü başlat
			const initResult = this.module!.ccall('tulpar_wasm_init', 'number', [], []);
			if (initResult !== 0) {
				throw new Error('Tulpar WASM başlatılamadı');
			}
			
			this.initialized = true;
		} catch (error) {
			console.error('Tulpar WASM yükleme hatası:', error);
			throw error;
		}
	}

	/**
	 * Emscripten modülünü script tag ile yükle
	 */
	private async loadEmscriptenModule(): Promise<void> {
		return new Promise((resolve, reject) => {
			// Eğer modül zaten yüklüyse
			if (typeof (window as any).createTulparWasmModule !== 'undefined') {
				this.createModuleInstance((window as any).createTulparWasmModule, resolve, reject);
				return;
			}

			// Script tag oluştur ve yükle
			const script = document.createElement('script');
			// Dev ortamında cache'e takılmamak için cache-busting ekle
			script.src = '/tulpar_wasm.js?v=' + Date.now();
			script.type = 'text/javascript';
			script.async = true;
			
			script.onload = () => {
				const ModuleFactory = (window as any).createTulparWasmModule;
				if (!ModuleFactory) {
					reject(new Error('createTulparWasmModule bulunamadı'));
					return;
				}
				this.createModuleInstance(ModuleFactory, resolve, reject);
			};
			
			script.onerror = (error) => {
				reject(new Error('WASM modülü yüklenemedi: ' + error));
			};
			
			document.head.appendChild(script);
		});
	}

	/**
	 * Emscripten modül instance'ı oluştur
	 */
	private createModuleInstance(
		ModuleFactory: ModuleFactory,
		resolve: () => void,
		reject: (error: Error) => void
	): void {
		const modulePromise = ModuleFactory({
			onRuntimeInitialized: () => {
				resolve();
			},
			onAbort: (error: any) => {
				reject(new Error('WASM modülü yüklenemedi: ' + error));
			},
			locateFile: (path: string) => {
				// WASM dosyasının yolunu düzelt
				if (path.endsWith('.wasm')) {
					if (path.includes('tulpar_wasm')) {
						return '/tulpar_wasm.wasm';
					}
				}
				return path;
			}
		});

		// Promise'i bekleyip modülü kaydet
		modulePromise.then((module) => {
			this.module = module;
		}).catch(reject);
	}

	/**
	 * Print callback'i ayarla
	 */
	setupPrintCallback(): void {
		if (!this.module) return;

		// Output buffer'ı temizle
		this.outputBuffer = [];
		
		// Print callback fonksiyonu
		this.printCallback = (str: string) => {
			if (str) {
				this.outputBuffer.push(str);
			}
		};
		
		// C tarafına callback'i kaydet
		const callbackPtr = this.module.addFunction((strPtr: number) => {
			const str = this.module!.UTF8ToString(strPtr);
			this.printCallback!(str);
		}, 'vi'); // void(int)
		
		this.module.ccall('tulpar_wasm_set_print_callback', 'void', ['number'], [callbackPtr]);
	}

	/**
	 * Tulpar kodunu çalıştır
	 * @param {string} code - Tulpar kaynak kodu
	 * @returns {Promise<{output: string, error: string|null}>}
	 */
	async run(code: string): Promise<{ output: string; error: string | null }> {
		if (!this.initialized) {
			await this.load();
		}

		if (!this.module) {
			throw new Error('WASM modülü yüklenmedi');
		}

		// Output buffer'ı temizle
		this.outputBuffer = [];
		
		try {
			// Kodu çalıştır (Emscripten string argümanını kendi yönetir)
			const result = this.module.ccall(
				'tulpar_wasm_run_code',
				'number',
				['string'],
				[code]
			);
			
			// Sonucu kontrol et
			if (result === -1) {
				// Derleme hatası
				const output = this.outputBuffer.join('');
				return {
					output: output || 'Derleme hatası',
					error: 'Derleme hatası oluştu'
				};
			} else if (result === -2) {
				// Runtime hatası
				const output = this.outputBuffer.join('');
				return {
					output: output || 'Runtime hatası',
					error: 'Runtime hatası oluştu'
				};
			}
			
			// Başarılı - output'u birleştir
			const output = this.outputBuffer.join('');
			
			// Ayrıca get_output ile de kontrol et (ccall string döner)
			const outputStr = this.module.ccall('tulpar_wasm_get_output', 'string', [], []);
			
			return {
				output: output || outputStr,
				error: null
			};
		} catch (error: any) {
			console.error('Tulpar kod çalıştırma hatası:', error);
			return {
				output: '',
				error: error.message || 'Bilinmeyen hata'
			};
		}
	}

	/**
	 * Temizlik yap
	 */
	cleanup(): void {
		if (this.module && this.initialized) {
			try {
				this.module.ccall('tulpar_wasm_cleanup', 'void', [], []);
			} catch (error) {
				console.error('Tulpar WASM temizlik hatası:', error);
			}
		}
		this.outputBuffer = [];
		this.initialized = false;
	}
}

// Global instance
let tulparWasmInstance: TulparWasm | null = null;

/**
 * Tulpar WASM instance'ını al (singleton)
 * @returns {Promise<TulparWasm>}
 */
async function getTulparWasm(): Promise<TulparWasm> {
	if (!tulparWasmInstance) {
		tulparWasmInstance = new TulparWasm();
		await tulparWasmInstance.load();
	}
	return tulparWasmInstance;
}

/**
 * Tulpar kodunu çalıştır (kolay API)
 * @param {string} code - Tulpar kaynak kodu
 * @returns {Promise<{output: string, error: string|null}>}
 */
export async function runTulparCode(code: string): Promise<{ output: string; error: string | null }> {
	const wasm = await getTulparWasm();
	return await wasm.run(code);
}

// Default export
export default {
	run: runTulparCode,
	getInstance: getTulparWasm
};
