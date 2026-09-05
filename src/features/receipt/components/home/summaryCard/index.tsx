import { Text, View } from 'react-native';

import type { CategorySummary } from '@/features/receipt/api/types/summary';
import { Box } from '@/shared/components/Box';
import { getCategoryInfo } from '@/shared/utils/category';

export interface SummaryCardProps {
  total: number;
  deltaAmount: number;
  deltaPercent: number;
  byCategory: CategorySummary[];
}

function SummaryCard({
  total,
  deltaAmount,
  deltaPercent,
  byCategory,
}: SummaryCardProps) {
  return (
    <Box className="w-full gap-3.5 border-primary">
      <View className="gap-2">
        <Text className="font-bold text-gray">이번 달 지출 💸</Text>

        <Text className="text-[32px] font-extrabold tracking-[-0.5px] text-black tabular-nums">
          ₩{total.toLocaleString('ko-KR')}
        </Text>

        {deltaPercent !== 0 && (
          <Text className={`font-medium`}>
            지난 달 대비{' '}
            <Text
              className={`font-bold ${
                deltaPercent < 0 ? 'text-primary' : 'text-[#dc2626]'
              }`}
            >
              {deltaAmount.toLocaleString('ko-KR')}원{' '}
              {deltaPercent > 0 ? '더' : '덜'}
            </Text>{' '}
            쓰고 있어요.
          </Text>
        )}
      </View>

      {byCategory.length > 0 && (
        <>
          <View className="h-2 flex-row overflow-hidden rounded-full bg-[#eeeeee]">
            {byCategory.map(({ category, percent }) => (
              <View
                key={category}
                className="h-full"
                style={{
                  width: `${percent}%`,
                  backgroundColor: getCategoryInfo(category).color,
                }}
              />
            ))}
          </View>

          <View className="flex-row flex-wrap gap-x-3.5 gap-y-2">
            {byCategory.map(({ category, percent }) => {
              const info = getCategoryInfo(category);
              return (
                <View key={category} className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <Text className="text-xs font-semibold text-gray">
                    {info.label} {percent}%
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Box>
  );
}

export default SummaryCard;
