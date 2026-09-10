import { at, isRecord, stringAt } from '$lib/core/util/json';
import { createGlobalSettingsDraft } from '$lib/global-settings/defaults';

import type { GlobalSettingsDraft } from '$lib/global-settings/model';

function getSettingsEntry(input: unknown): unknown {
  const prefixed = at(input, 'netinfra:global-settings');
  if (isRecord(prefixed)) return prefixed;

  const bare = at(input, 'global-settings');
  if (isRecord(bare)) return bare;

  const nested = at(input, 'netinfra:netinfra', 'global-settings');
  if (nested) return nested;

  if (isRecord(input) && 'ibgp-authentication-key' in input) {
    return input;
  }

  return null;
}

export function parseGlobalSettings(input: unknown): GlobalSettingsDraft {
  const defaults = createGlobalSettingsDraft();
  const entry = getSettingsEntry(input);

  if (!entry) {
    return defaults;
  }

  return {
    ibgpAuthenticationKey: stringAt(entry, 'ibgp-authentication-key')
  };
}
