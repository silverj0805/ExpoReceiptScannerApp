import { View, Text, Pressable } from 'react-native';

import Icon from '@/shared/components/Icon';

interface ScanHeaderProps {
  close: () => void;
}

const ScanHeader = ({ close }: ScanHeaderProps) => {
  return (
    <View className="flex-row items-center justify-between bg-black p-5">
      <Pressable
        testID="scan-close-button"
        onPress={close}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,255,255,0.14)]"
      >
        <Icon name="chevron-back" size={20} colorClassName="accent-white" />
      </Pressable>
      <Text className="text-sm font-bold text-white">영수증 스캔</Text>
      <View className="h-9 w-9" />
    </View>
  );
};

export default ScanHeader;
