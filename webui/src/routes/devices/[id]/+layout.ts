import { error } from '@sveltejs/kit';

import { fetchDevice } from '$lib/core/orchestron/client';

import type { DeviceInfo } from '$lib/core/orchestron/client';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params, fetch, depends }) => {
  const deviceId = params.id;
  depends(`data:device:${deviceId}`);

  try {
    return {
      deviceId,
      device: await fetchDevice(deviceId, fetch),
      loadError: ''
    };
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : 'Failed to load device.';
    if (message.startsWith('HTTP 404')) {
      error(404, `Unknown device: ${deviceId}`);
    }
    return {
      deviceId,
      device: null as DeviceInfo | null,
      loadError: message
    };
  }
};
