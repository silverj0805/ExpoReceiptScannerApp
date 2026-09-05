import { View, Text } from 'react-native';

import Icon from '@/shared/components/Icon';

const ScanHelperText = () => {
  return (
    <View pointerEvents="none" className="mt-3 items-center px-5">
      <View className="flex-row items-center gap-1.5 rounded-full bg-[rgba(0,0,0,0.45)] px-4 py-2">
        <Icon
          name="information-circle-outline"
          size={14}
          colorClassName="accent-white"
        />
        <Text className="flex-1 text-xs font-semibold text-white">
          인식률을 높이기 위해 선명한 화질로 필요한 정보만 가까이서 찍어주세요
        </Text>
      </View>
    </View>
  );
};

export default ScanHelperText;
