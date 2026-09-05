import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';
import useSecuritySetupStatus from '../hooks/useSecuritySetupStatus';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';
import SecuritySetupSheet from './SecuritySetupSheet';

const containerClassName =
  'flex-row items-center justify-between border-b border-[#e8e6e1] bg-primary/5 px-5 py-4';

const Button = ({
  testID,
  text,
  onPress,
}: {
  testID: string;
  text: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      testID={testID}
      className={'rounded-xl border-[1.5px] border-primary px-4 py-1.5'}
      onPress={onPress}
    >
      <Text className="text-xs font-bold text-primary">{text}</Text>
    </Pressable>
  );
};

const SettingSecuritySection = () => {
  const { isSecuritySetUp } = useSecuritySetupStatus();
  const biometricEnabled = useSecuritySettingsStore(
    state => state.biometricEnabled,
  );
  const [securitySheetVisible, setSecuritySheetVisible] = useState(false);

  const openSecuritySheet = () => setSecuritySheetVisible(true);
  const closeSecuritySheet = () => setSecuritySheetVisible(false);

  return (
    <>
      {isSecuritySetUp ? (
        <View className={containerClassName}>
          <View>
            <Text className="text-xs text-gray">보안 잠금 방법</Text>
            <Text className="mt-0.5 text-sm font-bold text-black">
              {biometricEnabled ? '생체인식' : 'PIN 번호'}
            </Text>
          </View>
          <Button
            testID="settings-security-change-button"
            onPress={openSecuritySheet}
            text="변경하기"
          />
        </View>
      ) : (
        <View className={containerClassName}>
          <View className="flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <Icon
                name="lock-closed"
                size={18}
                colorClassName="accent-primary"
              />
            </View>
            <View className="gap-0.5">
              <Text className="text-sm font-bold text-black">
                보안 잠금 설정하기
              </Text>
              <Text className="text-xs text-gray">아직 꺼져 있어요</Text>
              <Text className="text-xs text-gray">
                생체인증이나 PIN으로 지켜보세요
              </Text>
            </View>
          </View>
          <Button
            testID="settings-security-setup-button"
            text="설정하기"
            onPress={openSecuritySheet}
          />
        </View>
      )}

      <SecuritySetupSheet
        visible={securitySheetVisible}
        onClose={closeSecuritySheet}
        onComplete={closeSecuritySheet}
      />
    </>
  );
};

export default SettingSecuritySection;
