import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PasswordInput,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { getErrorMessage } from '../api/dnSystemApi'
import { useDnAuth } from '../context/DnAuthProvider'

import { styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

const authTabStorageKey = 'dn-wails:dn-auth-tab'

function initialTab(): 'login' | 'register' {
  const value = window.localStorage.getItem(authTabStorageKey)
  return value === 'register' ? 'register' : 'login'
}

export function DnLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { notify } = useFeedback()
  const auth = useDnAuth()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab)
  const [busy, setBusy] = useState<'login' | 'register' | null>(null)
  const [loginForm, setLoginForm] = useState({ login: '', password: '' })
  const [registrationForm, setRegistrationForm] = useState({ account: '', email: '', password: '', confirm: '' })

  useEffect(() => {
    window.localStorage.setItem(authTabStorageKey, activeTab)
  }, [activeTab])

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!loginForm.login.trim()) {
      notify({ title: '请输入用户名或邮箱', tone: 'warning' })
      return
    }
    if (loginForm.password.length < 8) {
      notify({ title: '密码至少 8 位', tone: 'warning' })
      return
    }
    setBusy('login')
    try {
      await auth.login({ login: loginForm.login.trim(), password: loginForm.password })
      setLoginForm((current) => ({ ...current, password: '' }))
      notify({ title: '登录成功', tone: 'success' })
      onAuthenticated()
    } catch (error) {
      notify({ title: '登录失败', message: getErrorMessage(error, '请检查账号和密码。'), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const account = registrationForm.account.trim()
    const email = registrationForm.email.trim().toLowerCase()
    if (!account || !email) {
      notify({ title: '用户名和邮箱不能为空', tone: 'warning' })
      return
    }
    if (registrationForm.password.length < 8) {
      notify({ title: '密码至少 8 位', tone: 'warning' })
      return
    }
    if (registrationForm.password !== registrationForm.confirm) {
      notify({ title: '两次输入的密码不一致', tone: 'warning' })
      return
    }
    setBusy('register')
    try {
      await auth.register({ account, email, password: registrationForm.password })
      setRegistrationForm((current) => ({ ...current, password: '', confirm: '' }))
      notify({ title: '注册成功，已自动登录', tone: 'success' })
      onAuthenticated()
    } catch (error) {
      notify({ title: '注册失败', message: getErrorMessage(error, '请检查注册信息。'), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cx('dn-auth-page')}>
      <Card className={cx('dn-auth-card')}>
        <CardHeader>
          <span className={cx('dn-auth-mark')} aria-hidden='true'>
            <ShieldCheck />
          </span>
          <CardTitle>DN 周常管理</CardTitle>
          <CardDescription>登录后管理你的角色、周计划和站内消息。</CardDescription>
          {activeTab === 'register' ? (
            <p className={cx('dn-auth-register-note')}>请勿使用真实游戏账号或游戏密码，建议单独设置密码。</p>
          ) : null}
        </CardHeader>
        <CardContent>
          {auth.errorMessage ? (
            <div className={cx('dn-alert dn-alert-warning')} role='alert'>
              <strong>DN 服务不可用</strong>
              <span>{auth.errorMessage}</span>
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
            <TabsList className={cx('dn-auth-tabs')}>
              <TabsTrigger value='login'>登录</TabsTrigger>
              <TabsTrigger value='register'>注册</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'login' ? (
            <form className={cx('dn-auth-form')} onSubmit={submitLogin}>
              <label className={cx('dn-field')}>
                <Label>用户名或邮箱</Label>
                <Input
                  value={loginForm.login}
                  autoComplete='username'
                  placeholder='请输入用户名或邮箱'
                  onChange={(event) => setLoginForm((current) => ({ ...current, login: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>密码</Label>
                <PasswordInput
                  value={loginForm.password}
                  autoComplete='current-password'
                  placeholder='至少 8 个字符'
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <Button type='submit' disabled={busy !== null}>
                {busy === 'login' ? '登录中…' : '登录'}
              </Button>
            </form>
          ) : (
            <form className={cx('dn-auth-form')} onSubmit={submitRegistration}>
              <label className={cx('dn-field')}>
                <Label>用户名</Label>
                <Input
                  value={registrationForm.account}
                  autoComplete='username'
                  placeholder='请输入用户名'
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, account: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>邮箱</Label>
                <Input
                  type='email'
                  value={registrationForm.email}
                  autoComplete='email'
                  placeholder='you@example.com'
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>密码</Label>
                <PasswordInput
                  value={registrationForm.password}
                  autoComplete='new-password'
                  placeholder='至少 8 个字符'
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className={cx('dn-field')}>
                <Label>确认密码</Label>
                <PasswordInput
                  value={registrationForm.confirm}
                  autoComplete='new-password'
                  placeholder='请再次输入密码'
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, confirm: event.target.value }))}
                />
              </label>
              <Button type='submit' disabled={busy !== null}>
                {busy === 'register' ? '注册中…' : '注册并登录'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
