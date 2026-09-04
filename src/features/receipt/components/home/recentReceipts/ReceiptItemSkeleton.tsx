import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

import { Box } from '@/shared/components/Box';

const ReceiptItemSkeleton = () => (
  <Box className="flex-row items-center justify-between">
    <SkeletonPlaceholder borderRadius={6}>
      <SkeletonPlaceholder.Item
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        <SkeletonPlaceholder.Item gap={8}>
          <SkeletonPlaceholder.Item width={110} height={18} />
          <SkeletonPlaceholder.Item flexDirection="row" gap={6}>
            <SkeletonPlaceholder.Item width={44} height={18} borderRadius={8} />
            <SkeletonPlaceholder.Item width={56} height={18} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item width={64} height={18} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  </Box>
);

export default ReceiptItemSkeleton;
