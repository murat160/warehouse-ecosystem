import { useState } from 'react';
import {
  Download, FileText, CreditCard, TrendingUp, DollarSign,
  CheckCircle, Clock, XCircle, AlertTriangle, Eye, Percent, ArrowRight
} from 'lucide-react';
import {
  SellerDetail, getSellerPayouts, SellerPayout, PayoutStatus,
  formatCurrency, formatNumber
} from '../../data/merchants-mock';
import { toast } from 'sonner';

interface Props { sellerId: string; seller: SellerDetail; onNavigateToCommission?: () => void; }

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Ожидает', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  approved: { label: 'Утверждена', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle },
  paid: { label: 'Выплачена', color: 'text-green-700', bg: 'bg-green-100', icon: CreditCard },
  on_hold: { label: 'Холд', color: 'text-purple-700', bg: 'bg-purple-100', icon: AlertTriangle },
  rejected: { label: 'Отклонена', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export function SellerFinanceTab({ sellerId, seller, onNavigateToCommission }: Props) {
  const payouts = getSellerPayouts(sellerId);

  return (
    <div className="space-y-5">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Общая выручка',   value: formatCurrency(seller.totalRevenue),    sub: 'за всё время',             color: 'text-gray-900',   bg: 'bg-gray-50',   icon: TrendingUp, onClick: () => toast.info('Общая выручка', { description: 'Совокупный оборот за всё время работы' }) },
          { label: 'Доход платформы', value: formatCurrency(seller.platformEarnings),sub: `комиссия ${seller.commissionRate}%`, color: 'text-blue-600', bg: 'bg-blue-50',   icon: DollarSign, onClick: () => onNavigateToCommission ? onNavigateToCommission() : toast.info('Откройте вкладку «Комиссии»') },
          { label: 'Ожидает выплаты', value: formatCurrency(seller.pendingPayouts),  sub: 'неоплаченные периоды',     color: 'text-orange-600', bg: 'bg-orange-50', icon: CreditCard, onClick: () => toast.info('Выплаты', { description: 'Отображены ожидающие выплаты' }) },
          { label: 'Тариф',           value: seller.commissionPlanName,              sub: 'тарифный план',            color: 'text-purple-700', bg: 'bg-purple-50', icon: Percent,    onClick: () => onNavigateToCommission ? onNavigateToCommission() : toast.info('Откройте вкладку «Комиссии»') },
        ].map(k => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              onClick={k.onClick}
              className={`${k.bg} rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-md active:scale-[0.97]`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${k.color} opacity-70`} />
                <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              </div>
              <p className={`text-xl font-bold ${k.color} mt-1`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Payout Hold Warning */}
      {seller.payoutHold && (
        <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800">Выплаты на холде</p>
            <p className="text-sm text-purple-700 mt-0.5">Все выплаты приостановлены. Для снятия холда требуется подтверждение Finance + Admin (SoD).</p>
          </div>
        </div>
      )}

      {/* Payouts Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Выплаты</h3>
          <button onClick={() => toast.success('Экспорт выплат запущен')} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Экспорт
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-3 py-2 font-medium text-gray-500">Код</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Период</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Оборот</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Комиссия</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">К выплате</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Статус</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 hidden lg:table-cell">Создана</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 hidden lg:table-cell">Оплачена</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Документы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map(payout => {
                const sc = PAYOUT_STATUS_CONFIG[payout.status];
                const Icon = sc.icon;
                return (
                  <tr key={payout.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 font-medium text-gray-900 font-mono text-xs">{payout.payoutCode}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{payout.period}</td>
                    <td className="px-3 py-2.5 text-right">₽{payout.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">-₽{payout.commission.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-green-700">₽{payout.netAmount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sc.bg} ${sc.color}`}>
                        <Icon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{payout.createdAt}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{payout.paidAt || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => toast.success(`Скачивание ${payout.documentsCount} документов...`)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <FileText className="w-3 h-3" /> {payout.documentsCount}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SoD Notice */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">SoD (Separation of Duties):</span> Создание выплаты и утверждение выполняются разными лицами. 
          Изменение комиссии требует подтверждения Admin + Finance. Все финансовые операции логируются в аудит с привязкой к актору и IP.
        </p>
      </div>
    </div>
  );
}