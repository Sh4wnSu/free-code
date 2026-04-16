import { describe, expect, test } from 'bun:test'
import type { SuggestionItem } from '../../components/PromptInput/PromptInputFooterSuggestions.js'
import { applyCommandSuggestion } from './commandSuggestions.js'

describe('applyCommandSuggestion', () => {
  test('applies command argument suggestions without executing on tab', () => {
    const inputs: string[] = []
    const cursorOffsets: number[] = []
    const submits: Array<{ value: string; isSlash: boolean | undefined }> = []

    const suggestion: SuggestionItem = {
      id: 'effort-argument-extra-high',
      displayText: '/effort extra-high',
      metadata: {
        kind: 'command-argument',
        replacementInput: '/effort extra-high ',
        submitInput: '/effort extra-high',
      },
    }

    applyCommandSuggestion(
      suggestion,
      false,
      [],
      value => inputs.push(value),
      offset => cursorOffsets.push(offset),
      (value, isSlash) => submits.push({ value, isSlash }),
    )

    expect(inputs).toEqual(['/effort extra-high '])
    expect(cursorOffsets).toEqual(['/effort extra-high '.length])
    expect(submits).toEqual([])
  })

  test('applies and executes command argument suggestions on enter', () => {
    const submits: Array<{ value: string; isSlash: boolean | undefined }> = []
    const suggestion: SuggestionItem = {
      id: 'effort-argument-extra-high',
      displayText: '/effort extra-high',
      metadata: {
        kind: 'command-argument',
        replacementInput: '/effort extra-high ',
        submitInput: '/effort extra-high',
      },
    }

    applyCommandSuggestion(
      suggestion,
      true,
      [],
      () => {},
      () => {},
      (value, isSlash) => submits.push({ value, isSlash }),
    )

    expect(submits).toEqual([
      { value: '/effort extra-high', isSlash: true },
    ])
  })
})
