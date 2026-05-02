import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, Lock, MessageCircle, Send,
} from 'lucide-react';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { useCourierStore } from '../store/CourierStore';
import { ProblemModal } from '../components/ProblemModal';

const FAQ: { q: TKey; a: TKey }[] = [
  { q: 'support.faq.q1', a: 'support.faq.a1' },
  { q: 'support.faq.q2', a: 'support.faq.a2' },
  { q: 'support.faq.q3', a: 'support.faq.a3' },
  { q: 'support.faq.q4', a: 'support.faq.a4' },
];

export function SupportPage() {
  const t = useT();
  const navigate = useNavigate();
  const { state, reportProblem } = useCourierStore();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [problemOpen, setProblemOpen] = useState(false);

  const supportMessageCount = state.messages.filter(m => m.channelKey === 'support').length;
  const hasOngoingChat = supportMessageCount > 1; // 1 = seed message only

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full active:bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-extrabold">{t('support.title')}</h1>
          <p className="text-xs text-gray-500">{t('support.subtitle')}</p>
        </div>
      </header>

      <div className="px-4 pt-3 space-y-3 pb-8">
        <button
          onClick={() => navigate('/chat/support')}
          className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-4 shadow-lg active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[16px] font-extrabold">
                {hasOngoingChat ? t('support.continue_chat') : t('support.start_chat')}
              </div>
              <div className="text-[12px] opacity-90 mt-0.5">{supportMessageCount} {t('chat.support').toLowerCase()}</div>
            </div>
            <Send className="w-5 h-5 opacity-80" />
          </div>
        </button>

        <button
          onClick={() => setProblemOpen(true)}
          className="w-full bg-white rounded-2xl p-4 border border-amber-200 active:bg-amber-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] font-extrabold text-amber-900">{t('support.report_problem')}</div>
              <div className="text-[12px] text-amber-800/80">{t('problem.subtitle')}</div>
            </div>
          </div>
        </button>

        <div className="rounded-2xl bg-gray-100 p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-gray-600">{t('support.no_phone_hint')}</p>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 px-1 mb-2">{t('support.faq')}</div>
          <ul className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {FAQ.map((item, idx) => (
              <li key={item.q} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
                >
                  <span className="flex-1 text-[14px] font-semibold text-gray-900">{t(item.q)}</span>
                  {openIdx === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openIdx === idx && (
                  <div className="px-4 pb-3 text-[13px] text-gray-700 leading-relaxed">{t(item.a)}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProblemModal
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        onSubmit={(d) => {
          reportProblem(d);
          setProblemOpen(false);
          navigate('/chat/support');
        }}
      />
    </div>
  );
}
