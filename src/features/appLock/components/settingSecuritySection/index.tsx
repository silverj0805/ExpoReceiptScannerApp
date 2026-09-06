import { Switch, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import { useAppLockStore } from '../../stores/useAppLockStore';

/**
 * 설정 화면의 보안 섹션 — 잠금 on/off를 토글 하나로 보여주고 바꾼다.
 */
function SettingSecuritySection() {
  const isLockSetUp = useAppLockStore(state => state.isLockSetUp);
  const setLockSetUp = useAppLockStore(state => state.setLockSetUp);
  const setAuthenticated = useAppLockStore(state => state.setAuthenticated);

  const handleToggle = (enabled: boolean) => {
    setLockSetUp(enabled);
    if (enabled) {
      setAuthenticated(true);
    }
  };

  return (
    <View className="-mx-5 flex-row items-center justify-between border-b border-[#e8e6e1] bg-primary/5 px-5 py-4">
      <View className="flex-row items-center gap-2">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <Icon
            name={isLockSetUp ? 'lock-closed' : 'lock-open'}
            size={18}
            colorClassName="accent-primary"
          />
        </View>
        <View className="gap-0.5">
          <Text className="text-sm font-bold text-black">
            앱 잠금 {isLockSetUp ? 'ON' : 'OFF'}
          </Text>
          <Text className="text-xs text-gray">
            {isLockSetUp
              ? '생체인증으로 잠겨 있어요'
              : '생체인증으로 앱을 잠글 수 있어요'}
          </Text>
        </View>
      </View>
      <Switch
        testID="security-section-toggle"
        value={isLockSetUp}
        onValueChange={handleToggle}
        trackColor={{ true: '#1b5e43', false: '#c7d4cf' }}
      />
    </View>
  );
}

export default SettingSecuritySection;
