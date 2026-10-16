/**
 * Print a self-contained HTML fragment (receipt, shift report) through a hidden
 * iframe so only that document is printed — not the whole POS screen.
 * Works offline: it only needs the HTML already rendered on the client.
 */
export function printHtml(bodyHtml: string, title = 'Cetak'): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
        iframe.remove();
        throw new Error('Tidak dapat membuka jendela cetak');
    }

    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; margin: 0; width: 72mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .right { text-align: right; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
  svg, button { display: none !important; }
</style></head><body>${bodyHtml}</body></html>`);
    doc.close();

    const cleanup = () => setTimeout(() => iframe.remove(), 500);
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    // Some browsers never fire afterprint on iframes
    setTimeout(() => { if (iframe.isConnected) iframe.remove(); }, 60_000);
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
