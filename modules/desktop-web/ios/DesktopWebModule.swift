import ExpoModulesCore
import WebKit

public class DesktopWebModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DesktopWeb")

    // Small persistent settings (search engine and so on).
    Function("getSetting") { (key: String) -> String? in
      UserDefaults.standard.string(forKey: "dw." + key)
    }

    Function("setSetting") { (key: String, value: String) in
      UserDefaults.standard.set(value, forKey: "dw." + key)
    }

    // Only set by the automated simulator test (see .github/workflows/simulator-test.yml).
    // On a phone these environment variables never exist, so this returns an empty URL.
    Function("testUrl") { () -> String in
      ProcessInfo.processInfo.environment["DESKTOP_TEST_URL"] ?? ""
    }

    AsyncFunction("clearWebsiteData") { (promise: Promise) in
      let store = WKWebsiteDataStore.default()
      store.removeData(
        ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
        modifiedSince: Date.distantPast
      ) {
        promise.resolve(nil)
      }
    }.runOnQueue(.main)

    View(DesktopWebView.self) {
      Events("onStateChange", "onZoomChange", "onOpenWindow", "onLoadError")

      Prop("initialUrl") { (view: DesktopWebView, url: String) in
        view.loadInitial(url)
      }

      AsyncFunction("load") { (view: DesktopWebView, url: String) in
        view.load(url)
      }.runOnQueue(.main)

      AsyncFunction("goBack") { (view: DesktopWebView) in
        view.webView.goBack()
      }.runOnQueue(.main)

      AsyncFunction("goForward") { (view: DesktopWebView) in
        view.webView.goForward()
      }.runOnQueue(.main)

      AsyncFunction("reload") { (view: DesktopWebView) in
        view.reloadPage()
      }.runOnQueue(.main)

      AsyncFunction("stopLoading") { (view: DesktopWebView) in
        view.webView.stopLoading()
      }.runOnQueue(.main)

      AsyncFunction("zoomIn") { (view: DesktopWebView) -> Double in
        view.zoomStep(1)
      }.runOnQueue(.main)

      AsyncFunction("zoomOut") { (view: DesktopWebView) -> Double in
        view.zoomStep(-1)
      }.runOnQueue(.main)

      AsyncFunction("resetZoom") { (view: DesktopWebView) -> Double in
        view.resetZoom()
      }.runOnQueue(.main)

      AsyncFunction("getZoom") { (view: DesktopWebView) -> Double in
        view.currentPercent()
      }.runOnQueue(.main)
    }
  }
}
