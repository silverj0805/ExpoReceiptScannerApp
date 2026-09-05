import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import PinRegisterForm from '../../pin/components/PinRegisterForm';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

interface SecuritySetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * 인증 설정 공통 Bottom Sheet — "어떤 방법으로 잠글까요?"
 * 홈 화면 최초 랜딩 온보딩과 설정 화면의 "변경하기" 양쪽에서 재사용한다.
 * 생체인증을 선택해도 PIN 등록은 항상 강제한다(대체 수단 공백 방지).
 */
function SecuritySetupSheet({
  visible,
  onClose,
  onComplete,
}: SecuritySetupSheetProps) {
  const { isSupported, isEnrolled } = useBiometricAuth();
  const setBiometricEnabled = useSecuritySettingsStore(
    state => state.setBiometricEnabled,
  );
  const insets = useSafeAreaInsets();
  const [pinRegisterVisible, setPinRegisterVisible] = useState(false);
  const [biometricChosen, setBiometricChosen] = useState(false);

  if (!visible) return null;

  const canUseBiometric = isSupported && isEnrolled;
  // 생체인증을 아예 못 쓰는 기기면 선택지를 보여줄 이유가 없으니 바로 PIN 등록으로.
  const showRegister = pinRegisterVisible || !canUseBiometric;

  const handleChooseBiometric = () => {
    setBiometricEnabled(true);
    setBiometricChosen(true);
    setPinRegisterVisible(true);
  };

  const handleChoosePin = () => {
    setPinRegisterVisible(true);
  };

  return (
    <BottomSheet
      index={0}
      snapPoints={['100%']}
      enableDynamicSizing={false}
      onClose={onClose}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ opacity: 0 }}
      backgroundStyle={{
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      <BottomSheetView
        className="gap-5 px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      >
        {showRegister ? (
          <PinRegisterForm
            biometricAlreadyEnabled={biometricChosen}
            onComplete={onComplete}
          />
        ) : (
          <View className="items-center gap-3.5">
            <Text className="self-start text-lg font-bold text-black">
              어떤 방법으로 잠글까요?
            </Text>

            <TouchableOpacity
              testID="choose-biometric"
              onPress={handleChooseBiometric}
              className="w-full flex-row items-center gap-3.5 rounded-2xl border-[1.5px] border-primary/25 bg-primary/10 p-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                <Icon
                  name="finger-print"
                  size={22}
                  colorClassName="accent-primary"
                />
              </View>
              <View className="grow">
                <Text className="text-[15px] font-bold text-black">
                  생체인증으로 설정
                </Text>
                <Text className="mt-0.5 text-xs text-gray">
                  추천 · 가장 빠르게 잠금을 해제해요
                </Text>
              </View>
              <Icon
                name="chevron-forward"
                size={18}
                colorClassName="accent-gray"
              />
            </TouchableOpacity>

            <TouchableOpacity
              testID="choose-pin"
              onPress={handleChoosePin}
              className="w-full flex-row items-center gap-3.5 rounded-2xl border-[1.5px] border-[#e8e6e1] bg-white p-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-background">
                <Icon
                  name="keypad-outline"
                  size={20}
                  colorClassName="accent-black"
                />
              </View>
              <View className="grow">
                <Text className="text-[15px] font-bold text-black">
                  PIN 번호로 할래요
                </Text>
              </View>
              <Icon
                name="chevron-forward"
                size={18}
                colorClassName="accent-gray"
              />
            </TouchableOpacity>

            <Text className="px-2 text-center text-xs leading-relaxed text-gray">
              Face ID를 선택해도 PIN은 대체 수단으로 함께 등록돼요
            </Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

export default SecuritySetupSheet;
