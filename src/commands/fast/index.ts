import type { Command } from '../../commands.js'
import {
  getFastModeModelDisplay,
  isFastModeCommandAvailable,
  isFastModeEnabled,
} from '../../utils/fastMode.js'
import { shouldInferenceConfigCommandBeImmediate } from '../../utils/immediateCommand.js'

const fast = {
  type: 'local-jsx',
  name: 'fast',
  get description() {
    return `Toggle fast mode (${getFastModeModelDisplay()} only)`
  },
  isEnabled: () => isFastModeEnabled() && isFastModeCommandAvailable(),
  get isHidden() {
    return !isFastModeEnabled() || !isFastModeCommandAvailable()
  },
  argumentHint: '[on|off]',
  get immediate() {
    return shouldInferenceConfigCommandBeImmediate()
  },
  load: () => import('./fast.js'),
} satisfies Command

export default fast
