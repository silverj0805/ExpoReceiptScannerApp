import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { receiptQueryFactory, receiptRepository } from '@/features/receipt/api';
import { useCSSColorVariable } from '@/shared/hooks/useCSSColorVariable';

import DetailError from '../../components/detail/DetailError';
import DetailFooter from '../../components/detail/DetailFooter';
import DetailHeader from '../../components/detail/DetailHeader';
import DetailRawText from '../../components/detail/DetailRawText';
import DetailSkeleton from '../../components/detail/DetailSkeleton';
import ReceiptInfoCard from '../../components/detail/ReceiptInfoCard';

/**
 * CLI 버전의 StackParamList.Detail({ receiptId })과 대응 — 파일명이 [id].tsx라
 * Expo Router 컨벤션상 파라미터 이름이 receiptId가 아니라 id로 고정된다(Task 3에서
 * 확인한 "파라미터 이름이 파일명으로 고정된다"는 제약).
 */
function ReceiptDetailScreen() {
  const { id: receiptId } = useLocalSearchParams<{ id: string }>();

  const backgroundColor = useCSSColorVariable('--color-background');

  const [showRaw, setShowRaw] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const detailQuery = useQuery(receiptQueryFactory.detail(receiptId));

  const goBack = () => router.back();

  const deleteMutation = useMutation({
    mutationFn: () => receiptRepository.deleteReceipt(receiptId),
    onSuccess: () => {
      // 목록 갱신은 invalidateQueries에 기대지 않음
      // HomeScreen에서 useFocusEffect로 포커스될 때마다 직접 refetch
      setIsDeleting(false);
      goBack();
    },
    onError: () => {
      setIsDeleting(false);
      setDeleteError('삭제에 실패했어요. 다시 시도해주세요.');
    },
  });

  const confirmDelete = () => {
    setDeleteError(null);
    Alert.alert('영수증을 삭제할까요?', '삭제하면 다시 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setIsDeleting(true);
          deleteMutation.mutate();
        },
      },
    ]);
  };

  if (detailQuery.isError) {
    const isNotFound =
      // eslint-disable-next-line import/no-named-as-default-member -- axios 공식 사용법 그대로(default import 후 axios.isAxiosError 호출)
      axios.isAxiosError(detailQuery.error) &&
      detailQuery.error.response?.status === 404;
    return <DetailError isNotFound={isNotFound} goBack={goBack} />;
  }

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{ flex: 1, backgroundColor }}
      >
        <DetailHeader onBack={goBack} />
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  const receipt = detailQuery.data.data;
  const goToEdit = () =>
    router.push({
      pathname: '/confirm',
      params: { info: JSON.stringify(receipt) },
    });

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor }}
    >
      <DetailHeader onBack={goBack} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3.5 px-5 pb-5"
      >
        <ReceiptInfoCard receipt={receipt} />
        {receipt.rawText ? (
          <DetailRawText
            rawText={receipt.rawText}
            showRaw={showRaw}
            onToggle={() => setShowRaw(prev => !prev)}
          />
        ) : null}
      </ScrollView>

      <DetailFooter
        deleteError={deleteError}
        isDeleting={isDeleting}
        onEdit={goToEdit}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

export default ReceiptDetailScreen;
