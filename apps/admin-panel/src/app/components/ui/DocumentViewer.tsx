import { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Download, Printer, ZoomIn, ZoomOut, RotateCw, FileText,
  CheckCircle2, Clock, Shield, Copy, ChevronLeft, ChevronRight,
  Maximize2, Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentRecord {
  id: string;
  name: string;
  type: string;        // PDF, DOCX, etc.
  size: string;
  date: string;
  status: 'signed' | 'pending' | 'draft' | 'expired' | 'rejected';
  signedBy?: string;
  signedAt?: string;
  number?: string;     // Document number
  content?: DocumentContent;
}

export interface DocumentContent {
  title: string;
  subtitle?: string;
  number: string;
  date: string;
  organization?: string;
  headerFields?: { label: string; value: string }[];
  tableHeaders?: string[];
  tableRows?: string[][];
  totalRow?: string[];
  footerFields?: { label: string; value: string }[];
  signatures?: { role: string; name: string; signed: boolean; date?: string }[];
  stamp?: string;
  notes?: string[];
  qrCode?: boolean;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
  signed:   { label: 'Подписан',  cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  pending:  { label: 'Ожидает',   cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  draft:    { label: 'Черновик',  cls: 'bg-gray-100 text-gray-600',    icon: FileText },
  expired:  { label: 'Истёк',     cls: 'bg-red-100 text-red-700',      icon: Clock },
  rejected: { label: 'Отклонён',  cls: 'bg-red-100 text-red-700',      icon: X },
};

// ─── Document Viewer Modal ────────────────────────────────────────────────────

export function DocumentViewerModal({ doc, onClose, allDocs, onNavigate }: {
  doc: DocumentRecord;
  onClose: () => void;
  allDocs?: DocumentRecord[];
  onNavigate?: (doc: DocumentRecord) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  const currentIdx = allDocs?.findIndex(d => d.id === doc.id) ?? -1;
  const hasPrev = currentIdx > 0;
  const hasNext = allDocs ? currentIdx < allDocs.length - 1 : false;

  const sc = STATUS_CFG[doc.status] || STATUS_CFG.draft;
  const StatusIcon = sc.icon;

  const content = doc.content;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white flex flex-col transition-all ${fullscreen ? 'w-full h-full rounded-none' : 'w-[95vw] max-w-5xl h-[92vh] rounded-2xl'} shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{doc.type}</span>
                <span>·</span>
                <span>{doc.size}</span>
                <span>·</span>
                <span>{doc.date}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${sc.cls}`}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Navigation */}
            {allDocs && allDocs.length > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button disabled={!hasPrev} onClick={() => hasPrev && onNavigate?.(allDocs![currentIdx - 1])}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 tabular-nums">{currentIdx + 1}/{allDocs.length}</span>
                <button disabled={!hasNext} onClick={() => hasNext && onNavigate?.(allDocs![currentIdx + 1])}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Zoom */}
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Уменьшить">
              <ZoomOut className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-center tabular-nums">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Увеличить">
              <ZoomIn className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => setZoom(100)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Сбросить масштаб">
              <RotateCw className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button onClick={() => setFullscreen(f => !f)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              {fullscreen ? <Minimize2 className="w-4 h-4 text-gray-500" /> : <Maximize2 className="w-4 h-4 text-gray-500" />}
            </button>
            <button onClick={() => { toast.success(`Печать: ${doc.name}`); }} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Печать">
              <Printer className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => { toast.success(`Скачивание: ${doc.name}`); }} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Скачать">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div className="mx-auto" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '210mm', minHeight: '297mm' }}>
            <div className="bg-white shadow-lg border border-gray-200 mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm 25mm' }}>
              {content ? (
                <DocumentBody content={content} doc={doc} />
              ) : (
                <DefaultDocumentBody doc={doc} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// ─── Rendered Document Content ────────────────────────────────────────────────

function DocumentBody({ content, doc }: { content: DocumentContent; doc: DocumentRecord }) {
  return (
    <div className="text-gray-800" style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: '1.5' }}>
      {/* Header */}
      <div className="text-center mb-6">
        {content.organization && (
          <p style={{ fontSize: '9pt' }} className="text-gray-500 mb-1">{content.organization}</p>
        )}
        <h1 style={{ fontSize: '14pt', fontWeight: 700 }} className="mb-1">{content.title}</h1>
        {content.subtitle && <p style={{ fontSize: '10pt' }} className="text-gray-600">{content.subtitle}</p>}
        <div className="flex items-center justify-center gap-4 mt-2" style={{ fontSize: '10pt' }}>
          <span>№ {content.number}</span>
          <span>от {content.date}</span>
        </div>
      </div>

      {/* Header Fields */}
      {content.headerFields && content.headerFields.length > 0 && (
        <div className="mb-5 border-t border-b border-gray-300 py-3" style={{ fontSize: '10pt' }}>
          {content.headerFields.map((f, i) => (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-gray-500 shrink-0" style={{ width: '140px' }}>{f.label}:</span>
              <span className="font-semibold">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {content.tableHeaders && content.tableRows && (
        <div className="mb-5">
          <table className="w-full border-collapse" style={{ fontSize: '9.5pt' }}>
            <thead>
              <tr>
                {content.tableHeaders.map((h, i) => (
                  <th key={i} className="border border-gray-400 px-2 py-1.5 bg-gray-50 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-300 px-2 py-1">{cell}</td>
                  ))}
                </tr>
              ))}
              {content.totalRow && (
                <tr className="font-bold bg-gray-50">
                  {content.totalRow.map((cell, ci) => (
                    <td key={ci} className="border border-gray-400 px-2 py-1.5">{cell}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Fields */}
      {content.footerFields && content.footerFields.length > 0 && (
        <div className="mb-5" style={{ fontSize: '10pt' }}>
          {content.footerFields.map((f, i) => (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="text-gray-500 shrink-0" style={{ width: '160px' }}>{f.label}:</span>
              <span>{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {content.notes && content.notes.length > 0 && (
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded" style={{ fontSize: '9pt' }}>
          <p className="font-semibold mb-1">Примечания:</p>
          {content.notes.map((n, i) => (
            <p key={i} className="text-gray-600">• {n}</p>
          ))}
        </div>
      )}

      {/* Signatures */}
      {content.signatures && content.signatures.length > 0 && (
        <div className="mt-8 pt-4 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-6">
            {content.signatures.map((sig, i) => (
              <div key={i} className="text-center">
                <p style={{ fontSize: '9pt' }} className="text-gray-500 mb-6">{sig.role}</p>
                <div className="border-b border-gray-400 mx-8 mb-1 relative">
                  {sig.signed && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-blue-600" style={{ fontFamily: 'cursive', fontSize: '14pt' }}>{sig.name}</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '9pt' }}>{sig.name}</p>
                {sig.signed && sig.date && (
                  <p style={{ fontSize: '8pt' }} className="text-green-600 mt-0.5">Подписано {sig.date}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Code placeholder */}
      {content.qrCode && (
        <div className="mt-6 flex justify-end">
          <div className="w-20 h-20 border-2 border-gray-300 rounded flex items-center justify-center">
            <div className="grid grid-cols-5 gap-0.5 w-14 h-14">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className={`w-full aspect-square ${Math.random() > 0.4 ? 'bg-gray-800' : 'bg-white'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stamp */}
      {content.stamp && doc.status === 'signed' && (
        <div className="absolute bottom-32 right-24 opacity-30 rotate-[-12deg]">
          <div className="w-28 h-28 rounded-full border-4 border-blue-600 flex items-center justify-center">
            <div className="text-center text-blue-600">
              <p style={{ fontSize: '7pt' }} className="font-bold">{content.stamp}</p>
              <p style={{ fontSize: '6pt' }}>УТВЕРЖДЕНО</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default Document (no content provided) ───────────────────────────────────

function DefaultDocumentBody({ doc }: { doc: DocumentRecord }) {
  const sc = STATUS_CFG[doc.status] || STATUS_CFG.draft;
  return (
    <div className="text-gray-800" style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: '1.5' }}>
      <div className="text-center mb-8">
        <p style={{ fontSize: '9pt' }} className="text-gray-400 mb-2">ООО «ПВЗ Платформа»</p>
        <h1 style={{ fontSize: '16pt', fontWeight: 700 }} className="mb-2">{doc.name}</h1>
        {doc.number && <p style={{ fontSize: '10pt' }} className="text-gray-600">№ {doc.number}</p>}
        <p style={{ fontSize: '10pt' }} className="text-gray-500">от {doc.date}</p>
      </div>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded" style={{ fontSize: '10pt' }}>
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-gray-500">Тип:</span> <span className="font-semibold">{doc.type}</span></div>
          <div><span className="text-gray-500">Размер:</span> <span className="font-semibold">{doc.size}</span></div>
          <div><span className="text-gray-500">Статус:</span> <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${sc.cls}`}>{sc.label}</span></div>
          {doc.signedBy && <div><span className="text-gray-500">Подписант:</span> <span className="font-semibold">{doc.signedBy}</span></div>}
        </div>
      </div>

      <div className="flex items-center justify-center py-16 text-gray-400">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
          <p style={{ fontSize: '11pt' }}>Содержимое документа</p>
          <p style={{ fontSize: '9pt' }} className="text-gray-400 mt-1">Данные доступны для просмотра и скачивания</p>
        </div>
      </div>

      {doc.status === 'signed' && (
        <div className="mt-12 pt-4 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p style={{ fontSize: '9pt' }} className="text-gray-500 mb-8">Исполнитель</p>
              <div className="border-b border-gray-400 mx-8 mb-1" />
              <p style={{ fontSize: '9pt' }}>{doc.signedBy || 'Администратор'}</p>
              {doc.signedAt && <p style={{ fontSize: '8pt' }} className="text-green-600 mt-0.5">Подписано {doc.signedAt}</p>}
            </div>
            <div className="text-center">
              <p style={{ fontSize: '9pt' }} className="text-gray-500 mb-8">Получатель</p>
              <div className="border-b border-gray-400 mx-8 mb-1" />
              <p style={{ fontSize: '9pt' }}>Клиент</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
