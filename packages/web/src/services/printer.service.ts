/**
 * ESC/POS Printer Service
 * 
 * Supports thermal printers via:
 * - Web Serial API (direct USB connection)
 * - Web Bluetooth API
 * - Network/IP printing (via backend proxy)
 */

export interface PrinterConfig {
    type: 'usb' | 'bluetooth' | 'network';
    address?: string; // IP address for network printers
    port?: number; // Port for network printers (default: 9100)
    paperWidth: 58 | 80; // Paper width in mm
    characterWidth: number; // Characters per line
}

export interface PrintJob {
    id: string;
    content: Uint8Array;
    status: 'pending' | 'printing' | 'completed' | 'failed';
    error?: string;
    createdAt: Date;
}

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const COMMANDS = {
    // Initialize printer
    INIT: new Uint8Array([ESC, 0x40]),

    // Text alignment
    ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),

    // Text formatting
    BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
    DOUBLE_WIDTH_ON: new Uint8Array([GS, 0x21, 0x10]),
    DOUBLE_HEIGHT_ON: new Uint8Array([GS, 0x21, 0x01]),
    DOUBLE_ON: new Uint8Array([GS, 0x21, 0x11]),
    NORMAL: new Uint8Array([GS, 0x21, 0x00]),

    // Paper
    LINE_FEED: new Uint8Array([LF]),
    CUT_PAPER: new Uint8Array([GS, 0x56, 0x00]), // Full cut
    PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),

    // Cash drawer
    OPEN_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]),

    // QR Code
    QR_MODEL: new Uint8Array([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    QR_SIZE: (size: number) => new Uint8Array([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]),
    QR_ERROR: new Uint8Array([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]),
    QR_STORE: (data: string) => {
        const bytes = new TextEncoder().encode(data);
        const len = bytes.length + 3;
        const pL = len % 256;
        const pH = Math.floor(len / 256);
        return new Uint8Array([GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...bytes]);
    },
    QR_PRINT: new Uint8Array([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]),
};

class EscPosPrinter {
    private port: SerialPort | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private config: PrinterConfig;
    private buffer: number[] = [];

    constructor(config?: Partial<PrinterConfig>) {
        this.config = {
            type: 'usb',
            paperWidth: 80,
            characterWidth: 48,
            ...config,
        };
    }

    /**
     * Connect to printer via Web Serial API
     */
    async connect(): Promise<boolean> {
        try {
            if (!('serial' in navigator)) {
                console.warn('Web Serial API not supported');
                return false;
            }

            // Request port access
            this.port = await (navigator as Navigator & { serial: Serial }).serial.requestPort();
            await this.port.open({ baudRate: 9600 });

            this.writer = this.port.writable?.getWriter() ?? null;

            // Initialize printer
            await this.sendCommand(COMMANDS.INIT);

            return true;
        } catch (error) {
            console.error('Failed to connect to printer:', error);
            return false;
        }
    }

    /**
     * Disconnect from printer
     */
    async disconnect(): Promise<void> {
        try {
            if (this.writer) {
                await this.writer.close();
                this.writer = null;
            }
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
        } catch (error) {
            console.error('Error disconnecting printer:', error);
        }
    }

    /**
     * Check if printer is connected
     */
    isConnected(): boolean {
        return this.port !== null && this.writer !== null;
    }

    /**
     * Send raw command to printer
     */
    private async sendCommand(data: Uint8Array): Promise<void> {
        if (!this.writer) {
            throw new Error('Printer not connected');
        }
        await this.writer.write(data);
    }

    /**
     * Add to buffer for batch printing
     */
    private addToBuffer(...data: Uint8Array[]): void {
        data.forEach(d => this.buffer.push(...d));
    }

    /**
     * Flush buffer to printer
     */
    async flush(): Promise<void> {
        if (this.buffer.length > 0) {
            await this.sendCommand(new Uint8Array(this.buffer));
            this.buffer = [];
        }
    }

    // Builder pattern methods
    initialize(): this {
        this.addToBuffer(COMMANDS.INIT);
        return this;
    }

    alignLeft(): this {
        this.addToBuffer(COMMANDS.ALIGN_LEFT);
        return this;
    }

    alignCenter(): this {
        this.addToBuffer(COMMANDS.ALIGN_CENTER);
        return this;
    }

    alignRight(): this {
        this.addToBuffer(COMMANDS.ALIGN_RIGHT);
        return this;
    }

    bold(enabled = true): this {
        this.addToBuffer(enabled ? COMMANDS.BOLD_ON : COMMANDS.BOLD_OFF);
        return this;
    }

    doubleSize(): this {
        this.addToBuffer(COMMANDS.DOUBLE_ON);
        return this;
    }

    normalSize(): this {
        this.addToBuffer(COMMANDS.NORMAL);
        return this;
    }

    text(content: string): this {
        this.addToBuffer(new TextEncoder().encode(content));
        return this;
    }

    line(content: string): this {
        this.text(content);
        this.addToBuffer(COMMANDS.LINE_FEED);
        return this;
    }

    newLine(count = 1): this {
        for (let i = 0; i < count; i++) {
            this.addToBuffer(COMMANDS.LINE_FEED);
        }
        return this;
    }

    separator(char = '-'): this {
        const line = char.repeat(this.config.characterWidth);
        return this.line(line);
    }

    tableRow(left: string, right: string, fillChar = ' '): this {
        const maxWidth = this.config.characterWidth;
        const available = maxWidth - right.length - 1;
        const leftTruncated = left.slice(0, available);
        const padding = fillChar.repeat(maxWidth - leftTruncated.length - right.length);
        return this.line(`${leftTruncated}${padding}${right}`);
    }

    qrCode(data: string, size = 6): this {
        this.alignCenter();
        this.addToBuffer(COMMANDS.QR_MODEL);
        this.addToBuffer(COMMANDS.QR_SIZE(size));
        this.addToBuffer(COMMANDS.QR_ERROR);
        this.addToBuffer(COMMANDS.QR_STORE(data));
        this.addToBuffer(COMMANDS.QR_PRINT);
        this.alignLeft();
        return this;
    }

    cut(partial = false): this {
        this.newLine(3);
        this.addToBuffer(partial ? COMMANDS.PARTIAL_CUT : COMMANDS.CUT_PAPER);
        return this;
    }

    openCashDrawer(): this {
        this.addToBuffer(COMMANDS.OPEN_DRAWER);
        return this;
    }

    /**
     * Build and send the print job
     */
    async print(): Promise<void> {
        await this.flush();
    }

    /**
     * Get buffer as Uint8Array (for preview/debug)
     */
    getBuffer(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}

// Singleton instance
let printerInstance: EscPosPrinter | null = null;

export const printerService = {
    /**
     * Get or create printer instance
     */
    getInstance(config?: Partial<PrinterConfig>): EscPosPrinter {
        if (!printerInstance) {
            printerInstance = new EscPosPrinter(config);
        }
        return printerInstance;
    },

    /**
     * Check if Web Serial is available
     */
    isSupported(): boolean {
        return 'serial' in navigator;
    },

    /**
     * Print receipt using ESC/POS commands
     */
    async printReceipt(data: {
        businessName: string;
        outletName: string;
        outletAddress: string;
        outletPhone?: string;
        transactionNumber: string;
        date: Date;
        cashierName: string;
        customerName?: string;
        items: Array<{
            name: string;
            qty: number;
            price: number;
            subtotal: number;
        }>;
        subtotal: number;
        discount?: number;
        serviceCharge?: number;
        tax: number;
        total: number;
        payments: Array<{
            method: string;
            amount: number;
        }>;
        change?: number;
        footerMessage?: string;
    }): Promise<boolean> {
        const printer = this.getInstance();

        if (!printer.isConnected()) {
            const connected = await printer.connect();
            if (!connected) {
                console.warn('Could not connect to printer');
                return false;
            }
        }

        try {
            // Format date
            const dateStr = data.date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            const timeStr = data.date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
            });

            // Format currency
            const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

            // Build receipt
            printer
                .initialize()
                .alignCenter()
                .bold()
                .doubleSize()
                .line(data.businessName)
                .normalSize()
                .bold(false)
                .line(data.outletName)
                .line(data.outletAddress)
                .line(data.outletPhone ? `Telp: ${data.outletPhone}` : '')
                .newLine()
                .separator('=')
                .alignLeft()
                .tableRow('No.Transaksi', data.transactionNumber)
                .tableRow('Tanggal', dateStr)
                .tableRow('Jam', timeStr)
                .tableRow('Kasir', data.cashierName)
                .line(data.customerName ? `Pelanggan: ${data.customerName}` : '')
                .separator('-');

            // Items
            for (const item of data.items) {
                printer
                    .line(`${item.qty}x ${item.name}`)
                    .tableRow('', fmt(item.subtotal));
            }

            printer.separator('-');

            // Totals
            printer
                .tableRow('Subtotal', fmt(data.subtotal));

            if (data.discount && data.discount > 0) {
                printer.tableRow('Diskon', `-${fmt(data.discount)}`);
            }
            if (data.serviceCharge && data.serviceCharge > 0) {
                printer.tableRow('Biaya Layanan', fmt(data.serviceCharge));
            }
            printer.tableRow('Pajak (11%)', fmt(data.tax));

            printer
                .separator('-')
                .bold()
                .tableRow('TOTAL', fmt(data.total))
                .bold(false)
                .separator('-');

            // Payments
            printer.line('Pembayaran:');
            for (const payment of data.payments) {
                printer.tableRow(payment.method, fmt(payment.amount));
            }
            if (data.change && data.change > 0) {
                printer.bold().tableRow('Kembalian', fmt(data.change)).bold(false);
            }

            printer
                .separator('=')
                .alignCenter()
                .newLine()
                .bold()
                .line('Terima Kasih!')
                .bold(false)
                .line(data.footerMessage || 'Simpan struk ini sebagai bukti pembayaran')
                .newLine()
                .qrCode(data.transactionNumber, 4)
                .cut();

            await printer.print();
            return true;
        } catch (error) {
            console.error('Failed to print receipt:', error);
            return false;
        }
    },

    /**
     * Open cash drawer
     */
    async openCashDrawer(): Promise<boolean> {
        const printer = this.getInstance();

        if (!printer.isConnected()) {
            const connected = await printer.connect();
            if (!connected) return false;
        }

        try {
            printer.openCashDrawer();
            await printer.print();
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Print test page
     */
    async printTestPage(): Promise<boolean> {
        const printer = this.getInstance();

        if (!printer.isConnected()) {
            const connected = await printer.connect();
            if (!connected) return false;
        }

        try {
            printer
                .initialize()
                .alignCenter()
                .doubleSize()
                .bold()
                .line('=== TEST PAGE ===')
                .normalSize()
                .bold(false)
                .newLine()
                .line('TILO Thermal Printer')
                .line('Connection: OK')
                .line(`Date: ${new Date().toLocaleString('id-ID')}`)
                .separator('-')
                .alignLeft()
                .line('Text formatting test:')
                .bold().line('Bold text').bold(false)
                .doubleSize().line('Double size').normalSize()
                .separator('-')
                .alignCenter()
                .line('QR Code test:')
                .qrCode('TILO-TEST-12345', 4)
                .newLine()
                .line('Printer test completed!')
                .cut();

            await printer.print();
            return true;
        } catch {
            return false;
        }
    },
};

export { EscPosPrinter };
