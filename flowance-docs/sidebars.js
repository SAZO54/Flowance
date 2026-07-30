// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  designSidebar: [
    'index',
    {
      type: 'category',
      label: '要件・基本設計',
      collapsed: false,
      items: [
        'requirements/requirements-definition',
        'basic/basic-design',
        'architecture/system-architecture',
        'service-oriented-ui-design'
      ]
    },
    {
      type: 'category',
      label: 'ドメイン・DB',
      collapsed: false,
      items: [
        'domain/domain-business-logic-design',
        'database/database-design',
        'contract-revenue/contract-revenue-calculation-design'
      ]
    },
    {
      type: 'category',
      label: 'API・エラー',
      collapsed: false,
      items: [
        'api/api-design',
        { type: 'link', label: 'OpenAPI Swagger UI', href: '/api' },
        'error-handling/error-handling-design',
        'error-handling/validation-detail-design'
      ]
    },
    {
      type: 'category',
      label: 'セキュリティ・基盤',
      collapsed: false,
      items: [
        'security/authentication-authorization-design',
        'async-processing/async-processing-design',
        'file-storage/file-image-management-design',
        'cache/cache-design',
        'infrastructure/infrastructure-operations-design'
      ]
    },
    {
      type: 'category',
      label: '詳細設計・テスト',
      collapsed: false,
      items: [
        'icon-processing/icon-processing-design',
        'schedule-generation/schedule-generation-design',
        'testing/test-design'
      ]
    },
    {
      type: 'category',
      label: 'ADR',
      collapsed: false,
      items: [
        'adr/index',
        'adr/use-django',
        'adr/use-jwt',
        'adr/use-clean-architecture',
        'adr/use-redis-celery',
        'adr/use-decimal-for-money'
      ]
    }
  ]
};

module.exports = sidebars;

