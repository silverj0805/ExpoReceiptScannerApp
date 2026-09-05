import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { Text, View } from 'react-native';

import type { Receipt } from '@/features/receipt/api/types/receipt';
import { getCategoryInfo } from '@/shared/utils/category';

interface ReceiptInfoCardProps {
  receipt: Receipt;
}

const ReceiptInfoCard = ({ receipt }: ReceiptInfoCardProps) => {
  const info = getCategoryInfo(receipt.category);

  return (
    <View className="gap-2.5 rounded-2xl border border-[#e8e6e1] bg-white p-4.5">
      <View className="flex-row items-center justify-between">
        <Text
          testID="detail-merchant"
          className="text-base font-bold text-black"
        >
          가맹점 : {receipt.merchant}
        </Text>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: info.bg }}
        >
          <Text className="text-[11px] font-bold" style={{ color: info.color }}>
            {info.label}
          </Text>
        </View>
      </View>
      {receipt.itemName ? (
        <Text className="text-base font-bold text-black">
          품 명 : {receipt.itemName}
        </Text>
      ) : null}
      <Text className="text-[28px] font-extrabold text-black">
        ₩{receipt.amount.toLocaleString('ko-KR')}
      </Text>
      <Text className="text-[13px] text-gray">
        {dayjs(receipt.date).locale('ko').format('YYYY.MM.DD (ddd)')}
      </Text>
    </View>
  );
};

export default ReceiptInfoCard;
