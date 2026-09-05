import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { receiptQueryFactory, receiptRepository } from '@/features/receipt/api';
import type {
  CreateReceiptPayload,
  Receipt,
} from '@/features/receipt/api/types/receipt';
import { useCSSColorVariable } from '@/shared/hooks/useCSSColorVariable';

import AmountField from '../components/AmountField';
import CategoryField from '../components/CategoryField';
import ConfirmHeader from '../components/ConfirmHeader';
import ConfirmLoading from '../components/ConfirmLoading';
import DateField from '../components/DateField';
import ItemNameField from '../components/ItemNameField';
import MerchantField from '../components/MerchantField';
import RawTextSection from '../components/RawTextSection';
import RecognitionFailed from '../components/RecognitionFailed';
import SaveFooter from '../components/SaveFooter';
import ScannedReceiptCard from '../components/ScannedReceiptCard';
import useScanReceipt from '../hooks/useScanReceipt';
import { DEFAULT_VALUES, type ConfirmFormValues } from '../types';

/**
 * CLI 버전의 StackParamList.Confirm({ imageUri?, info? })과 대응.
 *
 * CLI vs Expo Router 차이: route.params.info는 React Navigation에서 Receipt 객체를
 * 그대로 받았지만, expo-router는 URL 쿼리스트링만 다루므로 JSON 문자열로 직렬화해서
 * 넘어온다(ReceiptDetailScreen의 goToEdit에서 이미 그렇게 보냄) — 여기서 다시 파싱한다.
 */
function ConfirmScreen() {
  const backgroundColor = useCSSColorVariable('--color-background');
  const queryClient = useQueryClient();

  const { imageUri, info: infoParam } = useLocalSearchParams<{
    imageUri?: string;
    info?: string;
  }>();
  const info = infoParam ? (JSON.parse(infoParam) as Receipt) : undefined;
  const isEditMode = info != null;
  const editingReceiptId = info ? String(info.id) : undefined;
  const isDirectEntry = !isEditMode && !imageUri;

  const [rawText, setRawText] = useState<string | null>(
    isEditMode ? info.rawText ?? '' : isDirectEntry ? '' : null,
  );
  const [manualEntry, setManualEntry] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: createReceipt } = useMutation({
    mutationFn: receiptRepository.postReceipt,
    onSuccess: () => {
      setIsLoading(false);
      // CLI는 goBack() + navigate('BottomTabs', {screen:'Home'}) 두 번을 호출해서
      // Confirm을 닫고 홈 탭으로 전환했다. expo-router는 dismissTo(href)가
      // "href에 도달할 때까지 위 화면들을 전부 dismiss(없으면 현재 화면을 replace)"를
      // 한 번에 해줘서, 실제 스택 깊이(스캔 촬영 vs 갤러리 vs 직접 기록마다 다름)에
      // 안 흔들리는 이 방식이 두 단계 호출보다 더 안전하다고 판단해 이걸로 대체함.
      router.dismissTo('/');
    },
    onError: () => {
      setIsLoading(false);
      setSubmitError('저장에 실패했어요. 다시 시도해주세요.');
    },
  });

  const { mutateAsync: updateReceipt } = useMutation({
    mutationFn: (payload: CreateReceiptPayload) =>
      receiptRepository.patchReceipt(editingReceiptId ?? '', payload),
    onSuccess: () => {
      if (editingReceiptId) {
        queryClient.invalidateQueries({
          queryKey: receiptQueryFactory.detail(editingReceiptId).queryKey,
          refetchType: 'all',
        });
      }
      setIsLoading(false);
      router.back();
    },
    onError: () => {
      setIsLoading(false);
      setSubmitError('수정에 실패했어요. 다시 시도해주세요.');
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ConfirmFormValues>({
    defaultValues: isEditMode
      ? {
          merchant: info.merchant,
          itemName: info.itemName ?? '',
          amount: String(info.amount),
          date: info.date,
          category: info.category,
        }
      : DEFAULT_VALUES,
    mode: 'onChange',
  });

  useScanReceipt({ imageUri, isEditMode, reset, setRawText });

  const goBack = () => router.back();
  const enterManually = () => setManualEntry(true);

  const onSubmit = async (values: ConfirmFormValues) => {
    if (values.category === '') return;

    setSubmitError(null);
    setIsLoading(true);

    const payload: CreateReceiptPayload = {
      merchant: values.merchant,
      itemName: values.itemName || undefined,
      amount: Number(values.amount),
      category: values.category,
      date: values.date,
      rawText: rawText || undefined,
    };

    if (isEditMode) {
      await updateReceipt(payload).catch(() => {});
    } else {
      await createReceipt(payload).catch(() => {});
    }
  };

  if (rawText === null) {
    return <ConfirmLoading />;
  }

  const isRecognitionFailed =
    !isEditMode && !isDirectEntry && rawText === '' && !manualEntry;

  if (isRecognitionFailed) {
    return <RecognitionFailed goBack={goBack} enterManually={enterManually} />;
  }

  const title = isEditMode
    ? '영수증 수정'
    : isDirectEntry
    ? '영수증 기록'
    : '인식 결과 확인';

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor }}
    >
      <ConfirmHeader title={title} onBack={goBack} />

      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerClassName="gap-3.5 px-5 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {!isEditMode && !isDirectEntry && (
          <ScannedReceiptCard onRetake={goBack} />
        )}

        {rawText ? (
          <RawTextSection
            rawText={rawText}
            showRaw={showRaw}
            onToggle={() => setShowRaw(prev => !prev)}
          />
        ) : null}

        <MerchantField control={control} errors={errors} />
        <ItemNameField control={control} />
        <AmountField control={control} errors={errors} />
        <DateField control={control} errors={errors} />
        <CategoryField control={control} errors={errors} />
      </KeyboardAwareScrollView>

      <SaveFooter
        isEditMode={isEditMode}
        isValid={isValid}
        isLoading={isLoading}
        submitError={submitError}
        onSave={() => handleSubmit(onSubmit)()}
      />
    </SafeAreaView>
  );
}

export default ConfirmScreen;
