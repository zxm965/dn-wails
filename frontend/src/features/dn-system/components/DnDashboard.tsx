import { CalendarCheck, CircleCheckBig, Clock3, RefreshCw, Ticket, UsersRound } from 'lucide-react'
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ListState,
  PageHeader,
  Progress,
  SpinnerIcon,
} from '@/shared/components/ui'
import { useFeedback } from '@/shared/feedback'
import { createScopedClassNames } from '@/shared/lib/classNames'

import { getErrorMessage, listAllWeeklyPlans, type WeeklyPlan } from '../api/dnSystemApi'
import { createDashboardSummary, priorityMeta } from '../model/dnSystem'

import { classes as styles } from './DnSystem.css'

const cx = createScopedClassNames(styles)

export function DnDashboard({ onNavigateWeekly }: { onNavigateWeekly: () => void }) {
  const { notify } = useFeedback()
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      setPlans(await listAllWeeklyPlans())
      setLoadedAt(new Date())
    } catch (error) {
      notify({ title: '仪表盘加载失败', message: getErrorMessage(error, '请稍后重试。'), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const summary = useMemo(() => createDashboardSummary(plans), [plans])
  const primaryPending = summary.pending[0]

  return (
    <div className={cx('dn-page')}>
      <PageHeader
        title='仪表盘'
        subtitle='查看本周进度和需要优先处理的内容。'
        actions={
          <>
            <Button variant='outline' disabled={loading} onClick={() => void loadDashboard()}>
              <SpinnerIcon icon={RefreshCw} spinning={loading} aria-hidden='true' />
              刷新
            </Button>
            <Button onClick={onNavigateWeekly}>
              <CalendarCheck aria-hidden='true' />
              周计划
            </Button>
          </>
        }
      />

      <section className={cx('dn-dashboard-overview')}>
        <Card className={cx('dn-progress-card')}>
          <CardContent>
            <div className={cx('dn-progress-summary')}>
              <div>
                <span className={cx('dn-kicker')}>
                  <Clock3 aria-hidden='true' /> 本周完成度
                </span>
                <div className={cx('dn-progress-value')}>
                  {summary.weeklyProgress.percent}
                  <small>%</small>
                </div>
                <p>
                  {loadedAt ? `${loadedAt.toLocaleTimeString('zh-CN', { hour12: false })} 更新` : '正在加载最新进度'}
                </p>
                <Progress value={summary.weeklyProgress.percent} />
              </div>
              <div
                className={cx('dn-progress-ring')}
                style={{ '--dn-progress': `${summary.weeklyProgress.percent * 3.6}deg` } as CSSProperties}
              >
                <span>
                  <strong>
                    {summary.weeklyProgress.completed}/{summary.weeklyProgress.total}
                  </strong>
                  <small>已完成任务</small>
                </span>
              </div>
            </div>
            <div className={cx('dn-overview-metrics')}>
              <OverviewMetric
                label='任务完成'
                value={`${summary.weeklyProgress.completed}/${summary.weeklyProgress.total}`}
              />
              <OverviewMetric label='角色完成' value={`${summary.completedPlanCount}/${summary.planCount}`} />
              <OverviewMetric label='临期票券' value={String(summary.tickets.length)} />
            </div>
          </CardContent>
        </Card>

        <Card className={cx('dn-priority-card')}>
          <CardContent>
            {primaryPending ? (
              <>
                <div className={cx('dn-card-heading-row')}>
                  <span>优先处理</span>
                  <Badge tone={priorityMeta(primaryPending.plan.priority).tone}>
                    {priorityMeta(primaryPending.plan.priority).label}
                  </Badge>
                </div>
                <h2>{primaryPending.plan.roleName}</h2>
                <p>{primaryPending.plan.profession || '未设置职业'}</p>
                <div className={cx('dn-inline-progress')}>
                  <span>当前进度</span>
                  <strong>{primaryPending.percent}%</strong>
                </div>
                <Progress value={primaryPending.percent} />
                <p className={cx('dn-pending-copy')}>待处理：{primaryPending.missing.join('、') || '无'}</p>
                <Button variant='outline' onClick={onNavigateWeekly}>
                  前往处理
                </Button>
              </>
            ) : (
              <div className={cx('dn-complete-state')}>
                <CircleCheckBig aria-hidden='true' />
                <strong>{loading ? '正在统计' : '本周任务已完成'}</strong>
                <span>{loading ? '请稍候…' : '所有角色都已处理完毕。'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className={cx('dn-dashboard-grid')}>
        <Card>
          <CardHeader className={cx('dn-card-heading-row')}>
            <div>
              <CardTitle>待办角色</CardTitle>
              <p>按优先级和完成度排列</p>
            </div>
            <Badge>{summary.pending.length} 个</Badge>
          </CardHeader>
          <CardContent>
            {summary.pending.length ? (
              <div className={cx('dn-pending-grid')}>
                {summary.pending.slice(0, 8).map((item) => (
                  <article key={item.plan.id} className={cx('dn-pending-item')}>
                    <div className={cx('dn-card-heading-row')}>
                      <div>
                        <strong>{item.plan.roleName}</strong>
                        <span>{item.plan.profession || '未设置职业'}</span>
                      </div>
                      <Badge tone={priorityMeta(item.plan.priority).tone}>
                        {priorityMeta(item.plan.priority).label}
                      </Badge>
                    </div>
                    <div className={cx('dn-inline-progress')}>
                      <span>{item.missing.join('、') || '暂无待办'}</span>
                      <strong>{item.percent}%</strong>
                    </div>
                    <Progress value={item.percent} />
                  </article>
                ))}
              </div>
            ) : (
              <ListState loading={loading} emptyText='当前没有待办角色' icon={<UsersRound aria-hidden='true' />} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className={cx('dn-card-heading-row')}>
            <div>
              <CardTitle>巢穴票提醒</CardTitle>
              <p>关注三天内到期的票券</p>
            </div>
            {summary.tickets.length > 0 && <Badge tone='danger'>{summary.tickets.length}</Badge>}
          </CardHeader>
          <CardContent>
            {summary.tickets.length ? (
              <div className={cx('dn-ticket-list')}>
                {summary.tickets.slice(0, 8).map((item) => (
                  <article key={item.key}>
                    <div>
                      <strong>{item.roleName}</strong>
                      <span>
                        {item.nestLabel} · {item.expiresAt}
                      </span>
                    </div>
                    <Badge tone={item.daysLeft === null || item.daysLeft < 0 ? 'danger' : 'warning'}>
                      {item.daysLeft === null
                        ? '日期异常'
                        : item.daysLeft < 0
                          ? `过期 ${Math.abs(item.daysLeft)} 天`
                          : item.daysLeft === 0
                            ? '今天到期'
                            : `${item.daysLeft} 天后`}
                    </Badge>
                  </article>
                ))}
              </div>
            ) : (
              <ListState loading={loading} emptyText='暂无临期巢穴票' icon={<Ticket aria-hidden='true' />} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
