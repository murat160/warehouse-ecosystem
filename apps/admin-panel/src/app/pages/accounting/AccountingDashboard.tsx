import { Calculator } from 'lucide-react';
import { ModulePlaceholder } from '../../components/layout/ModulePlaceholder';

export function AccountingDashboard() {
  return (
    <ModulePlaceholder
      permKey="accounting"
      icon={Calculator}
      section="Финансы"
      title="Бухгалтерия — сводка"
      subtitle="Сверки, выплаты, инвойсы, налоги, отчёты для бухгалтерии."
      kpis={[
        { label: 'К сверке',           value: 14,        color: 'orange', hint: 'на этой неделе'   },
        { label: 'Выплат на удержании', value: '₽120 000', color: 'red',    hint: 'требует утверждения' },
        { label: 'Готовых отчётов',     value: 6,         color: 'green',  hint: 'за период'        },
        { label: 'Закрыто за месяц',    value: '₽4.2 млн', color: 'blue',  hint: 'операций'         },
      ]}
      columns={[
        { key: 'date',     label: 'Дата' },
        { key: 'oper',     label: 'Операция' },
        { key: 'amount',   label: 'Сумма', align: 'right' },
        { key: 'status',   label: 'Статус' },
      ]}
      rows={[
        { date: '14.02.2026', oper: 'Сверка платежей за неделю', amount: '₽342 100', status: 'В работе' },
        { date: '13.02.2026', oper: 'Подтверждение выплат продавцам', amount: '₽1 240 500', status: 'Готово' },
        { date: '12.02.2026', oper: 'Инвойс №2026-141', amount: '₽56 800', status: 'Отправлен' },
        { date: '10.02.2026', oper: 'Налоговый расчёт за январь', amount: '₽284 300', status: 'Закрыто' },
      ]}
      note="Бухгалтер видит этот раздел при разрешении accounting.view. Главный бухгалтер дополнительно может утверждать крупные выплаты (accounting.payouts.approve)."
    />
  );
}
