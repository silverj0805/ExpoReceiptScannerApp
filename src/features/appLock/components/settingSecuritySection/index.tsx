import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import { useAppLockStore } from '../../stores/useAppLockStore';
import SecuritySetupSheet from '../securitySetupSheet';

/**
 * 설정 화면의 보안 섹션 — 잠금 상태를 보여주고, "설정하기"/"변경하기"
 * 버튼을 누르면 `SecuritySetupSheet`가 열린다.  
 */
function SettingSecuritySection() {
  const isLockSetUp = useAppLockStore(state => state.isLockSetUp);
  const lockType = useAppLockStore(state => state.lockType);
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
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
                ? lockType === 'pin'
                  ? 'PIN 번호로 잠겨 있어요'
                  : '생체인증으로 잠겨 있어요'
                : 'PIN 또는 생체인증으로 앱을 잠글 수 있어요'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          testID="security-section-open-sheet"
          onPress={() => setSheetVisible(true)}
          className="rounded-full bg-primary px-4 py-2"
        >
          <Text className="text-xs font-bold text-white">
            {isLockSetUp ? '변경하기' : '설정하기'}
          </Text>
        </TouchableOpacity>
      </View>

      <SecuritySetupSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

export default SettingSecuritySection;
