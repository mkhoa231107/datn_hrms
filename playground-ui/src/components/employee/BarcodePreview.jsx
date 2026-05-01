import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, X } from 'lucide-react';

export default function BarcodePreview({ value, name, department, onClose }) {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      JsBarcode(barcodeRef.current, value, {
        format: 'CODE128',
        lineColor: '#1e293b',
        background: '#ffffff',
        width: 2.5,
        height: 90,
        displayValue: true,
        font: 'Inter, sans-serif',
        fontSize: 14,
        fontOptions: 'bold',
        textMargin: 6,
        margin: 16,
      });
    }
  }, [value]);

  const handlePrint = () => {
    const svg = barcodeRef.current;
    if (!svg) return;

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>Mã vạch - ${name}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Inter, sans-serif; display: flex; flex-direction: column; align-items: center; }
              h2 { font-size: 16px; margin: 0 0 4px; color: #1e293b; }
              p { font-size: 12px; color: #64748b; margin: 0 0 12px; }
              img { max-width: 100%; }
              @media print { @page { margin: 10mm; } }
            </style>
          </head>
          <body>
            <h2>${name}</h2>
            ${department ? `<p>${department}</p>` : ''}
            <img src="${canvas.toDataURL('image/png')}" />
            <script>window.onload = () => { window.print(); window.close(); }<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };
    img.src = url;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
        minWidth: '340px', position: 'relative',
      }}>
        {/* Close */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#64748b" />
          </button>
        )}

        {/* Employee info */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: '#1e40af',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: '22px', fontWeight: '700', color: '#fff',
          }}>
            {(name || '?').charAt(0).toUpperCase()}
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>{name}</h2>
          {department && <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{department}</p>}
        </div>

        {/* Barcode */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '12px', padding: '12px', marginBottom: '20px',
          display: 'inline-block',
        }}>
          <svg ref={barcodeRef}></svg>
        </div>

        {/* Print button */}
        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px', borderRadius: '12px',
            background: '#1e40af',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600',
          }}
        >
          <Printer size={16} /> In mã vạch
        </button>
      </div>
    </div>
  );
}
