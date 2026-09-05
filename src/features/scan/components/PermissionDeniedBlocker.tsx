import { View, Text, Pressable } from 'react-native';

import Icon from '@/shared/components/Icon';

interface PermissionDeniedBlockerProps {
  goToSettings: () => void;
  close: () => void;
}

const PermissionDeniedBlocker = ({
  goToSettings,
  close,
}: PermissionDeniedBlockerProps) => {
  return (
    <View className="flex-1 items-center justify-center gap-4.5 bg-[#141513] px-8">
      <Icon name="camera-outline" size={72} colorClassName="accent-primary" />
      <View className="items-center gap-2">
        <Text className="text-[17px] font-extrabold text-white">
          카메라 접근 권한이 필요해요
        </Text>
        <Text className="text-center text-[13px] leading-5 text-[#a8a6a1]">
          영수증을 스캔하려면{'\n'}카메라 권한을 허용해주세요
        </Text>
      </View>
      <View className="items-center gap-2.5">
        <Pressable
          onPress={goToSettings}
          className="rounded-2xl bg-primary px-7 py-3.5"
        >
          <Text className="text-sm font-bold text-white">설정으로 이동</Text>
        </Pressable>
        <Pressable onPress={close} hitSlop={8}>
          <Text className="text-[13px] font-semibold text-[#a8a6a1]">
            나중에 하기
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PermissionDeniedBlocker;
