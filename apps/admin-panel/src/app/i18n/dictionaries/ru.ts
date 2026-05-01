/**
 * Russian dictionary — primary source of truth.
 * Every key defined here must exist in en/tr/tk dictionaries (TS enforces this
 * via `Dictionary` type derived from this object).
 *
 * Naming: dot-separated namespaces. Keep keys stable; prefer adding new keys
 * over renaming, since other dictionaries reference them.
 */
export const ru = {
  // Language selector itself
  'lang.ru': 'Русский',
  'lang.en': 'English',
  'lang.tr': 'Türkçe',
  'lang.tk': 'Türkmençe',
  'lang.label': 'Язык',

  // Common verbs / actions
  'common.save':    'Сохранить',
  'common.cancel':  'Отмена',
  'common.delete':  'Удалить',
  'common.edit':    'Редактировать',
  'common.create':  'Создать',
  'common.add':     'Добавить',
  'common.search':  'Поиск',
  'common.export':  'Экспорт',
  'common.import':  'Импорт',
  'common.refresh': 'Обновить',
  'common.close':   'Закрыть',
  'common.back':    'Назад',
  'common.next':    'Далее',
  'common.confirm': 'Подтвердить',
  'common.yes':     'Да',
  'common.no':      'Нет',
  'common.loading': 'Загрузка…',
  'common.empty':   'Пусто',
  'common.actions': 'Действия',
  'common.more':    'Ещё',
  'common.wip':     'Функция в разработке',

  // Header
  'header.search.placeholder': 'Поиск по заказу, треку, ШК, телефону, ПВЗ…',
  'header.role.viewAs':        'Просмотр как роль',
  'header.role.testing':       'Тест',
  'header.role.title':         'Просмотр панели от роли',
  'header.role.subtitle':      'SuperAdmin может проверить, что видит каждая роль',
  'header.role.adminRoles':    'Роли Admin Panel',
  'header.role.externalRoles': 'Внешние приложения · preview',
  'header.role.exit':          'Вернуться к SuperAdmin',
  'header.notifications':      'Уведомления',
  'header.notifications.unread': 'непрочитанных уведомлений',
  'header.logout':             'Выйти',

  // Personal cabinet shortcut + user card
  'cabinet.my':               'Мой кабинет',
  'cabinet.superAdminLabel':  'Супер админ',
  'cabinet.fullAccess':       'Полный доступ · Мой кабинет →',
  'cabinet.viewAs':            'Просмотр как:',
  'cabinet.exitImpersonation': 'Вернуться к SuperAdmin',
  'cabinet.previewBadge':      '(preview сотрудника)',

  // Sidebar — section headings
  'sidebar.section.catalog':  'Каталог',
  'sidebar.section.finance':  'Финансы',
  'sidebar.section.legal':    'Юридический',
  'sidebar.section.security': 'Безопасность',
  'sidebar.section.foreign':  'Зарубежные расчёты',
  'sidebar.section.reports':  'Отчётность',
  'sidebar.section.system':   'Система',
  'sidebar.expand':           'Развернуть',
  'sidebar.collapse':         'Свернуть',
  'sidebar.empty':            'Нет доступных разделов',

  // Sidebar — top-level modules
  'sidebar.module.dashboard':    'Операционная панель',
  'sidebar.module.users':        'Пользователи',
  'sidebar.module.pvz':          'ПВЗ',
  'sidebar.module.orders':       'Заказы',
  'sidebar.module.couriers':     'Курьеры',
  'sidebar.module.compliance':   'Проверка документов',
  'sidebar.module.warehouses':   'Склады',
  'sidebar.module.logistics':    'Логистика',
  'sidebar.module.merchants':    'Продавцы',
  'sidebar.module.products':     'Товары',
  'sidebar.module.promotions':   'Продвижение',
  'sidebar.module.finance':      'Финансы',
  'sidebar.module.accounting':   'Бухгалтерия',
  'sidebar.module.legal':        'Юридический отдел',
  'sidebar.module.chat':         'Чат-центр',
  'sidebar.module.support':      'Поддержка',
  'sidebar.module.security':     'Безопасность',
  'sidebar.module.approvals':    'Центр одобрения',
  'sidebar.module.foreign':      'Зарубежная оплата',
  'sidebar.module.analytics':    'Аналитика',
  'sidebar.module.reports':      'Отчёты',
  'sidebar.module.settings':     'Системные настройки',
  'sidebar.module.audit':        'Audit log',
  'sidebar.module.architecture': 'Platform Architecture',

  // Sidebar — security children (the ones we relabel)
  'sidebar.module.security.rbac': 'Роли и права',

  // Security Center
  'security.title':     'Центр безопасности',
  'security.subtitle':  'Политики · Сессии · IP-доступ · Токены · SSO · Алерты · SuperAdmin',
  'security.systemProtected': 'Система защищена',
  'security.activeIncidents': 'активных инцидентов',
  'security.createRole':       'Создать роль',
  'security.kpi.activeSessions': 'Активных сессий',
  'security.kpi.todayIncidents': 'Инцидентов сегодня',
  'security.kpi.blockedIp':      'Заблокировано IP',
  'security.kpi.tokens':         'API токенов',
  'security.tab.policies':   'Политики',
  'security.tab.sessions':   'Сессии',
  'security.tab.logins':     'Журнал входов',
  'security.tab.ip':         'IP-доступ',
  'security.tab.tokens':     'Токены и ключи',
  'security.tab.sso':        'SSO / OAuth',
  'security.tab.alerts':     'Алерты',
  'security.tab.superadmin': 'SuperAdmin',

  // RBAC Management
  'rbac.title':       'Роли и права',
  'rbac.subtitle':    'Единый реестр ролей и permissions. Каждый раздел sidebar и каждое действие подвязаны сюда.',
  'rbac.rolesCount':  'ролей',
  'rbac.createRole':  'Создать роль',
  'rbac.exportCsv':   'Экспорт CSV',
} as const;

/** Type derived from `ru` — every other dictionary must implement this exact shape. */
export type DictKey = keyof typeof ru;
export type Dictionary = Record<DictKey, string>;
