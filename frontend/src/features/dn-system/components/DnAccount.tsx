import { Database, KeyRound, LogOut, RefreshCw, Upload } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ListState,
  PageHeader,
  PasswordInput,
  SpinnerIcon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { pickFiles } from '@/shared/native-kit'

import {
  changePassword,
  getErrorMessage,
  getProfile,
  importAvatar,
  updateProfile,
  type Profile,
  type ProfileInput,
} from '../api/dnSystemApi'
import { useDnAuth } from '../context/DnAuthProvider'

import { styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

const emptyProfile: ProfileInput = { name: '', email: '', avatar: '' }

export function DnAccount() {
  const { notify, confirm } = useFeedback()
  const { logout: logoutUser, setUser } = useDnAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileInput>({ ...emptyProfile })
  const [initialForm, setInitialForm] = useState<ProfileInput>({ ...emptyProfile })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const syncForm = useCallback(
    (next: Profile) => {
      const value = { name: next.name, email: next.email, avatar: next.avatar }
      setProfile(next)
      setUser(next)
      setForm(value)
      setInitialForm(value)
    },
    [setUser],
  )

  const load = useCallback(
    async (showNotice = false) => {
      setLoading(true)
      try {
        syncForm(await getProfile())
        if (showNotice) notify({ title: '资料已重新加载', tone: 'success' })
      } catch (error) {
        notify({ title: '资料加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [notify, syncForm],
  )

  useEffect(() => {
    void load()
  }, [load])

  const dirty = form.name !== initialForm.name || form.email !== initialForm.email || form.avatar !== initialForm.avatar
  const initial = useMemo(
    () => (form.name || form.email || 'D').trim().charAt(0).toUpperCase(),
    [form.email, form.name],
  )

  async function chooseAvatar() {
    setImporting(true)
    try {
      const [path] = await pickFiles({
        title: '选择头像',
        multiple: false,
        filters: [{ displayName: '图片', pattern: '*.jpg;*.jpeg;*.png;*.gif;*.webp' }],
      })
      if (!path) {
        notify({ title: '已取消选择头像', tone: 'info' })
        return
      }
      const avatar = await importAvatar(path)
      setForm((current) => ({ ...current, avatar }))
      notify({ title: '头像已导入，保存资料后生效', tone: 'success' })
    } catch (error) {
      notify({ title: '头像导入失败', message: getErrorMessage(error, '请选择 5MB 内的常见图片。'), tone: 'error' })
    } finally {
      setImporting(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      notify({ title: '显示名称和邮箱不能为空', tone: 'warning' })
      return
    }
    setSaving(true)
    try {
      syncForm(await updateProfile(form))
      notify({ title: '个人资料已更新', tone: 'success' })
    } catch (error) {
      notify({ title: '资料保存失败', message: getErrorMessage(error, '请检查输入。'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!passwordForm.currentPassword) {
      notify({ title: '当前密码不能为空', tone: 'warning' })
      return
    }
    if (passwordForm.newPassword.length < 8) {
      notify({ title: '新密码至少 8 位', tone: 'warning' })
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify({ title: '两次输入的新密码不一致', tone: 'warning' })
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      notify({ title: '密码已更新', tone: 'success' })
    } catch (error) {
      notify({ title: '修改密码失败', message: getErrorMessage(error, '请检查当前密码。'), tone: 'error' })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function logout() {
    const confirmed = await confirm({
      title: '退出登录？',
      message: '退出后需要重新输入账号和密码才能进入 DN 系统。',
      confirmLabel: '退出',
    })
    if (!confirmed) return
    try {
      await logoutUser()
      notify({ title: '已退出 DN 账号', tone: 'success' })
    } catch (error) {
      notify({ title: '退出登录失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    }
  }

  return (
    <div className={cx('dn-page dn-account-page')}>
      <PageHeader
        title='个人中心'
        subtitle='管理个人资料、登录密码和本地数据。'
        actions={
          <Button variant='outline' onClick={() => void logout()}>
            <LogOut aria-hidden='true' />
            退出登录
          </Button>
        }
      />
      {loading && !profile ? (
        <ListState loading emptyText='资料加载失败' />
      ) : (
        <Tabs defaultValue='profile'>
          <TabsList>
            <TabsTrigger value='profile'>个人资料</TabsTrigger>
            <TabsTrigger value='security'>密码与安全</TabsTrigger>
            <TabsTrigger value='storage'>本地数据</TabsTrigger>
          </TabsList>
          <TabsContent value='profile'>
            <Card>
              <CardHeader className={cx('dn-card-heading-row')}>
                <div>
                  <CardTitle>个人资料</CardTitle>
                  <p>更新显示名称、邮箱和头像。</p>
                </div>
                <Button variant='outline' disabled={loading} onClick={() => void load(true)}>
                  <SpinnerIcon icon={RefreshCw} spinning={loading} aria-hidden='true' />
                  重新加载
                </Button>
              </CardHeader>
              <form onSubmit={submit}>
                <CardContent className={cx('dn-account-form')}>
                  <div className={cx('dn-avatar-panel')}>
                    <Avatar>
                      <AvatarImage src={form.avatar || undefined} alt={form.name || form.email} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <Button type='button' variant='outline' disabled={importing} onClick={() => void chooseAvatar()}>
                      <Upload aria-hidden='true' />
                      {importing ? '导入中…' : '选择头像'}
                    </Button>
                    {form.avatar && (
                      <Button
                        type='button'
                        variant='ghost'
                        onClick={() => setForm((current) => ({ ...current, avatar: '' }))}
                      >
                        移除头像
                      </Button>
                    )}
                  </div>
                  <div className={cx('dn-form-grid')}>
                    <label className={cx('dn-field')}>
                      <Label>显示名称</Label>
                      <Input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </label>
                    <label className={cx('dn-field')}>
                      <Label>邮箱</Label>
                      <Input
                        type='email'
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>
                    <label className={cx('dn-field')}>
                      <Label>本地账号</Label>
                      <Input value={profile?.account || ''} disabled />
                    </label>
                    <label className={cx('dn-field')}>
                      <Label>权限</Label>
                      <Input value={profile?.role === 1 ? '本地管理员' : '本地用户'} disabled />
                    </label>
                  </div>
                </CardContent>
                <CardFooter className={cx('dn-account-footer')}>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={!dirty || saving}
                    onClick={() => setForm({ ...initialForm })}
                  >
                    重置
                  </Button>
                  <Button type='submit' disabled={saving}>
                    {saving ? '保存中…' : '保存资料'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value='security'>
            <Card>
              <CardHeader>
                <CardTitle>密码与安全</CardTitle>
                <p>更新当前账号的登录密码。</p>
              </CardHeader>
              <form onSubmit={submitPassword}>
                <CardContent className={cx('dn-security-form')}>
                  <KeyRound aria-hidden='true' />
                  <div className={cx('dn-form-grid')}>
                    <label className={cx('dn-field dn-field-full')}>
                      <Label>当前密码</Label>
                      <PasswordInput
                        value={passwordForm.currentPassword}
                        autoComplete='current-password'
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label className={cx('dn-field')}>
                      <Label>新密码</Label>
                      <PasswordInput
                        value={passwordForm.newPassword}
                        autoComplete='new-password'
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label className={cx('dn-field')}>
                      <Label>确认新密码</Label>
                      <PasswordInput
                        value={passwordForm.confirmPassword}
                        autoComplete='new-password'
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </CardContent>
                <CardFooter className={cx('dn-account-footer')}>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={passwordSaving}
                    onClick={() => setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                  >
                    重置
                  </Button>
                  <Button type='submit' disabled={passwordSaving}>
                    {passwordSaving ? '更新中…' : '更新密码'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value='storage'>
            <Card>
              <CardContent className={cx('dn-storage-info')}>
                <Database aria-hidden='true' />
                <div>
                  <h2>Go 本地持久化</h2>
                  <p>
                    DN 模块不再依赖 Next.js、Drizzle、PostgreSQL 会话或 Vercel
                    Blob。账号、会话、角色、周计划、消息回执和资料统一写入当前应用的用户配置目录，并通过 Wails
                    类型化绑定访问。
                  </p>
                  <p>不同账号的数据相互隔离；头像会转换为受限大小的数据 URL，随本地资料一起保存。</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
