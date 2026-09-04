import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

interface DetailHeaderProps {
  onBack: () => void;
}

const DetailHeader = ({ onBack }: DetailHeaderProps) => (
  <View className="flex-row items-center justify-between p-5">
    <Pressable testID="detail-back-button" onPress={onBack} hitSlop={8}>
      <Icon name="chevron-back" size={22} colorClassName="accent-black" />
    </Pressable>
    <Text className="text-[15px] font-bold text-black">영수증 상세</Text>
    <View className="w-5.5" />
  </View>
);

export default DetailHeader;
