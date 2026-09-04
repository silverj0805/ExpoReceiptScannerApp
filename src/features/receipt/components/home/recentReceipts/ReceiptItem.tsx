import dayjs from 'dayjs';
import { Pressable, Text, View } from 'react-native';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import { Box } from '@/shared/components/Box';
import { getCategoryInfo } from '@/shared/utils/category';

interface ReceiptItemProps {
  item: Receipt;
  onPress: (id: number) => void;
  testID?: string;
}

const ReceiptItem = ({ item, onPress, testID }: ReceiptItemProps) => {
  const info = getCategoryInfo(item.category);

  return (
    <Pressable testID={testID} onPress={() => onPress(item.id)}>
      <Box className="flex-row items-center justify-between">
        <View className="gap-2">
          <Text className="text-lg font-bold">{item.merchant}</Text>
          <View className="flex-row items-center gap-1">
            <View
              className="py-0.5 px-2 rounded-lg"
              style={{ backgroundColor: info.bg }}
            >
              <Text className="text-xs font-bold" style={{ color: info.color }}>
                {info.label}
              </Text>
            </View>
            <Text className="text-sm text-gray">
              {dayjs(item.date).format('M월 D일')}
            </Text>
          </View>
        </View>
        <Text className="text-lg font-bold">
          ₩{item.amount.toLocaleString('ko-KR')}
        </Text>
      </Box>
    </Pressable>
  );
};

export default ReceiptItem;
