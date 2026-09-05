import { View, Text } from 'react-native';

import Icon from '@/shared/components/Icon';

const EmptyReceipt = () => {
  return (
    <View className="flex-1 items-center justify-center gap-3">
      <Icon name="receipt" size={50} colorClassName="accent-primary" />
      <Text className="text-base font-bold">아직 기록된 영수증이 없어요.</Text>
      <View className="gap-1">
        <Text className="text-center text-gray">첫 영수증을 스캔하고</Text>
        <Text className="text-center text-gray">지출을 기록해보세요!</Text>
      </View>
    </View>
  );
};

export default EmptyReceipt;
