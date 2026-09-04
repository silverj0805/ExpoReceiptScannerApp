import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Text, View } from 'react-native';

import type { ReceiptGroup } from '../../utils/groupReceiptsByDate';

import ListReceiptRow from './ListReceiptRow';

interface ListDateGroupProps {
  group: ReceiptGroup;
  onPressItem: (id: number) => void;
}

const ListDateGroup = ({ group, onPressItem }: ListDateGroupProps) => (
  <View className="gap-2">
    <View className="flex-row items-center justify-between px-0.5">
      <Text className="text-xs font-bold text-gray">
        {dayjs(group.date).locale('ko').format('M월 D일 dddd')}
      </Text>
      <Text className="text-xs font-bold text-gray">
        ₩{group.total.toLocaleString('ko-KR')}
      </Text>
    </View>
    <View className="gap-2">
      {group.items.map(item => (
        <ListReceiptRow key={item.id} item={item} onPress={onPressItem} />
      ))}
    </View>
  </View>
);

export default ListDateGroup;
