import { NativeModule, requireNativeModule } from 'expo';

declare class NativeReceiptScannerModule extends NativeModule<{}> {
  scanText(imageUri: string): Promise<string>;
}

export default requireNativeModule<NativeReceiptScannerModule>('NativeReceiptScanner');
