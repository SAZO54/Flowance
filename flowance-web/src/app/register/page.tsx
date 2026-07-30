'use client'

import {Building2, Globe2, LoaderCircle, LockKeyhole, Mail, UserRound} from 'lucide-react'
import Link from 'next/link'
import {FormEvent, useState} from 'react'
import {useRouter} from 'next/navigation'
import {registerAccount} from '@/application/auth'
import {authApi} from '@/infrastructure/api/authApi'
import styles from '../login/login.module.css'

const timezoneOptions = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : ['Asia/Tokyo', 'UTC']

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [timezone, setTimezone] = useState('Asia/Tokyo')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = Boolean(displayName.trim() && organizationName.trim() && email.trim() && password.length >= 12 && timezone)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setSubmitting(true)
    try {
      await registerAccount(authApi, {
        displayName: displayName.trim(),
        organizationName: organizationName.trim(),
        email: email.trim(),
        password,
        timezone,
      })
      router.replace('/dashboard')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'アカウントを作成できませんでした。しばらくしてからお試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className={styles.page}>
    <section className={styles.intro} aria-label="Flowanceの紹介">
      <div className={styles.introInner}>
        <div className={styles.brand}><span className={styles.brandMark}><i/><i/><i/></span>flowance</div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>START YOUR BETTER FLOW</p>
          <h1>仕事の流れを、<br/><span>ひとつに整える。</span></h1>
          <p>案件、予定、稼働まで。フリーランスの毎日を、ひとつの場所で心地よく整えます。</p>
        </div>
        <p className={styles.copyright}>© 2026 Flowance</p>
      </div>
    </section>
    <section className={`${styles.formPane} ${styles.registerPane}`}>
      <div className={styles.mobileBrand}><span className={styles.brandMark}><i/><i/><i/></span>flowance</div>
      <div className={styles.formWrap}>
        <div className={styles.heading}><p>CREATE ACCOUNT</p><h2>アカウントを作成</h2><span>利用者と最初の組織を登録して、Flowanceを始めましょう。</span></div>
        <form onSubmit={handleSubmit} className={`${styles.form} ${styles.registerForm}`} noValidate>
          <label><span>表示名 <i className="required-symbol">※</i></span><div className={styles.inputWrap}><UserRound size={18}/><input value={displayName} onChange={event => setDisplayName(event.target.value)} name="displayName" autoComplete="name" data-max-length={100} placeholder="山田 花子" required disabled={submitting}/></div></label>
          <label><span>組織名 <i className="required-symbol">※</i></span><div className={styles.inputWrap}><Building2 size={18}/><input value={organizationName} onChange={event => setOrganizationName(event.target.value)} name="organizationName" autoComplete="organization" data-max-length={150} placeholder="Flowance Studio" required disabled={submitting}/></div></label>
          <label><span>メールアドレス <i className="required-symbol">※</i></span><div className={styles.inputWrap}><Mail size={18}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} name="email" autoComplete="email" data-max-length={254} placeholder="you@example.com" required disabled={submitting}/></div></label>
          <label><span>パスワード <i className="required-symbol">※</i></span><div className={styles.inputWrap}><LockKeyhole size={18}/><input type="password" value={password} onChange={event => setPassword(event.target.value)} name="password" autoComplete="new-password" minLength={12} data-max-length={128} placeholder="12文字以上で入力" required disabled={submitting}/></div></label>
          <label><span>タイムゾーン <i className="required-symbol">※</i></span><div className={styles.inputWrap}><Globe2 size={18}/><select value={timezone} onChange={event => setTimezone(event.target.value)} name="timezone" required disabled={submitting}>{timezoneOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></div></label>
          {error && <div className={styles.error} role="alert" aria-live="polite">{error}</div>}
          <button className={styles.submit} type="submit" disabled={submitting || !canSubmit}>{submitting ? <><LoaderCircle className={styles.spinner} size={18}/>作成中...</> : 'アカウントを作成'}</button>
        </form>
        <p className={styles.support}>すでにアカウントをお持ちですか？ <Link href="/login">ログイン</Link></p>
      </div>
    </section>
  </main>
}
