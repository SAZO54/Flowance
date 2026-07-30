import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const highlights = [
  {
    title: 'docs/が正本',
    description:
      '設計書本文はMarkdownとOpenAPI YAMLとしてGit管理し、Notionとの二重管理を避けます。',
    href: '/docs/'
  },
  {
    title: 'HTMLで閲覧',
    description:
      'Docusaurusで読みやすいHTMLサイトを生成し、設計書を横断しやすくします。',
    href: '/docs/requirements/requirements-definition'
  },
  {
    title: 'Phaseごとに固定',
    description:
      'Phase完了時点の設計書はバージョン化し、最新設計とは分けて参照できます。',
    href: '/docs/adr/use-django'
  }
];

const docGroups = [
  {
    label: '要件・基本設計',
    links: [
      ['要件定義', '/docs/requirements/requirements-definition'],
      ['基本設計', '/docs/basic/basic-design'],
      ['サービス指向UI設計', '/docs/service-oriented-ui-design']
    ]
  },
  {
    label: '業務・データ',
    links: [
      ['ドメイン・業務ロジック', '/docs/domain/domain-business-logic-design'],
      ['DB設計', '/docs/database/database-design'],
      ['契約・売上計算', '/docs/contract-revenue/contract-revenue-calculation-design']
    ]
  },
  {
    label: '実装・運用',
    links: [
      ['API設計', '/docs/api/api-design'],
      ['認証・認可', '/docs/security/authentication-authorization-design'],
      ['エラー・バリデーション', '/docs/error-handling/validation-detail-design'],
      ['インフラ・運用', '/docs/infrastructure/infrastructure-operations-design']
    ]
  }
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="FLOWANCE Docs"
      description="FLOWANCEの設計書をdocs/から生成するHTMLドキュメントサイト">
      <main>
        <section className={styles.hero}>
          <div className="container">
            <p className={styles.eyebrow}>FLOWANCE Documentation</p>
            <Heading as="h1" className={styles.title}>
              業務とお金の流れを迷子にしない設計書
            </Heading>
            <p className={styles.lead}>
              Notionは入口、docs/は正本、HTMLは閲覧用。Phaseごとの設計履歴を残しながら、
              最新の仕様を迷わず参照できる形にします。
            </p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/">
                設計書を開く
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/api/api-design">
                API設計を見る
              </Link>
            </div>
          </div>
        </section>

        <section className={clsx('container', styles.highlights)}>
          {highlights.map((item) => (
            <Link className={styles.highlightCard} to={item.href} key={item.title}>
              <Heading as="h2">{item.title}</Heading>
              <p>{item.description}</p>
            </Link>
          ))}
        </section>

        <section className={clsx('container', styles.docGrid)}>
          {docGroups.map((group) => (
            <article className={styles.docGroup} key={group.label}>
              <Heading as="h2">{group.label}</Heading>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link to={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </Layout>
  );
}
