import { useEffect } from 'react';
import type { UseFormReset } from 'react-hook-form';

import NativeReceiptScannerModule from '../../../../modules/native-receipt-scanner/src/NativeReceiptScannerModule';
import type { ConfirmFormValues } from '../types';
import { deleteTempImage } from '../utils/deleteTempImage';
import { parseReceiptText } from '../utils/extractReceiptInfo/parseReceiptText';

function useScanReceipt({
  imageUri,
  isEditMode,
  reset,
  setRawText,
}: {
  imageUri?: string;
  isEditMode: boolean;
  reset: UseFormReset<ConfirmFormValues>;
  setRawText: (text: string) => void;
}) {
  useEffect(() => {
    if (isEditMode) return;
    if (!imageUri) return;

    NativeReceiptScannerModule.scanText(imageUri)
      .then(text => {
        setRawText(text);
        if (text === '') return;

        const parsed = parseReceiptText(text);
        reset({
          merchant: parsed.merchant ?? '',
          itemName: parsed.itemName ?? '',
          amount: parsed.amount != null ? String(parsed.amount) : '',
          date: parsed.date ?? '',
          category: '',
        });
      })
      .catch(() => {
        setRawText('');
      })
      .finally(() => {
        deleteTempImage(imageUri);
      });
  }, [imageUri, isEditMode, reset, setRawText]);
}

export default useScanReceipt;
