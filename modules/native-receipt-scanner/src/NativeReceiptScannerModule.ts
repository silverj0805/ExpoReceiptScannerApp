import { NativeModule, requireNativeModule } from 'expo';

declare class NativeReceiptScannerModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<NativeReceiptScannerModule>('NativeReceiptScanner');
