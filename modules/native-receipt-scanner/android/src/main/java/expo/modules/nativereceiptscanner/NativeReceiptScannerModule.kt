package expo.modules.nativereceiptscanner

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeReceiptScannerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeReceiptScanner")

    AsyncFunction("scanText") { imageUri: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("SCAN_ERROR", "React context unavailable", null)
        return@AsyncFunction
      }

      try {
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        val image = InputImage.fromFilePath(context, Uri.parse(imageUri))

        recognizer.process(image)
          .addOnSuccessListener { visionText ->
            promise.resolve(visionText.text)
          }
          .addOnFailureListener { e ->
            promise.reject("SCAN_ERROR", e.message, e)
          }
      } catch (e: Exception) {
        promise.reject("SCAN_ERROR", e.message, e)
      }
    }
  }
}
