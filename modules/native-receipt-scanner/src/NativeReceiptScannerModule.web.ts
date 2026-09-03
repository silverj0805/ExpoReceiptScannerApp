import { registerWebModule, NativeModule } from 'expo';

// NativeReceiptScannerModule is not available on the web platform.
class NativeReceiptScannerModule extends NativeModule<{}> {}

export default registerWebModule(NativeReceiptScannerModule, 'NativeReceiptScannerModule');
