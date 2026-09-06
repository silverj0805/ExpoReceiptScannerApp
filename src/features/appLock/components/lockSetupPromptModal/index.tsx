import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import { useAppLock } from '../../hooks/useAppLock';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 홈 화면 진입 시 보안 잠금 설정을 안내하는 모달. 무잠금 상태고 오늘 아직
 * 거절한 적 없으면(또는 거절한 지 24시간이 지났으면) 보여준다.
 */
function LockSetupPromptModal() {
  const hasHydrated = useAppLock(state => state.hasHydrated);
  const isLockSetUp = useAppLock(state => state.isLockSetUp);
  const declinedAt = useAppLock(state => state.declinedAt);
  const declineToday = useAppLock(state => state.declineToday);

  const isFocused = useIsFocused();

  // Date.now()를 렌더 중에 직접 비교하면 impure(react-hooks/purity) — 마운트 시
  // 한 번만 스냅샷 떠두고 렌더는 그 값에서 순수하게 파생만 시킨다
  const [now] = useState(() => Date.now());

  if (!hasHydrated) {
    return null;
  }

  const declinedRecently = declinedAt != null && now - declinedAt < ONE_DAY_MS;
  const promptVisible = !isLockSetUp && !declinedRecently && isFocused;

  const handleAccept = () => router.push('/settings');
  const handleDecline = () => declineToday();

  return (
    <Modal
      testID="lock-setup-prompt-modal"
      visible={promptVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDecline}
    >
      <View className="flex-1 items-center justify-center bg-black/45 p-6">
        <View className="w-full max-w-[320px] items-center gap-4 rounded-3xl bg-white p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon
              name="shield-checkmark"
              size={30}
              colorClassName="accent-primary"
            />
          </View>
          <View className="items-center gap-2">
            <Text className="text-center text-[17px] leading-tight font-bold text-black">
              영수증을 더 안전하게{'\n'}보관해보세요
            </Text>
            <Text className="text-center text-[13.5px] leading-relaxed text-gray">
              생체인증으로 앱 잠금을 설정하면{'\n'}나만 지출 내역을 볼 수 있어요
            </Text>
          </View>
          <View className="mt-2 w-full gap-2">
            <TouchableOpacity
              testID="lock-setup-prompt-accept"
              onPress={handleAccept}
              className="items-center rounded-2xl bg-primary py-3.5"
            >
              <Text className="text-[15px] font-bold text-white">
                네, 설정할게요
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="lock-setup-prompt-decline"
              onPress={handleDecline}
              className="items-center py-3"
            >
              <Text className="text-sm font-medium text-gray">
                다음에 할게요
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default LockSetupPromptModal;
