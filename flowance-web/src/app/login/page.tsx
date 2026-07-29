'use client'

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import {loginCurrentSession} from '@/application/auth'
import {authApi} from '@/infrastructure/api/authApi'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await loginCurrentSession(authApi, {email: email.trim(), password})
      router.replace('/dashboard')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ログインに失敗しました。しばらくしてからお試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className={styles.page}>
    <section className={styles.intro} aria-label="Flowanceの紹介">
      <div className={styles.introInner}>
        <div className={styles.brand}><span className={styles.brandMark}><i/><i/><i/></span>flowance</div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>WORK, IN A BETTER FLOW</p>
          <h1>仕事の流れを、<br/><span>もっと軽やかに。</span></h1>
          <p>案件、予定、稼働まで。フリーランスの毎日を、ひとつの場所で心地よく整えます。</p>
        </div>
        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewHeader}><span>今月の稼働</span><b>順調です</b></div>
          <strong>126.5 <small>/ 182h</small></strong>
          <div className={styles.progress}><i/></div>
          <div className={styles.previewFooter}><span>69%</span><span>残り 55.5時間</span></div>
        </div>
        <p className={styles.copyright}>© 2026 Flowance</p>
      </div>
    </section>
    <section className={styles.formPane}>
      <div className={styles.mobileBrand}><span className={styles.brandMark}><i/><i/><i/></span>flowance</div>
      <div className={styles.formWrap}>
        <div className={styles.heading}>
          <p>WELCOME BACK</p><h2>おかえりなさい</h2>
          <span>アカウントにログインして、今日の仕事を始めましょう。</span>
        </div>
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <label><span>メールアドレス <i className="required-symbol">※</i></span><div className={styles.inputWrap}>
            <Mail size={18}/><input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={submitting}/>
          </div></label>
          <label><span>パスワード <i className="required-symbol">※</i></span><div className={styles.inputWrap}>
            <LockKeyhole size={18}/><input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="パスワードを入力" value={password} onChange={event => setPassword(event.target.value)} required disabled={submitting}/>
            <button type="button" className={styles.visibility} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div></label>
          {error && <div className={styles.error} role="alert" aria-live="polite">{error}</div>}
          <button className={styles.submit} type="submit" disabled={submitting || !email.trim() || !password}>
            {submitting ? <><LoaderCircle className={styles.spinner} size={18}/>ログイン中...</> : 'ログイン'}
          </button>
        </form>
        <p className={styles.support}>はじめてご利用ですか？ <Link href="/register">アカウントを作成</Link></p>
      </div>
    </section>
  </main>
}
