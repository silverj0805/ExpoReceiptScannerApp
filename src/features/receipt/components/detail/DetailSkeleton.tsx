import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const DetailSkeleton = () => (
  <View testID="receipt-detail-loading" className="flex-1 gap-3.5 px-5 pb-5">
    <View className="rounded-2xl border border-[#e8e6e1] bg-white p-4.5">
      <SkeletonPlaceholder borderRadius={6}>
        <SkeletonPlaceholder.Item gap={10} width="100%">
          <SkeletonPlaceholder.Item
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <SkeletonPlaceholder.Item width={160} height={20} />
            <SkeletonPlaceholder.Item
              width={44}
              height={22}
              borderRadius={999}
            />
          </SkeletonPlaceholder.Item>
          <SkeletonPlaceholder.Item width={140} height={20} />
          <SkeletonPlaceholder.Item width={148} height={32} />
          <SkeletonPlaceholder.Item width={120} height={16} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>

    <View className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-white">
      <View className="px-3.5 py-3">
        <SkeletonPlaceholder borderRadius={6}>
          <SkeletonPlaceholder.Item
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <SkeletonPlaceholder.Item width={72} height={16} />
            <SkeletonPlaceholder.Item width={16} height={16} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
      <View className="mx-3.5 mb-3.5 rounded-[10px] bg-[#f1f0ec] px-3 py-2.5">
        <SkeletonPlaceholder borderRadius={4}>
          <SkeletonPlaceholder.Item gap={6} width="100%">
            <SkeletonPlaceholder.Item width="100%" height={12} />
            <SkeletonPlaceholder.Item width="88%" height={12} />
            <SkeletonPlaceholder.Item width="72%" height={12} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    </View>
  </View>
);

export default DetailSkeleton;
