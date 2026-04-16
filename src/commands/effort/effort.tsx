import chalk from 'chalk'
import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/select.js'
import { Byline } from '../../components/design-system/Byline.js'
import { KeyboardShortcutHint } from '../../components/design-system/KeyboardShortcutHint.js'
import { Pane } from '../../components/design-system/Pane.js'
import { effortLevelToSymbol } from '../../components/EffortIndicator.js'
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { useExitOnCtrlCDWithKeybindings } from 'src/hooks/useExitOnCtrlCDWithKeybindings.js'
import { Box, Text } from '../../ink.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '../../services/analytics/index.js'
import { useAppState, useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import {
  convertEffortValueToLevel,
  type EffortLevel,
  type EffortValue,
  getDisplayedEffortLevel,
  getEffortEnvOverride,
  getEffortLevelDescription,
  getEffortValueDescription,
  getSupportedEffortLevels,
  isEffortLevel,
  toPersistableEffort,
} from '../../utils/effort.js'
import { modelDisplayString } from '../../utils/model/model.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

type CommandDone = (
  result?: string,
  options?: { display?: CommandResultDisplay },
) => void

const AUTO_EFFORT = 'auto'

type PickerValue = EffortLevel | typeof AUTO_EFFORT

type EffortCommandResult = {
  message: string
  effortUpdate?: {
    value: EffortValue | undefined
  }
}

function setEffortValue(effortValue: EffortValue): EffortCommandResult {
  const persistable = toPersistableEffort(effortValue)
  if (persistable !== undefined) {
    const result = updateSettingsForSource('userSettings', {
      effortLevel: persistable,
    })
    if (result.error) {
      return {
        message: `Failed to set effort level: ${result.error.message}`,
      }
    }
  }

  logEvent('tengu_effort_command', {
    effort:
      effortValue as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  const envOverride = getEffortEnvOverride()
  if (envOverride !== undefined && envOverride !== effortValue) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL
    if (persistable === undefined) {
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValue} is session-only (nothing saved)`,
        effortUpdate: { value: effortValue },
      }
    }
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session — clear it and ${effortValue} takes over`,
      effortUpdate: { value: effortValue },
    }
  }

  const description = getEffortValueDescription(effortValue)
  const suffix = persistable !== undefined ? '' : ' (this session only)'
  return {
    message: `Set effort level to ${effortValue}${suffix}: ${description}`,
    effortUpdate: { value: effortValue },
  }
}

export function showCurrentEffort(
  appStateEffort: EffortValue | undefined,
  model: string,
): EffortCommandResult {
  const envOverride = getEffortEnvOverride()
  const effectiveValue =
    envOverride === null ? undefined : envOverride ?? appStateEffort
  if (effectiveValue === undefined) {
    const level = getDisplayedEffortLevel(model, appStateEffort)
    return {
      message: `Effort level: auto (currently ${level})`,
    }
  }
  const description = getEffortValueDescription(effectiveValue)
  return {
    message: `Current effort level: ${effectiveValue} (${description})`,
  }
}

function unsetEffortLevel(): EffortCommandResult {
  const result = updateSettingsForSource('userSettings', {
    effortLevel: undefined,
  })
  if (result.error) {
    return {
      message: `Failed to set effort level: ${result.error.message}`,
    }
  }

  logEvent('tengu_effort_command', {
    effort: 'auto' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  const envOverride = getEffortEnvOverride()
  if (envOverride !== undefined && envOverride !== null) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL
    return {
      message: `Cleared effort from settings, but CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: { value: undefined },
    }
  }

  return {
    message: 'Effort level set to auto',
    effortUpdate: { value: undefined },
  }
}

export function executeEffort(args: string): EffortCommandResult {
  const normalized = args.toLowerCase()
  if (normalized === 'auto' || normalized === 'unset') {
    return unsetEffortLevel()
  }
  if (!isEffortLevel(normalized)) {
    return {
      message: `Invalid argument: ${args}. Valid options are: low, medium, high, extra-high, max, auto`,
    }
  }
  return setEffortValue(normalized)
}

function applyEffortCommandResult(
  result: EffortCommandResult,
  setAppState: ReturnType<typeof useSetAppState>,
  onDone: CommandDone,
) {
  if (result.effortUpdate) {
    setAppState(prev => ({
      ...prev,
      effortValue: result.effortUpdate?.value,
    }))
  }
  onDone(result.message)
}

function formatEffortTitle(value: PickerValue): string {
  if (value === AUTO_EFFORT) {
    return 'Auto'
  }
  return `${effortLevelToSymbol(value)} ${capitalizeEffort(value)}`
}

function capitalizeEffort(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getPickerValue(
  appStateEffort: EffortValue | undefined,
): PickerValue {
  const envOverride = getEffortEnvOverride()
  const effectiveValue =
    envOverride === null ? undefined : envOverride ?? appStateEffort
  if (effectiveValue === undefined) {
    return AUTO_EFFORT
  }
  return typeof effectiveValue === 'string'
    ? effectiveValue
    : convertEffortValueToLevel(effectiveValue)
}

export function buildEffortPickerOptions(
  model: string,
  appStateEffort: EffortValue | undefined,
): OptionWithDescription<PickerValue>[] {
  const currentValue = getPickerValue(appStateEffort)
  const currentDisplayedLevel = getDisplayedEffortLevel(model, appStateEffort)
  const options = getSupportedEffortLevels(model).map(level => {
    const suffix =
      level === currentValue ? ' · current' : level === currentDisplayedLevel ? ' · active default' : ''
    return {
      label: formatEffortTitle(level),
      value: level,
      description: `${getEffortLevelDescription(level)}${suffix}`,
    } satisfies OptionWithDescription<PickerValue>
  })

  options.push({
    label: 'Auto',
    value: AUTO_EFFORT,
    description: `Use the model default for ${modelDisplayString(model)} (currently ${currentDisplayedLevel})${currentValue === AUTO_EFFORT ? ' · current' : ''}`,
  })

  return options
}

function formatCurrentEffortLabel(
  appStateEffort: EffortValue | undefined,
  model: string,
): string {
  const value = getPickerValue(appStateEffort)
  if (value === AUTO_EFFORT) {
    return `auto (currently ${getDisplayedEffortLevel(model, appStateEffort)})`
  }
  return value
}

function ShowCurrentEffort({ onDone }: { onDone: CommandDone }): React.ReactNode {
  const effortValue = useAppState(s => s.effortValue)
  const model = useMainLoopModel()
  const { message } = showCurrentEffort(effortValue, model)
  onDone(message)
  return null
}

function ApplyEffortAndClose({
  result,
  onDone,
}: {
  result: EffortCommandResult
  onDone: CommandDone
}): React.ReactNode {
  const setAppState = useSetAppState()
  React.useEffect(() => {
    applyEffortCommandResult(result, setAppState, onDone)
  }, [result, setAppState, onDone])
  return null
}

function UnsupportedEffortAndClose({
  model,
  onDone,
}: {
  model: string
  onDone: CommandDone
}): React.ReactNode {
  React.useEffect(() => {
    onDone(`Effort is not supported for ${modelDisplayString(model)}.`, {
      display: 'system',
    })
  }, [model, onDone])
  return null
}

function EffortPickerWrapper({ onDone }: { onDone: CommandDone }): React.ReactNode {
  const model = useMainLoopModel()
  const setAppState = useSetAppState()
  const effortValue = useAppState(s => s.effortValue)
  const exitState = useExitOnCtrlCDWithKeybindings()

  const options = React.useMemo(
    () => buildEffortPickerOptions(model, effortValue),
    [model, effortValue],
  )
  const currentValue = getPickerValue(effortValue)

  const handleCancel = React.useCallback(() => {
    logEvent('tengu_effort_command_menu', {
      action:
        'cancel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    onDone(
      `Kept effort as ${chalk.bold(formatCurrentEffortLabel(effortValue, model))}`,
      { display: 'system' },
    )
  }, [effortValue, model, onDone])

  const handleSelect = React.useCallback(
    (value: PickerValue) => {
      logEvent('tengu_effort_command_menu', {
        action:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      const result = executeEffort(value)
      applyEffortCommandResult(result, setAppState, onDone)
    },
    [onDone, setAppState],
  )

  if (getSupportedEffortLevels(model).length === 0) {
    return <UnsupportedEffortAndClose model={model} onDone={onDone} />
  }

  return (
    <Pane color="permission">
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>
            Select effort
          </Text>
          <Text dimColor>
            Choose the reasoning effort for {modelDisplayString(model)}. This
            applies to this session and future Claude Code sessions.
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Select
            options={options}
            defaultValue={currentValue}
            defaultFocusValue={currentValue}
            onChange={handleSelect}
            onCancel={handleCancel}
            visibleOptionCount={Math.min(5, options.length)}
            layout="compact-vertical"
          />
        </Box>
        <Text dimColor>
          Current: {formatCurrentEffortLabel(effortValue, model)}
        </Text>
        <Text dimColor>
          Model: {modelDisplayString(model)}
        </Text>
        <Text dimColor italic>
          {exitState.pending ? (
            <>Press {exitState.keyName} again to exit</>
          ) : (
            <Byline>
              <KeyboardShortcutHint shortcut="Enter" action="confirm" />
              <ConfigurableShortcutHint
                action="select:cancel"
                context="Select"
                fallback="Esc"
                description="exit"
              />
            </Byline>
          )}
        </Text>
      </Box>
    </Pane>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: unknown,
  args?: string,
): Promise<React.ReactNode> {
  args = args?.trim() || ''

  if (COMMON_INFO_ARGS.includes(args)) {
    return <ShowCurrentEffort onDone={onDone} />
  }

  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(
      'Run /effort to open the effort selection menu, or /effort [low|medium|high|extra-high|max|auto] to set it directly.',
      { display: 'system' },
    )
    return
  }

  if (args) {
    const result = executeEffort(args)
    return <ApplyEffortAndClose result={result} onDone={onDone} />
  }

  return <EffortPickerWrapper onDone={onDone} />
}
