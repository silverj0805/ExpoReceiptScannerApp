import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import useSecuritySetupStatus from '../hooks/useSecuritySetupStatus';
import { useSecuritySettingsStore } from '../store/useSecuritySettingsStore';

import SecuritySetupSheet from './SecuritySetupSheet';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 홈 화면 최초 랜딩 시 보안 설정을 안내하는 모달.
 * 미설정 상태에서 오늘 아직 거절한 적 없으면(또는 거절한 지 24시간이 지났으면) 보여준다.
 */
function HomeSecurityOnboarding() {
  const { isSecuritySetUp, isLoading, refetch } = useSecuritySetupStatus();
  const onboardingDeclinedAt = useSecuritySettingsStore(
    state => state.onboardingDeclinedAt,
  );
  const declineOnboardingToday = useSecuritySettingsStore(
    state => state.declineOnboardingToday,
  );
  const [sheetVisible, setSheetVisible] = useState(false);

  // Date.now()를 렌더 중에 직접 비교하면 impure(react-hooks/purity)
  // 이 판단은 "24시간 지났는지" 같은 굵은 단위라 useState 지연 초기화로 마운트 시 한 번만
  // 스냅샷 떠두면 충분하고, 렌더는 그 값에서 순수하게 파생만 시킨다.
  const [now] = useState(() => Date.now());

  const declinedRecently =
    onboardingDeclinedAt != null && now - onboardingDeclinedAt < ONE_DAY_MS;
  const promptVisible =
    !isLoading && !isSecuritySetUp && !declinedRecently && !sheetVisible;

  const handleAccept = () => setSheetVisible(true);
  const handleDecline = () => declineOnboardingToday();
  const handleSheetClose = () => setSheetVisible(false);
  // refetch()를 안 부르면 이 컴포넌트(홈 화면 마운트 시 한 번 hasPinSet() 조회)의
  // isSecuritySetUp이 방금 끝난 PIN 등록을 반영 못 한 채 stale하게 false로 남아서,
  // 시트가 닫히자마자 온보딩 모달이 곧바로 다시 뜬다(실기기 재현으로 확인한 버그 —
  // 아래 테스트 참고).
  const handleSheetComplete = () => {
    setSheetVisible(false);
    refetch();
  };

  return (
    <>
      <Modal
        testID="security-onboarding-prompt"
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
                생체인증이나 PIN으로 앱 잠금을 설정하면{'\n'}나만 지출 내역을 볼
                수 있어요
              </Text>
            </View>
            <View className="mt-2 w-full gap-2">
              <TouchableOpacity
                testID="onboarding-accept"
                onPress={handleAccept}
                className="items-center rounded-2xl bg-primary py-3.5"
              >
                <Text className="text-[15px] font-bold text-white">
                  네, 설정할게요
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="onboarding-decline"
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

      <SecuritySetupSheet
        visible={sheetVisible}
        onClose={handleSheetClose}
        onComplete={handleSheetComplete}
      />
    </>
  );
}

export default HomeSecurityOnboarding;
