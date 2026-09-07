import {NativeModules} from 'react-native';

const {MagnesModule} = NativeModules;

export async function getClientMetadataId() {
  console.log('[Magnes JS] MagnesModule:', MagnesModule);

  if (!MagnesModule) {
    console.warn('[Magnes JS] MagnesModule is NOT available');
    return null;
  }

  try {
    const result = await MagnesModule.collectDeviceData();

    console.log('[Magnes JS] collectDeviceData returned:', result);
    console.log('[Magnes JS] type:', typeof result);

    let clientMetadataId = null;

    if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);

        console.log('[Magnes JS] parsed result:', parsed);

        clientMetadataId = parsed?.correlation_id;
      } catch (parseError) {
        console.error(
          '[Magnes JS] Failed to parse device data JSON:',
          parseError,
        );
      }
    } else {
      clientMetadataId = result?.correlation_id;
    }

    console.log('[Magnes JS] clientMetadataId:', clientMetadataId);

    console.log(
      '[Magnes JS] length:',
      clientMetadataId ? clientMetadataId.length : 0,
    );

    return clientMetadataId || null;
  } catch (error) {
    console.error('[Magnes JS] collectDeviceData ERROR:', error);
    throw error;
  }
}
