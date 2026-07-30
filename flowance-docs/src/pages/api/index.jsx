import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import SwaggerUI from 'swagger-ui-react';
import styles from './index.module.css';

const apiSpecs = [
  {
    file: 'authentication_api.yaml',
    label: 'Authentication API',
    description: 'ログイン、認証、認可に関するAPI仕様',
  },
  {
    file: 'client_api.yaml',
    label: 'Client API',
    description: '取引先・顧客管理に関するAPI仕様',
  },
  {
    file: 'project_api.yaml',
    label: 'Project API',
    description: '案件・プロジェクト管理に関するAPI仕様',
  },
  {
    file: 'contract_api.yaml',
    label: 'Contract API',
    description: '契約・単価・契約条件に関するAPI仕様',
  },
  {
    file: 'schedule_api.yaml',
    label: 'Schedule API',
    description: '予定・稼働予定生成に関するAPI仕様',
  },
  {
    file: 'work_records_api.yaml',
    label: 'Work Records API',
    description: '作業実績・工数記録に関するAPI仕様',
  },
  {
    file: 'settlement_api.yaml',
    label: 'Settlement API',
    description: '締め・精算・請求前確認に関するAPI仕様',
  },
  {
    file: 'settings_api.yaml',
    label: 'Settings API',
    description: '設定・マスタ管理に関するAPI仕様',
  },
];

export default function ApiExplorer() {
  const [activeFile, setActiveFile] = useState(apiSpecs[0].file);
  const activeSpec = useMemo(
    () => apiSpecs.find((spec) => spec.file === activeFile) ?? apiSpecs[0],
    [activeFile],
  );
  const specUrl = `/openapi/${activeSpec.file}`;

  return (
    <Layout title="API仕様" description="FLOWANCE OpenAPI specifications rendered with Swagger UI">
      <main className={styles.page}>
        <section className={styles.header}>
          <p className={styles.eyebrow}>OpenAPI Explorer</p>
          <h1>API仕様をSwagger UIで確認</h1>
          <p>
            正本は <code>docs/06_api/openapi</code> のYAMLです。ビルド前に静的配信用へ同期し、ここで自動的にHTML表示します。
          </p>
        </section>

        <div className={styles.layout}>
          <aside className={styles.selector} aria-label="API仕様一覧">
            {apiSpecs.map((spec) => (
              <button
                key={spec.file}
                type="button"
                className={spec.file === activeSpec.file ? styles.activeSpecButton : styles.specButton}
                onClick={() => setActiveFile(spec.file)}>
                <span>{spec.label}</span>
                <small>{spec.description}</small>
              </button>
            ))}
          </aside>

          <section className={styles.viewer} aria-label={`${activeSpec.label} Swagger UI`}>
            <div className={styles.viewerHeader}>
              <div>
                <p className={styles.viewerEyebrow}>Selected spec</p>
                <h2>{activeSpec.label}</h2>
              </div>
              <a className={styles.rawLink} href={specUrl} target="_blank" rel="noreferrer">
                YAMLを開く
              </a>
            </div>
            <div className={styles.swaggerFrame}>
              <SwaggerUI
                url={specUrl}
                docExpansion="list"
                defaultModelsExpandDepth={1}
                displayRequestDuration
                persistAuthorization
              />
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
