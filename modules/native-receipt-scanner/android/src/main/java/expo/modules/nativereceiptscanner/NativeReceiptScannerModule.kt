package expo.modules.nativereceiptscanner

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeReceiptScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeReceiptScanner")

    AsyncFunction("setValueAsync") { value: String ->
    }
  }
}
