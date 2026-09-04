import { router } from 'expo-router';
import { Pressable } from 'react-native';

import type { TabBarButtonProps } from './types';

/**
 * "설정" 탭도 Write와 동일한 패턴 — 탭 전환 대신 /settings로 push.
 */
function SettingsTabButton({ ref: _ref, ...props }: TabBarButtonProps) {
  return (
    <Pressable
      {...props}
      onPress={() => {
        router.push('/settings');
      }}
    />
  );
}

export default SettingsTabButton;
