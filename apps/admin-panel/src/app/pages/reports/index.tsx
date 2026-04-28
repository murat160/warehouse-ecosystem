/**
 * Report pages — all subsections share the same minimal real-looking
 * layout via ModulePlaceholder. Each export is a separate page so they can
 * be RBAC-gated independently.
 */
import {
  FileSpreadsheet, Package, DollarSign, Store, Bike, MapPin, Warehouse,
  Scale, Calculator, Megaphone,
} from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

const baseColumns = [
  { key: 'name',   label: 'Отчёт' },
  { key: 'period', label: 'Период' },
  { key: 'rows',   label: 'Строк', align: 'right' as const },
  { key: 'updated',label: 'Обновлён' },
];

export function ReportsDashboard() {
  return (
    <ModulePlaceholder
      permKey="reports"
      icon={FileSpreadsheet}
      section="Отчётность"
      title="Отчёты — сводка"
      subtitle="Отчёты по всем разделам: заказы, финансы, продавцы, курьеры, ПВЗ, склады, юр. отдел, бухгалтерия, маркетинг."
      kpis={[
        { label: 'Всего отчётов', value: 86, color: 'blue' },
        { label: 'За месяц',      value: 18, color: 'green' },
        { label: 'Расписаний',    value: 9,  color: 'purple' },
        { label: 'Экспортов',     value: 142, color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Заказы за месяц',        period: 'Янв 2026', rows: '12 480', updated: '14.02.2026' },
        { name: 'Выручка по продавцам',   period: 'Q4 2025',  rows: '32',     updated: '01.02.2026' },
        { name: 'Производительность ПВЗ', period: 'Янв 2026', rows: '85',     updated: '12.02.2026' },
        { name: 'Маржа по категориям',    period: 'Q4 2025',  rows: '14',     updated: '03.02.2026' },
      ]}
    />
  );
}

export function ReportsOrders() {
  return (
    <ModulePlaceholder
      permKey="reports.orders" icon={Package} section="Отчётность"
      title="Отчёт: Заказы"
      subtitle="Детальные отчёты по заказам, среднему чеку, отказам, доставке."
      kpis={[
        { label: 'Всего заказов',    value: '12 480', color: 'blue' },
        { label: 'Доставлено',       value: '11 920', color: 'green' },
        { label: 'Отказов',          value: '320',    color: 'red' },
        { label: 'Средний чек',      value: '₽3 240', color: 'purple' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Все заказы',         period: 'Янв 2026',  rows: '12 480', updated: '14.02.2026' },
        { name: 'Отказы и возвраты',  period: 'Янв 2026',  rows: '320',    updated: '14.02.2026' },
      ]}
    />
  );
}

export function ReportsFinance() {
  return (
    <ModulePlaceholder
      permKey="reports.finance" icon={DollarSign} section="Отчётность"
      title="Отчёт: Финансы"
      subtitle="Выручка, выплаты, комиссии, маржа платформы."
      kpis={[
        { label: 'Выручка', value: '₽4.2 млн', color: 'green' },
        { label: 'Выплаты', value: '₽3.6 млн', color: 'blue' },
        { label: 'Комиссия',value: '₽420 000', color: 'purple' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Выручка по дням',     period: 'Янв 2026', rows: '31', updated: '14.02.2026' },
        { name: 'Платежи по продавцам',period: 'Янв 2026', rows: '32', updated: '12.02.2026' },
      ]}
    />
  );
}

export function ReportsSellers() {
  return (
    <ModulePlaceholder
      permKey="reports.sellers" icon={Store} section="Отчётность"
      title="Отчёт: Продавцы"
      subtitle="Топ-продавцы, рейтинги, оборот, проблемы и претензии."
      kpis={[
        { label: 'Всего',     value: 86, color: 'blue' },
        { label: 'Активных',  value: 72, color: 'green' },
        { label: 'С жалобами',value: 4,  color: 'red' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Топ-50 продавцов', period: 'Янв 2026', rows: '50', updated: '14.02.2026' },
        { name: 'Рейтинги',         period: 'Янв 2026', rows: '86', updated: '14.02.2026' },
      ]}
    />
  );
}

export function ReportsCouriers() {
  return (
    <ModulePlaceholder
      permKey="reports.couriers" icon={Bike} section="Отчётность"
      title="Отчёт: Курьеры"
      subtitle="Доставки, SLA, выработка, инциденты."
      kpis={[
        { label: 'Курьеров',  value: 54, color: 'blue' },
        { label: 'Доставок',  value: '11 920', color: 'green' },
        { label: 'SLA',       value: '96.4%', color: 'purple' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Доставки за месяц', period: 'Янв 2026', rows: '11 920', updated: '14.02.2026' },
        { name: 'Топ-курьеры',       period: 'Янв 2026', rows: '20',     updated: '14.02.2026' },
      ]}
    />
  );
}

export function ReportsPVZ() {
  return (
    <ModulePlaceholder
      permKey="reports.pvz" icon={MapPin} section="Отчётность"
      title="Отчёт: ПВЗ"
      subtitle="Загрузка ПВЗ, выдача, остатки, кассовые операции."
      kpis={[
        { label: 'ПВЗ',         value: 85, color: 'blue' },
        { label: 'Выдано',      value: '11 920', color: 'green' },
        { label: 'Возвратов',   value: '120', color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Производительность ПВЗ', period: 'Янв 2026', rows: '85', updated: '12.02.2026' },
      ]}
    />
  );
}

export function ReportsWarehouses() {
  return (
    <ModulePlaceholder
      permKey="reports.warehouses" icon={Warehouse} section="Отчётность"
      title="Отчёт: Склады"
      subtitle="Поступления, отгрузки, остатки, инвентаризация."
      kpis={[
        { label: 'Складов',     value: 5, color: 'blue' },
        { label: 'Позиций',     value: '12 480', color: 'green' },
        { label: 'Низкий остаток', value: 24, color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Остатки по складам', period: 'Янв 2026', rows: '5',  updated: '14.02.2026' },
        { name: 'Инвентаризация',     period: 'Q4 2025',  rows: '5',  updated: '15.01.2026' },
      ]}
    />
  );
}

export function ReportsLegal() {
  return (
    <ModulePlaceholder
      permKey="reports.legal" icon={Scale} section="Отчётность"
      title="Отчёт: Юридические"
      subtitle="Сводные отчёты по спорам, претензиям, договорам, рискам."
      kpis={[
        { label: 'Споров',       value: 6, color: 'red' },
        { label: 'Договоров',    value: 142, color: 'green' },
        { label: 'Истекающих',   value: 6, color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Реестр споров',     period: 'Q4 2025', rows: '6',   updated: '01.02.2026' },
        { name: 'Истекающие договоры', period: '2026',  rows: '6',   updated: '14.02.2026' },
      ]}
    />
  );
}

export function ReportsAccounting() {
  return (
    <ModulePlaceholder
      permKey="reports.accounting" icon={Calculator} section="Отчётность"
      title="Отчёт: Бухгалтерия"
      subtitle="Книга продаж, налоги, сверки, оборот."
      kpis={[
        { label: 'Готовых',  value: 24, color: 'green' },
        { label: 'В работе', value: 5,  color: 'orange' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Книга продаж',  period: 'Q4 2025', rows: '12 480', updated: '01.02.2026' },
        { name: 'НДС-декларация',period: 'Q4 2025', rows: '1',      updated: '03.02.2026' },
      ]}
    />
  );
}

export function ReportsMarketing() {
  return (
    <ModulePlaceholder
      permKey="reports.marketing" icon={Megaphone} section="Отчётность"
      title="Отчёт: Маркетинг"
      subtitle="Эффективность акций, скидок, рекламных кампаний."
      kpis={[
        { label: 'Кампаний',   value: 18, color: 'blue' },
        { label: 'CTR',        value: '4.2%', color: 'purple' },
        { label: 'ROI',        value: '+128%', color: 'green' },
      ]}
      columns={baseColumns}
      rows={[
        { name: 'Эффективность акций', period: 'Янв 2026', rows: '18', updated: '14.02.2026' },
        { name: 'Анализ скидок',       period: 'Янв 2026', rows: '32', updated: '14.02.2026' },
      ]}
    />
  );
}
