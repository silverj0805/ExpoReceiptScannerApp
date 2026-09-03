import ExpoModulesCore
import Vision

public class NativeReceiptScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeReceiptScanner")

    AsyncFunction("scanText") { (imageUri: String, promise: Promise) in
      guard let url = URL(string: imageUri) else {
        promise.reject(Exception(name: "ScanError", description: "Invalid image URI: \(imageUri)", code: "SCAN_ERROR"))
        return
      }

      // VNImageRequestHandler.perform()은 동기(블로킹) + throws이기 때문에
      // 호출 스레드가 안전하게 감당할 수 있도록 백그라운드 큐로 직접 dispatch한다.
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let handler = VNImageRequestHandler(url: url, options: [:])
          let request = VNRecognizeTextRequest()

          // .accurate: 정확도 우선(느림) / .fast: 속도 우선(부정확).
          // 영수증은 글씨가 작고 촘촘해서 정확도를 우선한다.
          request.recognitionLevel = .accurate

          // 한국어(ko-KR) 우선, 가격·전화번호 등에 섞여 나오는 영문/숫자 표기를 위해 en-US도 포함.
          // 한국어 인식은 iOS 16+(Revision3)부터 지원.
          request.recognitionLanguages = ["ko-KR", "en-US"]
          request.usesLanguageCorrection = true

          try handler.perform([request])

          let observations = request.results ?? []
          let text = observations
            .compactMap { $0.topCandidates(1).first?.string }
            .joined(separator: "\n")

          promise.resolve(text)
        } catch {
          promise.reject(Exception(name: "ScanError", description: error.localizedDescription, code: "SCAN_ERROR"))
        }
      }
    }
  }
}
