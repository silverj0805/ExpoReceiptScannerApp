import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

import ReceiptItemSkeleton from '@/features/receipt/components/home/recentReceipts/ReceiptItemSkeleton';

const ListDateGroupSkeleton = () => (
  <View testID="receipt-list-skeleton" className="gap-2">
    <View className="flex-row items-center justify-between px-0.5">
      <SkeletonPlaceholder borderRadius={4}>
        <SkeletonPlaceholder.Item width={90} height={12} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder borderRadius={4}>
        <SkeletonPlaceholder.Item width={60} height={12} />
      </SkeletonPlaceholder>
    </View>
    <View className="gap-2">
      <ReceiptItemSkeleton />
      <ReceiptItemSkeleton />
    </View>
  </View>
);

export default ListDateGroupSkeleton;
