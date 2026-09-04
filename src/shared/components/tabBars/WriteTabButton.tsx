import { router } from 'expo-router';
import { Pressable } from 'react-native';

import type { TabBarButtonProps } from './types';

/**
 * "기록" 탭은 실제 탭 콘텐츠가 없음 — 스캔 없이 바로 영수증을 직접 입력하고 싶은
 * 유저를 위해, 탭을 누르면 Write 탭으로 전환되는 대신 곧장 /confirm으로 이동시킨다.
 *
 * CLI 버전과의 차이: `useNavigation().navigate('Stacks', { screen: 'Confirm' })` 대신
 * expo-router의 명령형 API인 `router.push('/confirm')`을 사용한다.
 * (props.onPress를 그대로 두면 기본 탭 전환이 되므로, 덮어써서 막는다)
 */
function WriteTabButton({ ref: _ref, ...props }: TabBarButtonProps) {
  return (
    <Pressable
      {...props}
      onPress={() => {
        router.push('/confirm');
      }}
    />
  );
}

export default WriteTabButton;
