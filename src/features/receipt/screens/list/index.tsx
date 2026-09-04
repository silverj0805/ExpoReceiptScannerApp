import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { receiptQueryFactory, receiptRepository } from '@/features/receipt/api';
import { useCSSColorVariable } from '@/shared/hooks/useCSSColorVariable';
import { CATEGORY_IDS } from '@/shared/utils/category';

import type { CategoryId } from '../../api/types/category';
import ListDateGroup from '../../components/list/ListDateGroup';
import ListDateGroupSkeleton from '../../components/list/ListDateGroupSkeleton';
import ListEmpty from '../../components/list/ListEmpty';
import ListFilters from '../../components/list/ListFilters';
import {
  isSkeletonRow,
  SKELETON_ROWS,
  type ListRow,
} from '../../components/list/listRows';
import { groupReceiptsByDate } from '../../utils/groupReceiptsByDate';
import {
  categoriesToParam,
  periodToMonthParam,
  type PeriodFilter,
} from '../../utils/receiptFilters';

const PAGE_SIZE = 10;

function ReceiptListScreen() {
  const backgroundColor = useCSSColorVariable('--color-background');
  const primaryColor = useCSSColorVariable('--color-primary');

  const scrollRef = useRef<FlatList<ListRow> | null>(null);
  useScrollToTop(scrollRef);

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>(
    [],
  );

  const toggleCategory = (id: CategoryId) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };
  const selectAllCategories = () => setSelectedCategories([]);

  const month = periodToMonthParam(period);
  const category = categoriesToParam(selectedCategories, CATEGORY_IDS);

  const listQuery = useInfiniteQuery({
    // period/category가 바뀌면 새 쿼리(=1페이지부터 다시)로 취급되게 키에 포함.
    // 선택 순서에 상관없이 같은 키가 나오도록 정렬해서 넣는다.
    queryKey: [
      ...receiptQueryFactory.list().queryKey,
      'filtered',
      period,
      [...selectedCategories].sort(),
    ],
    queryFn: ({ pageParam }) =>
      receiptRepository.getList({
        take: PAGE_SIZE,
        skip: pageParam,
        category,
        month,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.data.length < PAGE_SIZE
        ? undefined
        : allPages.length * PAGE_SIZE,
    placeholderData: keepPreviousData,
  });

  const receipts = listQuery.data?.pages.flatMap(page => page.data) ?? [];
  const groups = groupReceiptsByDate(receipts);
  const rows: ListRow[] = listQuery.isLoading ? SKELETON_ROWS : groups;
  const keyExtractor = useCallback((row: ListRow) => {
    return isSkeletonRow(row) ? `skeleton-${row.skeletonKey}` : row.date;
  }, []);

  useFocusEffect(
    useCallback(() => {
      listQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const handleEndReached = () => {
    if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
      listQuery.fetchNextPage();
    }
  };

  const goToDetail = (id: number) => router.push(`/receipts/${id}`);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await listQuery.refetch().finally(() => {
      setRefreshing(false);
    });
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor }}
      className="bg-background"
    >
      <ListFilters
        period={period}
        selectedCategories={selectedCategories}
        onPeriodChange={setPeriod}
        onToggleCategory={toggleCategory}
        onSelectAllCategories={selectAllCategories}
      />

      <FlatList
        testID="receipt-list"
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
        data={rows}
        keyExtractor={keyExtractor}
        contentContainerClassName="grow gap-4 px-5 pb-10"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.7}
        ListEmptyComponent={<ListEmpty />}
        ListFooterComponent={
          listQuery.isFetchingNextPage ? (
            <ActivityIndicator color="#1B5E43" />
          ) : undefined
        }
        renderItem={({ item: row }) =>
          isSkeletonRow(row) ? (
            <ListDateGroupSkeleton />
          ) : (
            <ListDateGroup group={row} onPressItem={goToDetail} />
          )
        }
        refreshControl={
          <RefreshControl
            testID="receipt-list-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }
      />
    </SafeAreaView>
  );
}

export default ReceiptListScreen;
