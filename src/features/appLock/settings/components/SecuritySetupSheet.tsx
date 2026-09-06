import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import useBiometricAuth from '../../biometric/hooks/useBiometricAuth';
import PinRegisterForm from '../../pin/components/PinRegisterForm';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

interface SecuritySetupSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  /**
   * 지금 선택돼 있는 인증 방법. "변경하기"(이미 보안 설정이 있는 상태)로 열렸을 때만
   * 넘겨준다 — 최초 설정(아직 아무 방법도 없음) 땐 null/undefined로 둔다.
   * 이미 선택된 방법을 다시 눌러도 아무 반응 없게(재등록 강요 안 함) 만드는 데 쓴다.
   */
  currentMethod?: 'biometric' | 'pin' | null;
}

/**
 * 인증 설정 공통 Bottom Sheet — "어떤 방법으로 잠글까요?"
 * 홈 화면 최초 랜딩 온보딩과 설정 화면의 "변경하기" 양쪽에서 재사용한다.
 * 생체인증을 선택해도 PIN 등록은 항상 강제한다(대체 수단 공백 방지).
 *
 * 일반 BottomSheet가 아니라 BottomSheetModal을 쓴다 — 일반 BottomSheet는
 * 렌더링된 위치(예: 홈 화면의 탭 콘텐츠 영역)를 기준으로만 꽉 차서, 하단 탭 바처럼
 * 그 바깥에 있는 요소는 못 덮고 터치도 못 막는다(실측으로 확인함). BottomSheetModal은
 * 루트의 BottomSheetModalProvider로 포털되어 진짜 화면 최상단에 렌더링된다.
 */
function SecuritySetupSheet({
  visible,
  onClose,
  onComplete,
  currentMethod = null,
}: SecuritySetupSheetProps) {
  const { isSupported, isEnrolled } = useBiometricAuth();
  const setBiometricEnabled = useSecuritySettingsStore(
    state => state.setBiometricEnabled,
  );
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  // 한 번도 present()한 적 없는 시트에 dismiss()를 부르지 않기 위한 플래그.
  const hasPresentedRef = useRef(false);
  const [pinRegisterVisible, setPinRegisterVisible] = useState(false);
  const [biometricChosen, setBiometricChosen] = useState(false);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      hasPresentedRef.current = true;
    } else if (hasPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const canUseBiometric = isSupported && isEnrolled;
  // 생체인증을 아예 못 쓰는 기기면 선택지를 보여줄 이유가 없으니 바로 PIN 등록으로.
  const showRegister = pinRegisterVisible || !canUseBiometric;

  const handleChooseBiometric = () => {
    if (currentMethod === 'biometric') return; // 이미 선택된 방법 — 아무 반응 없음
    setBiometricEnabled(true);
    setBiometricChosen(true);
    setPinRegisterVisible(true);
  };

  const handleChoosePin = () => {
    if (currentMethod === 'pin') return; // 이미 선택된 방법 — 아무 반응 없음
    setPinRegisterVisible(true);
  };

  // 컴포넌트 자신(SecuritySetupSheet)은 present/dismiss를 오가도 계속 마운트돼 있어서
  // (내부 콘텐츠만 present/dismiss 때 마운트·언마운트됨), 다음에 다시 열었을 때
  // 이전 선택 화면 상태가 남지 않도록 닫힐 때 직접 초기화해준다.
  const handleDismiss = () => {
    setPinRegisterVisible(false);
    setBiometricChosen(false);
    onClose();
  };

  // 닫기 버튼: handleDismiss()로 상태 초기화 + onClose()를 바로 부르고, 실제 시트도
  // dismiss()로 닫는다. present/dismiss 흐름을 안 타는 mock 환경에서도 onClose는 즉시
  // 확인 가능하게 하기 위함(SecuritySetupSheet.test.tsx의 mock 한계 주석 참고).
  const handleClosePress = () => {
    handleDismiss();
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['100%']}
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
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
        <View className="w-full flex-row justify-end">
          <Pressable
            testID="security-sheet-close-button"
            onPress={handleClosePress}
            hitSlop={8}
          >
            <Icon name="close" size={24} colorClassName="accent-black" />
          </Pressable>
        </View>

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
              disabled={currentMethod === 'biometric'}
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
                  {currentMethod === 'biometric'
                    ? '현재 사용 중인 방법이에요'
                    : '추천 · 가장 빠르게 잠금을 해제해요'}
                </Text>
              </View>
              {currentMethod === 'biometric' ? (
                <Icon
                  name="checkmark-circle"
                  size={18}
                  colorClassName="accent-primary"
                />
              ) : (
                <Icon
                  name="chevron-forward"
                  size={18}
                  colorClassName="accent-gray"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="choose-pin"
              onPress={handleChoosePin}
              disabled={currentMethod === 'pin'}
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
                {currentMethod === 'pin' && (
                  <Text className="mt-0.5 text-xs text-gray">
                    현재 사용 중인 방법이에요
                  </Text>
                )}
              </View>
              {currentMethod === 'pin' ? (
                <Icon
                  name="checkmark-circle"
                  size={18}
                  colorClassName="accent-primary"
                />
              ) : (
                <Icon
                  name="chevron-forward"
                  size={18}
                  colorClassName="accent-gray"
                />
              )}
            </TouchableOpacity>

            <Text className="px-2 text-center text-xs leading-relaxed text-gray">
              Face ID를 선택해도 PIN은 대체 수단으로 함께 등록돼요
            </Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

export default SecuritySetupSheet;
