/**
 * Extra finance subsections that didn't exist before:
 * commissions / invoices / taxes / reports.
 */
import { TrendingUp, FileText, Calculator, FileSpreadsheet } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

const baseColumns = [
  { key: 'name',   label: 'Документ' },
  { key: 'period', label: 'Период' },
  { key: 'amount', label: 'Сумма', align: 'right' as const },
  { key: 'status', label: 'Статус' },
];

export function FinanceCommissions() {
  return (
    <ModulePlaceholder
      permKey="finance.commissions" icon={TrendingUp} section="Финансы"
      title="Комиссии"
      subtitle="Комиссия платформы по продавцам и категориям."
      kpis={[
        { label: 'Комиссия за месяц', value: '₽420 000', color: 'green' },
        { label: 'Средний %',         value: '8.6%',     color: 'purple' },
        { label: 'Договоров',         value: 86,         color: 'blue' },
      ]}
      columns={[
        { key: 'merchant', label: 'Продавец' },
        { key: 'rate',     label: '%', align: 'right' as const },
        { key: 'turnover', label: 'Оборот', align: 'right' as const },
        { key: 'fee',      label: 'Комиссия', align: 'right' as const },
      ]}
      rows={[
        { merchant: 'ЭлектроМир',    rate: '7.5%',  turnover: '₽1 240 000', fee: '₽93 000' },
        { merchant: 'TextileShop',   rate: '9.0%',  turnover: '₽342 100',   fee: '₽30 800' },
        { merchant: 'Кафе «Уют»',    rate: '12.0%', turnover: '₽89 600',    fee: '₽10 752' },
        { merchant: 'TechStore MSK', rate: '8.0%',  turnover: '₽512 400',   fee: '₽40 992' },
      ]}
    />
  );
}

export function FinanceInvoices() {
  return (
    <ModulePlaceholder
      permKey="finance.invoices" icon={FileText} section="Финансы"
      title="Инвойсы"
      subtitle="Счета на оплату для контрагентов."
      kpis={[
        { label: 'Выставлено', value: 142, color: 'blue' },
        { label: 'Оплачено',   value: 124, color: 'green' },
        { label: 'Просрочено', value: 6,   color: 'red' },
        { label: 'К оплате',   value: '₽340 000', color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'INV-2026-141', period: 'Янв 2026', amount: '₽56 800',   status: 'Отправлен' },
        { name: 'INV-2026-140', period: 'Янв 2026', amount: '₽120 400',  status: 'Оплачен' },
        { name: 'INV-2026-139', period: 'Янв 2026', amount: '₽12 800',   status: 'Просрочен' },
      ]}
    />
  );
}

export function FinanceTaxes() {
  return (
    <ModulePlaceholder
      permKey="finance.taxes" icon={Calculator} section="Финансы"
      title="Налоги"
      subtitle="Расчёт и уплата налогов, отчёты в ИФНС."
      kpis={[
        { label: 'Уплачено в Q4', value: '₽1.8 млн', color: 'green' },
        { label: 'К оплате',      value: '₽284 300', color: 'red' },
        { label: 'В работе',      value: 3,          color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'НДС за Q4',        period: 'Q4 2025', amount: '₽284 300',  status: 'К оплате' },
        { name: 'Налог на прибыль', period: '2025',    amount: '₽1 120 000',status: 'Готов' },
      ]}
    />
  );
}

export function FinanceReports() {
  return (
    <ModulePlaceholder
      permKey="finance.reports" icon={FileSpreadsheet} section="Финансы"
      title="Финансовые отчёты"
      subtitle="P&L, ДДС, отчёты по выплатам, маржинальный анализ."
      kpis={[
        { label: 'Готовых',  value: 18, color: 'green' },
        { label: 'В работе', value: 4,  color: 'orange' },
      ]}
      columns={[
        { key: 'name',   label: 'Отчёт' },
        { key: 'period', label: 'Период' },
        { key: 'updated',label: 'Обновлён' },
        { key: 'status', label: 'Статус' },
      ]}
      rows={[
        { name: 'P&L',                 period: 'Q4 2025', updated: '01.02.2026', status: 'Готов' },
        { name: 'Cash Flow Statement', period: 'Q4 2025', updated: '01.02.2026', status: 'Готов' },
        { name: 'Margin by category',  period: 'Янв 2026',updated: '14.02.2026', status: 'В работе' },
      ]}
    />
  );
}
