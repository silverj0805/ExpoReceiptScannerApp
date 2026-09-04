import { Pressable, Text, View } from 'react-native';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import { getCategoryInfo } from '@/shared/utils/category';

interface ListReceiptRowProps {
  item: Receipt;
  onPress: (id: number) => void;
}

const ListReceiptRow = ({ item, onPress }: ListReceiptRowProps) => {
  const info = getCategoryInfo(item.category);

  return (
    <Pressable
      testID={`receipt-item-${item.id}`}
      onPress={() => onPress(item.id)}
      className="flex-row items-center justify-between rounded-2xl border border-[#e8e6e1] bg-white px-3.5 py-3"
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: info.color }}
        />
        <View className="gap-0.5">
          <Text className="text-[13px] font-bold text-black">
            {item.merchant}
          </Text>
          <Text className="text-[11px] text-gray">{info.label}</Text>
        </View>
      </View>
      <Text className="text-sm font-extrabold text-black">
        ₩{item.amount.toLocaleString('ko-KR')}
      </Text>
    </Pressable>
  );
};

export default ListReceiptRow;
