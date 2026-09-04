import { Text, View } from 'react-native';

import Icon from '@/shared/components/Icon';

const ListEmpty = () => (
  <View className="flex-1 items-center justify-center gap-3 py-20">
    <Icon name="search-outline" size={44} colorClassName="accent-gray" />
    <Text className="text-sm font-bold text-gray">
      조건에 맞는 영수증이 없어요
    </Text>
  </View>
);

export default ListEmpty;
