import { Pressable, Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

interface ConfirmHeaderProps {
  title: string;
  onBack: () => void;
}

const ConfirmHeader = ({ title, onBack }: ConfirmHeaderProps) => (
  <View className="flex-row items-center justify-between p-5">
    <Pressable onPress={onBack} hitSlop={8}>
      <Icon name="chevron-back" size={22} colorClassName="accent-black" />
    </Pressable>
    <Text className="text-[15px] font-bold text-black">{title}</Text>
    <View className="w-5.5" />
  </View>
);

export default ConfirmHeader;
