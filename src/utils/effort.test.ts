import { describe, expect, test } from 'bun:test'
import { buildEffortPickerOptions } from '../commands/effort/effort.js'
import {
  getSupportedEffortLevels,
  resolveAppliedEffort,
  toPersistableEffort,
} from './effort.js'

describe('effort helpers', () => {
  test('exposes extra-high for GPT-5.4 models', () => {
    expect(getSupportedEffortLevels('gpt-5.4')).toEqual([
      'low',
      'medium',
      'high',
      'extra-high',
    ])
    expect(getSupportedEffortLevels('gpt-5.4-1m')).toEqual([
      'low',
      'medium',
      'high',
      'extra-high',
    ])
  })

  test('downgrades unsupported extra-high effort to high', () => {
    expect(resolveAppliedEffort('claude-sonnet-4-6', 'extra-high')).toBe('high')
  })

  test('persists extra-high like other named GPT effort levels', () => {
    expect(toPersistableEffort('extra-high')).toBe('extra-high')
  })

  test('builds picker options including extra-high and auto', () => {
    const options = buildEffortPickerOptions('gpt-5.4', undefined)
    expect(options.map(option => option.value)).toEqual([
      'low',
      'medium',
      'high',
      'extra-high',
      'auto',
    ])
  })
})
