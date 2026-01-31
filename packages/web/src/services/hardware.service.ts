/**
 * Hardware Service
 * 
 * Manages all hardware integrations:
 * - Thermal Printer (ESC/POS)
 * - Barcode Scanner (USB HID or Camera)
 * - Cash Drawer (via printer or direct)
 * - Customer Display (VFD/LCD)
 */

import { printerService } from './printer.service';

// Barcode Scanner using HID
export interface BarcodeResult {
    code: string;
    format: string;
    timestamp: Date;
}

type BarcodeScanCallback = (result: BarcodeResult) => void;

class BarcodeScanner {
    private buffer = '';
    private lastKeyTime = 0;
    private callback: BarcodeScanCallback | null = null;
    private readonly SCAN_TIMEOUT = 50; // ms between keystrokes for a scan

    constructor() {
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    /**
     * Start listening for barcode scans
     */
    start(callback: BarcodeScanCallback): void {
        this.callback = callback;
        document.addEventListener('keydown', this.handleKeydown);
    }

    /**
     * Stop listening
     */
    stop(): void {
        this.callback = null;
        document.removeEventListener('keydown', this.handleKeydown);
    }

    private handleKeydown(event: KeyboardEvent): void {
        const now = Date.now();

        // Reset buffer if too much time has passed
        if (now - this.lastKeyTime > this.SCAN_TIMEOUT) {
            this.buffer = '';
        }
        this.lastKeyTime = now;

        // Ignore if typing in an input field (unless it's really fast like a scanner)
        const target = event.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (event.key === 'Enter') {
            // End of barcode
            if (this.buffer.length >= 4) { // Minimum barcode length
                event.preventDefault();
                this.callback?.({
                    code: this.buffer,
                    format: this.detectFormat(this.buffer),
                    timestamp: new Date(),
                });
            }
            this.buffer = '';
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Only add if it looks like scanner input (fast typing)
            if (!isInputField || now - this.lastKeyTime < this.SCAN_TIMEOUT) {
                this.buffer += event.key;
            }
        }
    }

    private detectFormat(code: string): string {
        // Simple format detection
        if (/^\d{13}$/.test(code)) return 'EAN-13';
        if (/^\d{12}$/.test(code)) return 'UPC-A';
        if (/^\d{8}$/.test(code)) return 'EAN-8';
        if (/^[A-Z0-9]+$/.test(code)) return 'CODE39';
        return 'UNKNOWN';
    }
}

// Camera-based barcode scanner using BarcodeDetector API
class CameraBarcodeScanner {
    private stream: MediaStream | null = null;
    private video: HTMLVideoElement | null = null;
    private detector: BarcodeDetector | null = null;
    private isScanning = false;
    private callback: BarcodeScanCallback | null = null;

    /**
     * Check if BarcodeDetector is supported
     */
    static isSupported(): boolean {
        return 'BarcodeDetector' in window;
    }

    /**
     * Start camera scanner
     */
    async start(
        videoElement: HTMLVideoElement,
        callback: BarcodeScanCallback
    ): Promise<boolean> {
        if (!CameraBarcodeScanner.isSupported()) {
            console.warn('BarcodeDetector not supported');
            return false;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            videoElement.srcObject = this.stream;
            await videoElement.play();

            this.video = videoElement;
            this.callback = callback;
            this.detector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'code_128', 'qr_code'],
            });

            this.isScanning = true;
            this.scan();

            return true;
        } catch (error) {
            console.error('Failed to start camera scanner:', error);
            return false;
        }
    }

    /**
     * Stop camera scanner
     */
    stop(): void {
        this.isScanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.srcObject = null;
            this.video = null;
        }
    }

    private async scan(): Promise<void> {
        if (!this.isScanning || !this.video || !this.detector) return;

        try {
            const barcodes = await this.detector.detect(this.video);
            const barcode = barcodes[0];
            if (barcode) {
                this.callback?.({
                    code: barcode.rawValue,
                    format: barcode.format.toUpperCase().replace('_', '-'),
                    timestamp: new Date(),
                });
            }
        } catch {
            // Ignore detection errors
        }

        if (this.isScanning) {
            requestAnimationFrame(() => this.scan());
        }
    }
}

// Cash Drawer Service
class CashDrawerService {
    private isOpen = false;

    /**
     * Open cash drawer via printer
     */
    async open(): Promise<boolean> {
        try {
            const result = await printerService.openCashDrawer();
            if (result) {
                this.isOpen = true;
                // Auto-reset status after a delay
                setTimeout(() => {
                    this.isOpen = false;
                }, 5000);
            }
            return result;
        } catch {
            return false;
        }
    }

    /**
     * Get drawer status (simulated)
     */
    getStatus(): 'open' | 'closed' | 'unknown' {
        return this.isOpen ? 'open' : 'closed';
    }
}

// Hardware Status
export interface HardwareStatus {
    printer: {
        connected: boolean;
        type: 'usb' | 'bluetooth' | 'network' | 'none';
        name?: string;
    };
    scanner: {
        enabled: boolean;
        type: 'hid' | 'camera' | 'none';
    };
    cashDrawer: {
        connected: boolean;
        status: 'open' | 'closed' | 'unknown';
    };
}

// Main Hardware Service
class HardwareService {
    private barcodeScanner: BarcodeScanner;
    private cameraScanner: CameraBarcodeScanner;
    private cashDrawer: CashDrawerService;

    constructor() {
        this.barcodeScanner = new BarcodeScanner();
        this.cameraScanner = new CameraBarcodeScanner();
        this.cashDrawer = new CashDrawerService();
    }

    // Printer
    get printer() {
        return printerService;
    }

    // Scanner
    get scanner() {
        return {
            hid: this.barcodeScanner,
            camera: this.cameraScanner,
        };
    }

    // Cash Drawer
    get drawer() {
        return this.cashDrawer;
    }

    /**
     * Get overall hardware status
     */
    getStatus(): HardwareStatus {
        return {
            printer: {
                connected: printerService.getInstance().isConnected(),
                type: printerService.isSupported() ? 'usb' : 'none',
            },
            scanner: {
                enabled: true,
                type: CameraBarcodeScanner.isSupported() ? 'camera' : 'hid',
            },
            cashDrawer: {
                connected: printerService.getInstance().isConnected(),
                status: this.cashDrawer.getStatus(),
            },
        };
    }

    /**
     * Test all hardware connections
     */
    async testAll(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        // Test printer
        try {
            results.printer = await printerService.printTestPage();
        } catch {
            results.printer = false;
        }

        // Test cash drawer
        try {
            results.cashDrawer = await this.cashDrawer.open();
        } catch {
            results.cashDrawer = false;
        }

        return results;
    }
}

// Singleton instance
export const hardwareService = new HardwareService();

// Re-export for convenience
export { printerService, BarcodeScanner, CameraBarcodeScanner, CashDrawerService };

// Type declarations for BarcodeDetector (not in standard lib)
declare global {
    interface BarcodeDetector {
        detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
    }

    interface DetectedBarcode {
        rawValue: string;
        format: string;
        boundingBox: DOMRectReadOnly;
        cornerPoints: Array<{ x: number; y: number }>;
    }

    // eslint-disable-next-line @typescript-eslint/no-redeclare
    const BarcodeDetector: {
        new(options?: { formats: string[] }): BarcodeDetector;
        getSupportedFormats(): Promise<string[]>;
    };
}
