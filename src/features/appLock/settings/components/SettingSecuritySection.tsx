import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';
import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import { clearPin } from '../../pin/utils/pinStorage';
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
  const { isSupported, isEnrolled } = useBiometricAuth();
  const { isSecuritySetUp, refetch } = useSecuritySetupStatus();
  const biometricEnabled = useSecuritySettingsStore(
    state => state.biometricEnabled,
  );
  const setBiometricEnabled = useSecuritySettingsStore(
    state => state.setBiometricEnabled,
  );
  const [securitySheetVisible, setSecuritySheetVisible] = useState(false);

  const canUseBiometric = isSupported && isEnrolled;

  const openSecuritySheet = () => setSecuritySheetVisible(true);
  const closeSecuritySheet = () => setSecuritySheetVisible(false);
  // onClose와 달리 onComplete는 실제로 설정이 바뀐 뒤에 불린다 — refetch()를 같이 안 부르면
  // 이 컴포넌트의 isSecuritySetUp이 stale하게 남아서, "설정하기"로 PIN 등록을 막 끝내도
  // 화면을 벗어났다 재진입해야만 "변경하기"/"인증 초기화" 행으로 바뀐다(실기기 재현 확인).
  const handleSecuritySheetComplete = () => {
    setSecuritySheetVisible(false);
    refetch();
  };

  // PIN/생체인증을 모두 지우기만 한다 — 초기화 직후 설정 Sheet를 자동으로 다시 열지 않는다
  // (사용자가 "설정하기"를 눌러 직접 다시 시작하게 둔다).
  const handleReset = () => {
    Alert.alert(
      '인증을 초기화할까요?',
      'PIN과 생체인증 설정이 모두 삭제돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            setBiometricEnabled(false);
            refetch();
          },
        },
      ],
    );
  };

  return (
    <>
      {isSecuritySetUp ? (
        <>
          <View className={containerClassName}>
            <View>
              <Text className="text-xs text-gray">보안 잠금 방법</Text>
              <Text className="mt-0.5 text-sm font-bold text-black">
                {biometricEnabled ? '생체인식' : 'PIN 번호'}
              </Text>
            </View>
            {canUseBiometric && (
              <Button
                testID="settings-security-change-button"
                onPress={openSecuritySheet}
                text="변경하기"
              />
            )}
          </View>

          <View className="flex-row items-center justify-between bg-[rgba(179,38,30,0.05)] px-5 py-4">
            <Text className="text-sm font-semibold text-black">
              인증 초기화
            </Text>
            <Pressable
              testID="settings-security-reset-button"
              onPress={handleReset}
              className="rounded-xl border-[1.5px] border-[#B3261E] px-3.5 py-1.5"
            >
              <Text className="text-xs font-bold text-[#B3261E]">초기화</Text>
            </Pressable>
          </View>
          <View className="border-b border-[#e8e6e1] bg-[rgba(179,38,30,0.05)] px-5 pt-1 pb-4">
            <Text className="text-[11.5px] leading-relaxed text-gray">
              PIN이나 Face ID를 바꾸고 싶으면, 별도 변경 없이{'\n'}초기화 후
              다시 등록해주세요
            </Text>
          </View>
        </>
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
        onComplete={handleSecuritySheetComplete}
        // "변경하기"는 이미 보안이 설정된 상태에서만 뜨므로 현재 방법을 넘겨서, 이미
        // 선택된 방법을 다시 눌러도 아무 반응 없게 한다(isSecuritySetUp이 false인
        // 최초 설정 경로에선 아직 선택된 방법이 없으므로 null).
        currentMethod={
          isSecuritySetUp ? (biometricEnabled ? 'biometric' : 'pin') : null
        }
      />
    </>
  );
};

export default SettingSecuritySection;
