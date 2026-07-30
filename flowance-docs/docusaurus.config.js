// @ts-check

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'FLOWANCE Docs',
  tagline: '業務とお金の流れを迷子にしないための設計書',
  favicon: 'img/favicon.svg',

  url: 'https://flowance-docs.local',
  baseUrl: '/',

  organizationName: 'flowance',
  projectName: 'flowance-docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },

  i18n: {
    defaultLocale: 'ja',
    locales: ['ja']
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          showLastUpdateAuthor: false,
          showLastUpdateTime: false
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.svg',
      navbar: {
        title: 'FLOWANCE Docs',
        logo: {
          alt: 'FLOWANCE',
          src: 'img/logo.svg'
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'designSidebar',
            position: 'left',
            label: '設計書'
          },
          {
            href: '/api',
            label: 'API仕様',
            position: 'left'
          },
          {
            href: '/docs/adr/use-django',
            label: 'ADR',
            position: 'left'
          }
        ]
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'FLOWANCE',
            items: [
              {
                label: '設計書トップ',
                to: '/docs'
              },
              {
                label: '要件定義',
                to: '/docs/requirements/requirements-definition'
              },
              {
                label: 'API設計',
                to: '/docs/api/api-design'
              },
              {
                label: 'API仕様',
                to: '/api'
              }
            ]
          },
          {
            title: '運用',
            items: [
              {
                label: '正本は docs/',
                to: '/docs'
              },
              {
                label: 'Phaseスナップショットは Docusaurus versioning で管理',
                to: '/docs'
              }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} FLOWANCE`
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['yaml', 'bash', 'json', 'python', 'typescript']
      },
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4
      }
    })
};

module.exports = config;
