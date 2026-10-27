import { Search } from 'lucide-react'

import { Button, Input, Select } from '@/shared/components/ui'
import { classNames } from '@/shared/lib/classNames'

import { PROFESSION_OPTIONS } from '../model/dnSystem'
import { DnField } from './DnField'

import { styles } from './DnFilterBar.css'

export interface DnFilters {
  roleName: string
  profession: string
}

interface DnFilterBarProps {
  filters: DnFilters
  variant: 'roles' | 'weekly'
  loading: boolean
  onChange: (patch: Partial<DnFilters>) => void
  onSearch: () => void
  onReset: () => void
}

const professionOptions = {
  roles: [
    { value: '', label: '全部' },
    ...PROFESSION_OPTIONS.map((item) => ({ value: item.label, label: `${item.label}（${item.group}）` })),
  ],
  weekly: [
    { value: '', label: '全部' },
    ...PROFESSION_OPTIONS.map((item) => ({ value: item.label, label: item.label })),
  ],
}

export function DnFilterBar({ filters, variant, loading, onChange, onSearch, onReset }: DnFilterBarProps) {
  return (
    <div className={classNames(styles.root, styles.variants[variant])}>
      <DnField label='角色'>
        <Input
          value={filters.roleName}
          placeholder='角色名'
          onChange={(event) => onChange({ roleName: event.target.value })}
        />
      </DnField>
      <DnField label='职业'>
        <Select
          value={filters.profession}
          options={professionOptions[variant]}
          onValueChange={(profession) => onChange({ profession })}
        />
      </DnField>
      <div className={styles.actions}>
        <Button variant='secondary' disabled={loading} onClick={onSearch}>
          <Search aria-hidden='true' />
          搜索
        </Button>
        <Button variant='outline' onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  )
}
