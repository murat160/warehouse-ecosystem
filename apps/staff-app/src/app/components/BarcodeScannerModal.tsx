/**
 * Сканер штрих-кода / QR-кода через камеру телефона.
 *
 * Как работает:
 * 1. Запрашиваем доступ к задней камере (environment).
 * 2. Каждые 200мс делаем "скриншот" с камеры в canvas.
 * 3. Прогоняем через jsQR — он умеет читать QR-коды.
 * 4. Если код найден — вызываем onScan и закрываем сканер.
 *
 * ВАЖНО: jsQR читает только QR-коды, не классические штрих-коды (EAN-13, и т.д.).
 * Для настоящих штрих-кодов нужна более тяжёлая библиотека (например, ZXing или Quagga).
 * Поэтому добавляем КНОПКУ РУЧНОГО ВВОДА — работник всегда может ввести код руками.
 *
 * Для бэкенда: API проверки кода должен принимать ЛЮБУЮ строку и возвращать товар.
 */

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Вызывается, когда код успешно отсканирован или введён вручную */
  onScan: (code: string) => void;
  /** Заголовок модалки */
  title?: string;
  /** Подсказка под названием */
  hint?: string;
}

type ScanState = 'idle' | 'requesting' | 'scanning' | 'denied' | 'error' | 'manual';

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Сканировать код',
  hint = 'Наведите камеру на QR-код или штрих-код товара',
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');

  // ── Запуск камеры ─────────────────────────────────
  const startCamera = async () => {
    setScanState('requesting');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState('scanning');
      tick();
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setScanState('denied');
        setErrorMessage('Доступ к камере запрещён. Разрешите его в настройках браузера или введите код вручную.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setScanState('error');
        setErrorMessage('Камера не найдена. Введите код вручную.');
      } else {
        setScanState('error');
        setErrorMessage('Не удалось включить камеру. Введите код вручную.');
      }
    }
  };

  // ── Цикл сканирования ─────────────────────────────
  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          handleSuccess(code.data);
          return;
        }
      } catch {
        // продолжаем
      }
    }
    rafRef.current = window.setTimeout(() => requestAnimationFrame(tick), 200);
  };

  const handleSuccess = (code: string) => {
    // вибрация на телефоне (если поддерживается)
    if ('vibrate' in navigator) {
      try { navigator.vibrate(80); } catch { /* noop */ }
    }
    stopCamera();
    onScan(code);
  };

  // ── Остановка камеры ──────────────────────────────
  const stopCamera = () => {
    if (rafRef.current) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // ── Жизненный цикл ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Маленькая задержка — чтобы модалка успела отрисоваться
      const id = setTimeout(() => startCamera(), 100);
      return () => {
        clearTimeout(id);
        stopCamera();
      };
    } else {
      stopCamera();
      setScanState('idle');
      setManualCode('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Рендеринг ─────────────────────────────────────

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black animate-fade-in" role="dialog" aria-modal="true">
      {/* Шапка */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur active-press"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center text-white">
            <div className="text-[15px]" style={{ fontWeight: 800 }}>{title}</div>
            <div className="text-[11px] opacity-80" style={{ fontWeight: 500 }}>{hint}</div>
          </div>
          <button
            onClick={() => setScanState('manual')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur active-press"
            aria-label="Ввести вручную"
          >
            <Keyboard className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Видео и оверлей */}
      {scanState === 'scanning' && (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Рамка для прицеливания */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[260px] h-[260px]">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-2xl" />
              {/* Сканирующая линия */}
              <div className="absolute left-2 right-2 h-0.5 bg-[#2EA7E0] shadow-[0_0_12px_#2EA7E0] animate-[scan_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
            </div>
          </div>

          {/* Подсказка снизу */}
          <div className="absolute bottom-0 left-0 right-0 safe-bottom">
            <div className="px-6 pb-6 text-center">
              <p className="text-white/90 text-[13px]" style={{ fontWeight: 600 }}>
                Совместите код с рамкой
              </p>
            </div>
          </div>
        </>
      )}

      {/* Запрос разрешения */}
      {scanState === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <Camera className="w-16 h-16 text-white/40 mb-4 animate-pulse" />
          <p className="text-white text-[15px]" style={{ fontWeight: 600 }}>
            Запрашиваем доступ к камере...
          </p>
        </div>
      )}

      {/* Доступ запрещён или ошибка */}
      {(scanState === 'denied' || scanState === 'error') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="w-16 h-16 text-[#F59E0B] mb-4" />
          <p className="text-white text-[16px] mb-2" style={{ fontWeight: 800 }}>
            Камера недоступна
          </p>
          <p className="text-white/80 text-[13px] max-w-xs mb-6" style={{ fontWeight: 500 }}>
            {errorMessage}
          </p>
          <div className="flex gap-2">
            <button
              onClick={startCamera}
              className="px-4 py-2.5 bg-white/20 backdrop-blur rounded-xl text-white text-[14px] flex items-center gap-2 active-press"
              style={{ fontWeight: 700 }}
            >
              <RefreshCw className="w-4 h-4" />
              Повторить
            </button>
            <button
              onClick={() => setScanState('manual')}
              className="px-4 py-2.5 bg-[#2EA7E0] rounded-xl text-white text-[14px] flex items-center gap-2 active-press"
              style={{ fontWeight: 700 }}
            >
              <Keyboard className="w-4 h-4" />
              Ввести вручную
            </button>
          </div>
        </div>
      )}

      {/* Ручной ввод */}
      {scanState === 'manual' && (
        <div className="absolute inset-0 bg-white animate-fade-in flex flex-col">
          <div className="safe-top" />
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F3F4F6] active-press"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5 text-[#1F2430]" />
            </button>
            <div className="text-[15px] text-[#1F2430]" style={{ fontWeight: 800 }}>
              Ввести код
            </div>
            <button
              onClick={() => startCamera()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F3F4F6] active-press"
              aria-label="Открыть камеру"
            >
              <Camera className="w-5 h-5 text-[#1F2430]" />
            </button>
          </div>

          <div className="flex-1 px-6 py-8">
            <p className="text-[14px] text-[#6B7280] mb-4" style={{ fontWeight: 500 }}>
              Введите штрих-код товара или артикул (SKU):
            </p>
            <input
              type="text"
              inputMode="text"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              placeholder="Например: 4607012345678 или MILK-001"
              className="w-full h-14 px-4 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2EA7E0] focus:outline-none text-[16px]"
              style={{ fontWeight: 600 }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="w-full h-14 mt-4 rounded-xl bg-[#2EA7E0] text-white disabled:bg-[#9CA3AF] disabled:opacity-60 active-press"
              style={{ fontWeight: 700 }}
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
