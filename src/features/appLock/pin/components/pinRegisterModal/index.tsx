import { useState } from 'react';
import { Modal, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import PinDots from '../PinDots';
import PinKeypad from '../PinKeypad';
import { PIN_LENGTH, savePin } from '../../utils';

interface PinRegisterModalProps {
  visible: boolean;
  /** 생체인증을 이미 켠 상태로 이 화면에 들어왔는지 — true면 PIN도 함께 등록하는 이유를 안내한다. */
  biometricAlreadyEnabled: boolean;
  onComplete: () => void;
}

type Stage = 'first' | 'confirm';

/**
 * PIN 등록 화면 — 1차 입력 → 2차 재확인을 하나의 컴포넌트가 내부 `stage`로 전환하며
 * 처리하고, 일치하면 `savePin`으로 저장한다.
 *
 * 이전 버전(구 feat/appLock 브랜치의 PinRegisterForm)은 바텀 시트 안에 내용으로
 * 얹혀 있었지만, 이번엔 전체 화면을 덮는 `Modal`로 띄운다(사용자 확인) — PIN
 * 등록은 반드시 끝까지 마쳐야 하는 흐름이라(생체인증을 골랐어도 대체제로 PIN은
 * 무조건 등록해야 함) 취소 동선을 따로 두지 않았다.
 */
function PinRegisterModal({
  visible,
  biometricAlreadyEnabled,
  onComplete,
}: PinRegisterModalProps) {
  const [stage, setStage] = useState<Stage>('first');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  // 한 번 등록을 마치고 나중에 다시 이 모달이 열리는 경우(예: "인증 초기화" 이후
  // 재등록) 이전 시도의 stage/입력값이 남아있으면 안 되므로, 다시 열릴 때마다
  // 처음 단계로 되돌린다. useEffect에서 setState를 직접 부르면
  // react-hooks/set-state-in-effect에 걸리고 불필요한 리렌더가 한 번 더
  // 생기므로, React 공식 문서가 권장하는 "prop 변화에 맞춰 렌더 중 상태
  // 조정하기" 패턴(구 feat/appLock 브랜치의 PinVerifyForm이 쓰던 것과 동일)을
  // 그대로 쓴다.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStage('first');
      setFirstPin('');
      setConfirmPin('');
      setError(null);
    }
  }

  const currentPin = stage === 'first' ? firstPin : confirmPin;

  const handlePressDigit = async (digit: string) => {
    if (currentPin.length >= PIN_LENGTH) return;

    const nextPin = currentPin + digit;

    if (stage === 'first') {
      setFirstPin(nextPin);
      if (nextPin.length === PIN_LENGTH) {
        setStage('confirm');
      }
      return;
    }

    setConfirmPin(nextPin);
    if (nextPin.length !== PIN_LENGTH) return;

    if (nextPin === firstPin) {
      await savePin(nextPin);
      onComplete();
      return;
    }

    setError('PIN이 일치하지 않아요. 다시 입력해주세요.');
    setConfirmPin('');
  };

  const handlePressDelete = () => {
    if (stage === 'first') {
      setFirstPin(pin => pin.slice(0, -1));
    } else {
      setConfirmPin(pin => pin.slice(0, -1));
      setError(null);
    }
  };

  return (
    <Modal
      testID="pin-register-modal"
      visible={visible}
      animationType="slide"
      // PIN 등록은 반드시 완료돼야 하는 흐름이라 안드로이드 뒤로가기로 중간에
      // 빠져나갈 수 없게 막는다(취소 동선을 의도적으로 두지 않음).
      onRequestClose={() => {}}
    >
      <View className="flex-1 items-center gap-6 bg-white px-6 py-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-5.5 w-5.5 items-center justify-center rounded-full bg-primary">
            {stage === 'confirm' && (
              <Icon name="checkmark" size={12} colorClassName="accent-white" />
            )}
          </View>
          <View
            className={`h-[1.5px] w-5 ${stage === 'confirm' ? 'bg-primary' : 'bg-[#c9c6bf]'}`}
          />
          <View
            className={`h-5.5 w-5.5 rounded-full ${
              stage === 'confirm'
                ? 'bg-primary'
                : 'border-[1.5px] border-[#c9c6bf]'
            }`}
          />
        </View>

        {biometricAlreadyEnabled && (
          <View className="w-full rounded-2xl bg-primary/10 px-4 py-3">
            <Text className="text-center text-xs leading-5 text-primary">
              Face ID를 선택하셨어도, 인식이 안 될 때를 위해 PIN도 함께 등록해요
            </Text>
          </View>
        )}

        <View className="items-center gap-2">
          <Text className="text-xl font-bold text-black">
            {stage === 'first'
              ? 'PIN 번호를 설정해주세요'
              : '다시 한 번 입력해주세요'}
          </Text>
          <Text className="text-sm text-gray">
            {stage === 'first'
              ? `${PIN_LENGTH}자리 숫자를 입력해주세요`
              : '확인을 위해 동일한 PIN을 입력해주세요'}
          </Text>
        </View>

        <PinDots length={currentPin.length} />

        {error && (
          <Text className="text-xs text-[#B3261E]" testID="pin-error">
            {error}
          </Text>
        )}

        <PinKeypad
          onPressDigit={handlePressDigit}
          onPressDelete={handlePressDelete}
        />
      </View>
    </Modal>
  );
}

export default PinRegisterModal;
