import { isSkeletonRow, type HomeRow } from './homeRows';
import ReceiptItem from './ReceiptItem';
import ReceiptItemSkeleton from './ReceiptItemSkeleton';

interface HomeReceiptRowProps {
  row: HomeRow;
  onPress: (id: number) => void;
}

const HomeReceiptRow = ({ row, onPress }: HomeReceiptRowProps) =>
  isSkeletonRow(row) ? (
    <ReceiptItemSkeleton />
  ) : (
    <ReceiptItem
      testID={`receipt-item-${row.id}`}
      item={row}
      onPress={onPress}
    />
  );

export default HomeReceiptRow;
