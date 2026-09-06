import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  Alert,
  Pressable,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/shared/components/Icon';

import useBioAuth from '../../bio/hooks/useBioAuth';
import PinRegisterModal from '../../pin/components/pinRegisterModal';
import { clearPin, hasPinSet } from '../../pin/utils';
import { useAppLockStore } from '../../stores/useAppLockStore';

interface SecuritySetupSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 보안 설정 Bottom Sheet
 */
function SecuritySetupSheet({ visible, onClose }: SecuritySetupSheetProps) {
  const isLockSetUp = useAppLockStore(state => state.isLockSetUp);
  const setLockSetUp = useAppLockStore(state => state.setLockSetUp);
  const setAuthenticated = useAppLockStore(state => state.setAuthenticated);
  const lockType = useAppLockStore(state => state.lockType);
  const setLockType = useAppLockStore(state => state.setLockType);

  const { isSupported, isEnrolled } = useBioAuth();
  const canUseBiometric = isSupported && isEnrolled;

  const insets = useSafeAreaInsets();
  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  // 한 번도 present()한 적 없는 시트에 dismiss()를 부르지 않기 위한 플래그.
  const hasPresentedRef = useRef(false);
  // 스와이프로 내리거나 배경을 탭해서 시트가 "스스로" 닫힌 뒤에도(onDismiss만
  // 호출됨) visible prop이 뒤늦게 false로 동기화되면서 아래 useEffect가 또
  // dismiss()를 부르던 버그가 있었다 — 이미 다 닫힌(BottomSheetModal 내부
  // 상태머신이 DISMISSED인) 시트에 dismiss()를 한 번 더 부르면 그 내부 상태가
  // DISMISSING에 갇혀버려서, 그다음 present()를 불러도 다시 안 열리고 화면을
  // 벗어났다가 돌아와 컴포넌트가 통째로 리마운트돼야만 풀렸다(실측 재현·
  // node_modules 소스로 원인 확인). 이 ref로 "이미 우리가(또는 시트 스스로가)
  // 닫는 걸 처리했다"를 표시해서, 뒤늦게 따라오는 visible=false에 반응해
  // dismiss()를 또 부르지 않게 막는다.
  const dismissHandledRef = useRef(false);
  const [pinRegisterVisible, setPinRegisterVisible] = useState(false);
  // handleToggle이 PIN 미등록으로 PinRegisterModal을 띄운 경우에만 true —
  // handlePinRegisterComplete가 이걸 보고 "지금 완료된 등록이 막 잠금을 켜기
  // 위한 것이었는지"를 구분한다(생체/PIN 방식 전환 중에 뜬 등록과 구분해야
  // 아래에서 불필요하게 isLockSetUp을 다시 켜지 않음 — 다만 이미 true인 값을
  // 다시 true로 set해도 해는 없어서 엄밀히는 방어적 구분에 가깝다).
  const pendingEnableRef = useRef(false);

  useEffect(() => {
    if (visible) {
      dismissHandledRef.current = false;
      sheetRef.current?.present();
      hasPresentedRef.current = true;
    } else if (hasPresentedRef.current && !dismissHandledRef.current) {
      dismissHandledRef.current = true;
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  // 스와이프/배경 탭 등 시트가 스스로 닫혔을 때 라이브러리가 불러주는 콜백 —
  // 여기서 onClose를 부르기 전에 위 ref부터 표시해서, onClose가 만든 visible
  // prop 변화가 위 useEffect에서 dismiss()를 또 부르지 않게 한다.
  const handleSheetDismiss = () => {
    dismissHandledRef.current = true;
    onClose();
  };

  // 스냅 포인트가 하나(index 0)뿐이라, 그 지점에서 바로 나타나고(appearsOnIndex)
  // 완전히 닫힐 때(index -1)만 사라지게 한다. 배경을 탭해도 닫히는 게 실제
  // 바텀 시트의 기본 동작이라 pressBehavior는 기본값("close")을 그대로 쓴다.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  /** lockType이 아직 없을 때(최초 설정) 기기 상태에 맞는 기본값을 고른다. */
  const pickDefaultLockType = () => (canUseBiometric ? 'bio' : 'pin');

  /**
   * 생체인증을 골랐어도 PIN은 대체제로 무조건 등록돼 있어야 한다(사용자 확인) —
   * 등록이 안 돼 있으면 등록 화면을 강제로 띄운다.
   */
  const ensurePinRegistered = async () => {
    const pinAlreadySet = await hasPinSet();
    if (!pinAlreadySet) {
      setPinRegisterVisible(true);
    }
  };

  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      setLockSetUp(false);
      return;
    }

    if (lockType == null) {
      setLockType(pickDefaultLockType());
    }
    void enableLockOncePinReady();
  };

  /**
   * 잠금을 "진짜로" 켠다 — PIN이 실제로 SecureStore에 저장돼 있을 때만
   * isLockSetUp을 true로 persist한다.
   *
   * 이전엔 토글을 누르는 즉시 isLockSetUp을 켰는데, PIN 등록(비동기, 별도
   * 화면에서 두 번 입력해야 함)이 끝나기 전에 앱이 강제 종료되면 재실행 시
   * AppLockGate는 persist된 isLockSetUp/lockType만 보고 PinVerify를 그리는데
   * SecureStore엔 PIN이 전혀 없어 어떤 값을 입력해도 통과할 수 없다 — 취소
   * 동선도 없어(PinRegisterModal 주석 참고) 사용자가 자기 앱에 영영 못
   * 들어가는 상태가 될 수 있었다(코드 추적으로 확인, 실기기 재현은 아님).
   *
   * PIN이 저장된 시점까지 isLockSetUp을 미루면, 등록 도중 앱이 죽어도
   * "잠금이 그냥 안 걸린 채로 남는" 안전한 쪽으로 실패한다 — 최악의 경우도
   * 사용자가 설정에서 토글을 다시 켜면 그만이다.
   */
  const enableLockOncePinReady = async () => {
    const pinAlreadySet = await hasPinSet();
    if (pinAlreadySet) {
      setLockSetUp(true);
      // 방금 토글을 켠 사람은 이미 이 세션에서 앱을 쓰고 있던 사람이다 — 켜자마자
      // AppLockGate(앱 루트에 항상 마운트돼 있음)에 다시 걸려 지금 보던 설정
      // 화면이 잠금 화면으로 바뀌는 걸 막기 위해, 켜는 순간 이번 세션을 인증된
      // 것으로 표시한다.
      setAuthenticated(true);
      return;
    }

    pendingEnableRef.current = true;
    setPinRegisterVisible(true);
  };

  const handleChooseBiometric = () => {
    setLockType('bio');
    ensurePinRegistered();
  };

  const handleChoosePin = () => {
    setLockType('pin');
    ensurePinRegistered();
  };

  const handleReset = () => {
    Alert.alert(
      '인증을 초기화할까요?',
      '등록된 PIN과 잠금 방법이 모두 지워져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await clearPin();
            setLockType(null);
            setLockSetUp(false);
          },
        },
      ],
    );
  };

  const handlePinRegisterComplete = () => {
    setPinRegisterVisible(false);

    if (pendingEnableRef.current) {
      pendingEnableRef.current = false;
      setLockSetUp(true);
      setAuthenticated(true);
    }
  };

  const handleClosePress = () => {
    // dismiss()가 실제로는 비동기(애니메이션 이후)라, mock 없는 실기기에서도
    // onClose는 여기서 바로 불러서 상위 상태(sheetVisible)를 즉시 반영한다 —
    // 나중에 dismiss() 애니메이션이 끝나며 onDismiss(handleSheetDismiss)가 또
    // 불려도 dismissHandledRef 덕분에 위 useEffect가 dismiss()를 중복 호출하지
    // 않는다.
    dismissHandledRef.current = true;
    sheetRef.current?.dismiss();
    onClose();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      enableDynamicSizing
      onDismiss={handleSheetDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
    >
      <BottomSheetView
        className="gap-5 px-6 pt-2"
        style={{ paddingBottom: insets.bottom + 30 }}
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

        <View className="flex-row items-center justify-between border-b border-[#e8e6e1] pb-4">
          <View className="flex-row items-center gap-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
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
          <Switch
            testID="security-sheet-toggle"
            value={isLockSetUp}
            onValueChange={handleToggle}
            trackColor={{ true: '#1b5e43', false: '#c7d4cf' }}
          />
        </View>

        <View
          className={`gap-3.5 ${isLockSetUp ? '' : 'opacity-40'}`}
          pointerEvents={isLockSetUp ? 'auto' : 'none'}
        >
          <Text className="text-lg font-bold text-black">
            어떤 방법으로 잠글까요?
          </Text>

          {canUseBiometric && (
            <TouchableOpacity
              testID="choose-biometric"
              onPress={handleChooseBiometric}
              disabled={!isLockSetUp}
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
                  {lockType === 'bio'
                    ? '현재 사용 중인 방법이에요'
                    : '추천 · 가장 빠르게 잠금을 해제해요'}
                </Text>
              </View>
              {lockType === 'bio' && (
                <Icon
                  name="checkmark-circle"
                  size={18}
                  colorClassName="accent-primary"
                />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="choose-pin"
            onPress={handleChoosePin}
            disabled={!isLockSetUp}
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
              {lockType === 'pin' && (
                <Text className="mt-0.5 text-xs text-gray">
                  현재 사용 중인 방법이에요
                </Text>
              )}
            </View>
            {lockType === 'pin' && (
              <Icon
                name="checkmark-circle"
                size={18}
                colorClassName="accent-primary"
              />
            )}
          </TouchableOpacity>

          <Text className="px-2 text-center text-xs leading-relaxed text-gray">
            생체인증을 선택해도 PIN은 대체 수단으로 함께 등록돼요
          </Text>
        </View>

        <TouchableOpacity
          testID="security-reset"
          onPress={handleReset}
          disabled={!isLockSetUp}
          className={`items-center rounded-2xl border-[1.5px] border-[#B3261E]/25 py-3.5 ${
            isLockSetUp ? '' : 'opacity-40'
          }`}
        >
          <Text className="text-sm font-bold text-[#B3261E]">인증 초기화</Text>
        </TouchableOpacity>
      </BottomSheetView>

      <PinRegisterModal
        visible={pinRegisterVisible}
        biometricAlreadyEnabled={lockType === 'bio'}
        onComplete={handlePinRegisterComplete}
      />
    </BottomSheetModal>
  );
}

export default SecuritySetupSheet;
