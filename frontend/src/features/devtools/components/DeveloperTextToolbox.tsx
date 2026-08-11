import {
  Binary,
  Braces,
  Clipboard,
  Fingerprint,
  Link2,
  LockKeyhole,
  RotateCcw,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import { Button, Label, Select, Textarea } from '@/shared/components/ui'
import { createScopedClassNames } from '@/shared/lib/classNames'
import { writeClipboard } from '@/shared/native-kit'

import {
  calculateHash,
  decodeBase64,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  jsonToObjectLiteral,
  objectLiteralToJson,
  type HashAlgorithm,
} from '../lib/textTools'

import { styles } from './DeveloperTextToolbox.css'

const cx = createScopedClassNames(styles)

type TextToolId = 'json' | 'base64' | 'url' | 'hash'

interface TextToolState {
  input: string
  output: string
  error: string
}

interface TextToolDefinition {
  id: TextToolId
  label: string
  description: string
  eyebrow: string
  inputPlaceholder: string
  icon: LucideIcon
}

const TEXT_TOOLS: TextToolDefinition[] = [
  {
    id: 'json',
    label: 'JSON 工具',
    description: '对象与 JSON 互转、格式化与压缩',
    eyebrow: 'JSON / 01',
    inputPlaceholder: "{ name: 'Cull Pear', enabled: true }",
    icon: Braces,
  },
  {
    id: 'base64',
    label: 'Base64',
    description: '文本编解码',
    eyebrow: 'BASE64 / 02',
    inputPlaceholder: '输入需要编码或解码的 UTF-8 文本',
    icon: Binary,
  },
  {
    id: 'url',
    label: 'URL 编码',
    description: '组件编码与解码',
    eyebrow: 'URL / 03',
    inputPlaceholder: '输入 URL 参数或已编码的内容',
    icon: Link2,
  },
  {
    id: 'hash',
    label: '哈希计算',
    description: 'MD5 与 SHA',
    eyebrow: 'HASH / 04',
    inputPlaceholder: '输入需要计算摘要的文本',
    icon: Fingerprint,
  },
]

const EMPTY_STATE: Record<TextToolId, TextToolState> = {
  json: { input: '', output: '', error: '' },
  base64: { input: '', output: '', error: '' },
  url: { input: '', output: '', error: '' },
  hash: { input: '', output: '', error: '' },
}

const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

function textSummary(value: string): string {
  const lines = value ? value.split(/\r?\n/).length : 0
  return `${value.length} 字符 · ${lines} 行`
}

export function DeveloperTextToolbox() {
  const [activeTool, setActiveTool] = useState<TextToolId>('json')
  const [toolStates, setToolStates] = useState<Record<TextToolId, TextToolState>>(EMPTY_STATE)
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>('SHA-256')
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState('所有内容仅在当前应用内处理。')

  const definition = TEXT_TOOLS.find((tool) => tool.id === activeTool) ?? TEXT_TOOLS[0]
  const state = toolStates[activeTool]

  function updateState(patch: Partial<TextToolState>) {
    setToolStates((current) => ({
      ...current,
      [activeTool]: { ...current[activeTool], ...patch },
    }))
  }

  function runTransform(label: string, transform: (input: string) => string) {
    try {
      updateState({ output: transform(state.input), error: '' })
      setFeedback(`${label}完成。`)
    } catch (transformError: unknown) {
      updateState({ error: transformError instanceof Error ? transformError.message : `${label}失败。` })
      setFeedback(`${label}失败。`)
    }
  }

  async function runHash() {
    setIsProcessing(true)
    try {
      updateState({ output: await calculateHash(state.input, hashAlgorithm), error: '' })
      setFeedback(`${hashAlgorithm} 计算完成。`)
    } catch (hashError: unknown) {
      updateState({ error: hashError instanceof Error ? hashError.message : '哈希计算失败。' })
      setFeedback('哈希计算失败。')
    } finally {
      setIsProcessing(false)
    }
  }

  async function copyOutput() {
    if (!state.output) return
    try {
      await writeClipboard(state.output)
      setFeedback('结果已复制到剪贴板。')
    } catch (copyError: unknown) {
      updateState({ error: copyError instanceof Error ? copyError.message : '复制结果失败。' })
    }
  }

  function useOutputAsInput() {
    if (!state.output) return
    updateState({ input: state.output, output: '', error: '' })
    setFeedback('已将结果移到输入区。')
  }

  function clearCurrentTool() {
    updateState({ input: '', output: '', error: '' })
    setFeedback('当前工具内容已清空。')
  }

  function renderOperations() {
    switch (activeTool) {
      case 'json':
        return (
          <>
            <Button type='button' onClick={() => runTransform('对象转 JSON', objectLiteralToJson)}>
              对象转 JSON
            </Button>
            <Button type='button' variant='outline' onClick={() => runTransform('JSON 转对象', jsonToObjectLiteral)}>
              JSON 转对象
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => runTransform('JSON 美化', (input) => formatJson(input))}
            >
              美化 JSON
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => runTransform('JSON 压缩', (input) => formatJson(input, true))}
            >
              压缩 JSON
            </Button>
          </>
        )
      case 'base64':
        return (
          <>
            <Button type='button' onClick={() => runTransform('Base64 编码', encodeBase64)}>
              Base64 编码
            </Button>
            <Button type='button' variant='outline' onClick={() => runTransform('Base64 解码', decodeBase64)}>
              Base64 解码
            </Button>
          </>
        )
      case 'url':
        return (
          <>
            <Button type='button' onClick={() => runTransform('URL 编码', encodeUrl)}>
              URL 编码
            </Button>
            <Button type='button' variant='outline' onClick={() => runTransform('URL 解码', decodeUrl)}>
              URL 解码
            </Button>
          </>
        )
      case 'hash':
        return (
          <>
            <Select
              className={cx('text-toolbox-hash-select')}
              aria-label='哈希算法'
              value={hashAlgorithm}
              options={HASH_ALGORITHMS.map((algorithm) => ({ value: algorithm, label: algorithm }))}
              onValueChange={setHashAlgorithm}
            />
            <Button type='button' disabled={isProcessing} onClick={() => void runHash()}>
              {isProcessing ? '正在计算…' : '计算哈希'}
            </Button>
          </>
        )
    }
  }

  return (
    <section className={cx('text-toolbox')}>
      <div className={cx('text-toolbox-toolbar')}>
        <header className={cx('text-toolbox-brand')}>
          <span aria-hidden='true'>
            <SquareTerminal />
          </span>
          <div>
            <small>Developer utilities</small>
            <strong>文本工具箱</strong>
          </div>
        </header>

        <nav className={cx('text-toolbox-menu')} aria-label='文本工具'>
          {TEXT_TOOLS.map((tool, index) => {
            const Icon = tool.icon
            const selected = activeTool === tool.id
            return (
              <Button
                key={tool.id}
                className={cx(selected ? 'is-active' : '')}
                size='md'
                type='button'
                variant='ghost'
                aria-pressed={selected}
                title={tool.description}
                onClick={() => {
                  setActiveTool(tool.id)
                  setFeedback('所有内容仅在当前应用内处理。')
                }}
              >
                <span className={cx('text-toolbox-menu-icon')} aria-hidden='true'>
                  <Icon />
                </span>
                <span className={cx('text-toolbox-menu-copy')}>
                  <strong>{tool.label}</strong>
                </span>
                <span className={cx('text-toolbox-menu-index')}>{String(index + 1).padStart(2, '0')}</span>
              </Button>
            )
          })}
        </nav>

        <div className={cx('text-toolbox-privacy')}>
          <LockKeyhole aria-hidden='true' />
          <span>Local processing</span>
        </div>
      </div>

      <main className={cx('text-toolbox-workspace')}>
        <header className={cx('text-toolbox-heading')}>
          <div>
            <span>{definition.eyebrow}</span>
            <h2>{definition.label}</h2>
            <p>{definition.description}，处理结果不会离开当前应用。</p>
          </div>
          <span className={cx('text-toolbox-feedback')} aria-live='polite'>
            <span aria-hidden='true' />
            {feedback}
          </span>
        </header>

        <div className={cx('text-toolbox-operations')}>
          <div>{renderOperations()}</div>
          {activeTool === 'json' && <small>对象文本支持单引号、无引号属性名、注释和尾随逗号，不会执行代码。</small>}
          {activeTool === 'hash' && <small>MD5 与 SHA-1 仅适合兼容性校验，不应用于密码或安全签名。</small>}
        </div>

        {state.error && (
          <p className={cx('text-toolbox-error')} role='alert'>
            {state.error}
          </p>
        )}

        <div className={cx('text-toolbox-editors')}>
          <section className={cx('text-toolbox-editor')}>
            <header>
              <Label htmlFor={`text-toolbox-${activeTool}-input`}>输入</Label>
              <span>{textSummary(state.input)}</span>
            </header>
            <Textarea
              id={`text-toolbox-${activeTool}-input`}
              value={state.input}
              placeholder={definition.inputPlaceholder}
              spellCheck={false}
              onChange={(event) => updateState({ input: event.target.value, error: '' })}
            />
          </section>

          <section className={cx('text-toolbox-editor')}>
            <header>
              <Label htmlFor={`text-toolbox-${activeTool}-output`}>结果</Label>
              <span>{textSummary(state.output)}</span>
            </header>
            <Textarea
              id={`text-toolbox-${activeTool}-output`}
              value={state.output}
              placeholder='处理结果会显示在这里'
              spellCheck={false}
              readOnly
            />
          </section>
        </div>

        <footer className={cx('text-toolbox-footer')}>
          <Button type='button' variant='outline' disabled={!state.output} onClick={() => void copyOutput()}>
            <Clipboard aria-hidden='true' />
            复制结果
          </Button>
          <Button type='button' variant='outline' disabled={!state.output} onClick={useOutputAsInput}>
            <RotateCcw aria-hidden='true' />
            结果转为输入
          </Button>
          <Button type='button' variant='ghost' disabled={!state.input && !state.output} onClick={clearCurrentTool}>
            清空当前工具
          </Button>
        </footer>
      </main>
    </section>
  )
}
