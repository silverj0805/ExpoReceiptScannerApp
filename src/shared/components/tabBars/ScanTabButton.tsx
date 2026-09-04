import { Pressable, View } from 'react-native';

import Icon from '@/shared/components/Icon';

import type { TabBarButtonProps } from './types';

/**
 * 탭 바 위로 살짝 튀어나온 원형 스캔 버튼.
 * onPress를 덮어쓰지 않고 props를 그대로 스프레드 — 눌렀을 때 실제로 "scan" 탭으로
 * 전환되는 정상적인 탭 버튼이다(Write/Settings와 달리 진짜 탭 콘텐츠가 있음).
 */
function ScanTabButton({ ref: _ref, ...props }: TabBarButtonProps) {
  return (
    <Pressable
      {...props}
      className="-top-8 items-center justify-center"
      style={({ pressed }) => [props.style, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
        <Icon name="camera-outline" size={24} className="text-white" />
      </View>
    </Pressable>
  );
}

export default ScanTabButton;
