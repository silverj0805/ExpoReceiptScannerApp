import ExpoModulesCore

public class NativeReceiptScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeReceiptScanner")

    AsyncFunction("setValueAsync") { (value: String) in
    }
  }
}
