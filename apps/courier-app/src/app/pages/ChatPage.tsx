import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, Camera, Check, CheckCheck, Lock, Paperclip, Phone, Send, Video,
} from 'lucide-react';
import { useT } from '../i18n';
import { useCourierStore, isCustomerInfoUnlocked } from '../store/CourierStore';
import type { ChatMessage } from '../store/types';

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ChatPage() {
  const t = useT();
  const navigate = useNavigate();
  const { chatId = 'support' } = useParams();
  const { state, sendMessage, markChannelViewed } = useCourierStore();

  const isSupport = chatId === 'support';
  const channelKey = isSupport ? 'support' : `customer:${state.activeOrder?.id ?? 'none'}`;
  const customerLocked = !isSupport && !isCustomerInfoUnlocked(state.activeOrder?.status);

  const messages = useMemo(
    () => state.messages.filter(m => m.channelKey === channelKey).sort((a, b) => a.createdAt - b.createdAt),
    [state.messages, channelKey],
  );

  const [text, setText] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customerLocked) markChannelViewed(channelKey);
  }, [channelKey, customerLocked, markChannelViewed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  function send() {
    if (!text.trim() || customerLocked) return;
    sendMessage(channelKey, { text: text.trim() });
    setText('');
  }

  function attachPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') sendMessage(channelKey, { photoUrl: r.result });
    };
    r.readAsDataURL(f);
    e.target.value = '';
    setAttachOpen(false);
  }

  function attachVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') sendMessage(channelKey, { videoUrl: r.result });
    };
    r.readAsDataURL(f);
    e.target.value = '';
    setAttachOpen(false);
  }

  const title = isSupport ? t('chat.support') : t('chat.customer');

  return (
    <div className="min-h-full flex flex-col bg-[#F0F2F5]">
      <header className="bg-white px-3 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold truncate">{title}</div>
          {!isSupport && state.activeOrder && (
            <div className="text-xs text-gray-500 truncate">
              {isCustomerInfoUnlocked(state.activeOrder.status) ? state.activeOrder.customer.name : t('privacy.unlock_after_pickup')}
            </div>
          )}
        </div>
        {!isSupport && state.activeOrder && isCustomerInfoUnlocked(state.activeOrder.status) && (
          <a
            href={`tel:${state.activeOrder.customer.phone}`}
            className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center"
          >
            <Phone className="w-5 h-5" />
          </a>
        )}
      </header>

      {customerLocked ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-gray-500" />
          </div>
          <h2 className="text-[18px] font-extrabold mb-1">{t('chat.locked_until_pickup')}</h2>
          <p className="text-sm text-gray-600 max-w-xs">{t('chat.locked_hint')}</p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-10">{t('chat.no_messages')}</div>
            )}
            {messages.map(m => <Bubble key={m.id} m={m} />)}
            {isSupport && (
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                {(['chat.quick.where','chat.quick.coming','chat.quick.delay','chat.quick.arrived'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => sendMessage(channelKey, { text: t(k) })}
                    className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold border border-gray-200 active:bg-gray-50"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border-t border-gray-200 px-2 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2">
              <button
                onClick={() => setAttachOpen(o => !o)}
                className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                rows={1}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('chat.placeholder')}
                className="flex-1 resize-none bg-gray-100 rounded-2xl px-3 py-2.5 text-[15px] outline-none max-h-32"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {attachOpen && (
              <div className="mt-2 flex gap-2">
                <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={attachPhoto} />
                <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={attachVideo} />
                <button
                  onClick={() => photoRef.current?.click()}
                  className="flex-1 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  {t('common.photo')}
                </button>
                <button
                  onClick={() => videoRef.current?.click()}
                  className="flex-1 h-12 rounded-2xl bg-sky-50 text-sky-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" />
                  {t('common.video')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const t = useT();
  const own = m.from === 'courier';
  const statusLabel = m.status === 'sent' ? t('chat.sent') : m.status === 'delivered' ? t('chat.delivered') : t('chat.viewed');
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-[15px] ${
          own ? 'bg-emerald-500 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
        }`}
      >
        {m.photoUrl && (
          <img src={m.photoUrl} alt="photo" className="rounded-xl mb-1 max-h-56 object-cover" />
        )}
        {m.videoUrl && (
          <video src={m.videoUrl} controls className="rounded-xl mb-1 max-h-56" />
        )}
        {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
        <div className={`mt-0.5 flex items-center gap-1 text-[11px] ${own ? 'text-white/80 justify-end' : 'text-gray-500'}`}>
          <span>{formatTime(m.createdAt)}</span>
          {own && (
            <span title={statusLabel} aria-label={m.status}>
              {m.status === 'sent' && <Check className="w-3.5 h-3.5" />}
              {m.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 opacity-80" />}
              {m.status === 'viewed' && <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
