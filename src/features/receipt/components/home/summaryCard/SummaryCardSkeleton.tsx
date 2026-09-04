import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

import { Box } from '@/shared/components/Box';

const SummarySkeleton = () => (
  <Box className="w-full gap-3.5" testID="home-loading">
    <SkeletonPlaceholder borderRadius={6}>
      <SkeletonPlaceholder.Item gap={14}>
        <SkeletonPlaceholder.Item gap={6}>
          <SkeletonPlaceholder.Item width={72} height={14} />
          <SkeletonPlaceholder.Item width={168} height={32} />
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width="100%" height={8} borderRadius={999} />
        <SkeletonPlaceholder.Item flexDirection="row" gap={14}>
          <SkeletonPlaceholder.Item width={56} height={12} />
          <SkeletonPlaceholder.Item width={56} height={12} />
          <SkeletonPlaceholder.Item width={56} height={12} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  </Box>
);

export default SummarySkeleton;
