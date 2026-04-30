import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertTriangle, Lock, ScanLine } from 'lucide-react';
import { useT } from '../i18n';

type Status = 'idle' | 'loading' | 'scanning' | 'success' | 'denied' | 'no_camera' | 'no_https' | 'error';

export interface CameraScannerProps {
  /** Вызывается при успешном распознавании. Сканер автоматически останавливается на короткое время для UI-обратной связи. */
  onResult: (decodedText: string) => void;
  /** Стартовать камеру сразу при mount (по умолчанию false — нужен пользовательский жест). */
  autoStart?: boolean;
  /** Опциональный класс для внешнего контейнера. */
  className?: string;
}

const REGION_ID = 'warehouse-camera-region';
const isSecureCtx = () => {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
};

/**
 * Реальный камера-сканер на основе html5-qrcode.
 * Поддерживает QR и большинство 1D-штрихкодов.
 *
 * Замечание: getUserMedia доступен только на HTTPS / localhost.
 * При обычном HTTP по IP браузер заблокирует камеру — компонент покажет
 * понятное сообщение и предложит перейти на Hardware/Manual.
 */
export function CameraScanner({ onResult, autoStart = false, className }: CameraScannerProps) {
  const t = useT();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastResult, setLastResult] = useState<string | null>(null);
  const scannerRef = useRef<unknown>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (autoStart && status === 'idle') {
      void start();
    }
    return () => { void stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (startedRef.current) return;
    if (!isSecureCtx()) {
      setStatus('no_https');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Динамический импорт — пакет тяжёлый, тянем только когда нужно
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const formats = mod.Html5QrcodeSupportedFormats;

      // Проверка наличия камер
      const cams = await Html5Qrcode.getCameras().catch(() => [] as Array<{ id: string; label: string }>);
      if (!cams || cams.length === 0) {
        setStatus('no_camera');
        return;
      }

      const scanner = new Html5Qrcode(REGION_ID, {
        formatsToSupport: [
          formats.QR_CODE, formats.EAN_13, formats.EAN_8,
          formats.CODE_128, formats.CODE_39, formats.UPC_A, formats.UPC_E,
          formats.ITF, formats.CODABAR,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.333 },
        (decodedText: string) => {
          setLastResult(decodedText);
          setStatus('success');
          onResult(decodedText);
          // короткая пауза, чтобы не зацикливать обработку одного и того же кадра
          window.setTimeout(() => setStatus('scanning'), 800);
        },
        () => { /* per-frame parse error — игнорируем */ },
      );
      startedRef.current = true;
      setStatus('scanning');
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '');
      if (/permission|denied|notallowed/i.test(msg)) setStatus('denied');
      else if (/notfound|no such device/i.test(msg))   setStatus('no_camera');
      else { setStatus('error'); setErrorMessage(msg); }
    }
  };

  const stop = async () => {
    const s = scannerRef.current as any;
    if (!s) return;
    try {
      if (typeof s.stop === 'function')  await s.stop();
      if (typeof s.clear === 'function') s.clear();
    } catch { /* ignore */ }
    scannerRef.current = null;
    startedRef.current = false;
  };

  const restart = async () => { await stop(); setStatus('idle'); await start(); };

  const overlay = (() => {
    switch (status) {
      case 'idle':
        return (
          <Center>
            <button onClick={start} className="px-4 h-11 rounded-xl bg-[#7C3AED] text-white inline-flex items-center gap-2 active-press" style={{ fontWeight: 800 }}>
              <Camera className="w-4 h-4" /> {t('scanner.cameraStart')}
            </button>
          </Center>
        );
      case 'loading':
        return (
          <Center>
            <div className="text-white text-[13px] inline-flex items-center gap-2 animate-pulse" style={{ fontWeight: 700 }}>
              <RefreshCw className="w-4 h-4 animate-spin" /> {t('scanner.cameraLoading')}
            </div>
          </Center>
        );
      case 'denied':
        return (
          <Notice icon={<Lock className="w-5 h-5" />} color="#FECACA" fg="#7F1D1D" title={t('scanner.cameraDenied')}>
            <Btn onClick={restart}>{t('scanner.cameraRetry')}</Btn>
          </Notice>
        );
      case 'no_camera':
        return (
          <Notice icon={<AlertTriangle className="w-5 h-5" />} color="#FEF3C7" fg="#92400E" title={t('scanner.cameraNotFound')} />
        );
      case 'no_https':
        return (
          <Notice icon={<Lock className="w-5 h-5" />} color="#FEF3C7" fg="#92400E" title={t('scanner.cameraHttps')} />
        );
      case 'error':
        return (
          <Notice icon={<AlertTriangle className="w-5 h-5" />} color="#FECACA" fg="#7F1D1D" title={t('scanner.cameraError')}>
            <div className="text-[10px] text-[#7F1D1D] mb-2 max-w-xs truncate" style={{ fontWeight: 600 }}>{errorMessage}</div>
            <Btn onClick={restart}>{t('scanner.cameraRetry')}</Btn>
          </Notice>
        );
      default:
        return null;
    }
  })();

  return (
    <div className={`bg-white rounded-2xl p-3 shadow-sm ${className ?? ''}`}>
      <div
        className="relative w-full aspect-[4/3] md:aspect-video rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0B1020 0%, #1F2430 100%)' }}
      >
        {/* html5-qrcode рендерит <video> внутрь div с этим id */}
        <div id={REGION_ID} className="absolute inset-0" />
        {/* Прицел */}
        {(status === 'scanning' || status === 'success') && (
          <div className="pointer-events-none absolute inset-6 border-2 border-[#7C3AED] rounded-2xl">
            <div
              className="absolute left-2 right-2 top-1/2 h-0.5"
              style={{
                backgroundColor: status === 'success' ? '#10B981' : '#7C3AED',
                boxShadow: `0 0 16px ${status === 'success' ? '#10B981' : '#7C3AED'}`,
                transform: 'translateY(-50%)',
              }}
            />
            {status === 'scanning' && (
              <ScanLine className="absolute top-2 right-2 w-4 h-4 text-[#7C3AED] animate-pulse" />
            )}
          </div>
        )}
        {overlay}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="text-[11px] text-[#6B7280] truncate flex-1" style={{ fontWeight: 600 }}>
          {lastResult
            ? <><span className="text-[#10B981]" style={{ fontWeight: 800 }}>{t('scanner.lastResult')}: </span>{lastResult}</>
            : t('scanner.noResult')}
        </div>
        {(status === 'scanning' || status === 'success') && (
          <button onClick={stop} className="px-3 h-8 rounded-lg bg-[#1F2430] text-white text-[11px] active-press" style={{ fontWeight: 800 }}>
            {t('scanner.cameraStop')}
          </button>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 flex items-center justify-center p-4 text-center">{children}</div>;
}

function Notice({ icon, color, fg, title, children }: { icon: React.ReactNode; color: string; fg: string; title: string; children?: React.ReactNode }) {
  return (
    <Center>
      <div className="bg-white/95 rounded-2xl p-4 max-w-sm" style={{ color: fg }}>
        <div className="inline-flex items-center gap-2 mb-2 px-2 py-1 rounded-md" style={{ backgroundColor: color, fontWeight: 800 }}>
          {icon}<span className="text-[12px]">{title}</span>
        </div>
        <div className="text-[11px] text-[#374151]" style={{ fontWeight: 500 }}>
          {children}
        </div>
      </div>
    </Center>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-3 h-9 rounded-lg bg-[#1F2430] text-white text-[12px] active-press inline-flex items-center gap-1" style={{ fontWeight: 800 }}>
      <RefreshCw className="w-3 h-3" /> {children}
    </button>
  );
}
