import ExpoModulesCore
import UIKit
import UIKit.UIGestureRecognizerSubclass
import WebKit

/// One browser tab: Apple's WKWebView, always in desktop content mode.
///
/// Desktop mode (WKWebpagePreferences.preferredContentMode = .desktop) is the same switch
/// Safari's "Request Desktop Website" uses. WebKit then sends the Mac Safari identity,
/// ignores the mobile viewport hints sites give phones, and lays the page out at desktop width.
///
/// Zoom is purely visual (the scroll view's zoom scale, like pinching), so it never changes
/// the page layout. Each new page starts fitted to the screen width ("100%").
public final class DesktopWebView: ExpoView, WKNavigationDelegate, WKUIDelegate {
  let onStateChange = EventDispatcher()
  let onZoomChange = EventDispatcher()
  let onOpenWindow = EventDispatcher()
  let onLoadError = EventDispatcher()

  let webView: WKWebView
  private let touchTracker = TouchTracker()
  private var observations: [NSKeyValueObservation] = []
  private var didLoadInitial = false
  private var lastBoundsSize: CGSize = .zero

  // Zoom state
  /// Zoom the page should sit at, as a percentage of "fit the full width". Kept while you
  /// stay on the same website, back to 100 when you go to a different one.
  private var targetPercent: Double = 100
  /// True once you pinch, double-tap or use the zoom buttons on the current page.
  /// From then on the app never changes the zoom by itself on that page.
  private var userAdjustedZoom = false
  private var currentHost: String?
  private var applyingZoom = false
  private var lastScale: CGFloat = 0
  private var lastReportedPercent: Double = -1
  private var autoFitCount = 0

  // Automated simulator test only (never set on a phone).
  private let testEnv = ProcessInfo.processInfo.environment
  private var testReported = false

  public required init(appContext: AppContext? = nil) {
    let config = WKWebViewConfiguration()
    config.defaultWebpagePreferences.preferredContentMode = .desktop
    config.defaultWebpagePreferences.allowsContentJavaScript = true
    // Without this, WebKit ends the desktop identity with "Mobile/15E148", which some
    // servers read as a phone. Safari sends "Version/x Safari/605.1.15" here.
    let major = UIDevice.current.systemVersion.split(separator: ".").first.map(String.init) ?? "26"
    config.applicationNameForUserAgent = "Version/\(major).0 Safari/605.1.15"
    config.allowsInlineMediaPlayback = true
    config.websiteDataStore = .default()

    webView = WKWebView(frame: .zero, configuration: config)
    super.init(appContext: appContext)

    webView.navigationDelegate = self
    webView.uiDelegate = self
    webView.allowsBackForwardNavigationGestures = true
    webView.allowsLinkPreview = true
    webView.isInspectable = true
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.scrollView.decelerationRate = .normal
    webView.backgroundColor = .systemBackground
    clipsToBounds = true
    addSubview(webView)

    touchTracker.onChange = { [weak self] in self?.evaluateZoom() }
    webView.addGestureRecognizer(touchTracker)

    observations = [
      webView.observe(\.url, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.observe(\.title, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.observe(\.canGoBack, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.observe(\.canGoForward, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.observe(\.isLoading, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.observe(\.estimatedProgress, options: [.new]) { [weak self] _, _ in self?.emitState() },
      webView.scrollView.observe(\.contentSize, options: [.new]) { [weak self] _, _ in
        self?.evaluateZoom()
      },
    ]
  }

  public required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  deinit {
    observations.forEach { $0.invalidate() }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    webView.frame = bounds
    if bounds.size != lastBoundsSize {
      let widthChanged = bounds.width != lastBoundsSize.width
      lastBoundsSize = bounds.size
      if widthChanged {
        // Rotation or first layout: re-fit unless you've zoomed this page yourself.
        DispatchQueue.main.async { [weak self] in self?.evaluateZoom() }
      }
    }
  }

  // MARK: - Loading

  func loadInitial(_ url: String) {
    guard !didLoadInitial else { return }
    didLoadInitial = true
    load(url)
  }

  func load(_ string: String) {
    guard let url = URL(string: string) else { return }
    webView.load(URLRequest(url: url))
  }

  func reloadPage() {
    if webView.url == nil, let back = webView.backForwardList.currentItem?.url {
      webView.load(URLRequest(url: back))
    } else {
      webView.reload()
    }
  }

  private func emitState() {
    onStateChange([
      "url": webView.url?.absoluteString ?? "",
      "title": webView.title ?? "",
      "canGoBack": webView.canGoBack,
      "canGoForward": webView.canGoForward,
      "loading": webView.isLoading,
      "progress": webView.estimatedProgress,
    ])
  }

  // MARK: - Zoom

  /// Zoom scale at which the page's full desktop width exactly fits the screen.
  private func fitScale() -> CGFloat? {
    let sv = webView.scrollView
    guard sv.zoomScale > 0, bounds.width > 0 else { return nil }
    let pageWidth = sv.contentSize.width / sv.zoomScale
    guard pageWidth > 1 else { return nil }
    return bounds.width / pageWidth
  }

  func currentPercent() -> Double {
    guard let fit = fitScale() else { return 100 }
    return Double(webView.scrollView.zoomScale / fit * 100)
  }

  private func emitZoom() {
    let percent = (currentPercent()).rounded()
    if percent != lastReportedPercent {
      lastReportedPercent = percent
      onZoomChange(["percent": percent])
    }
  }

  /// Called whenever the page size, zoom or touches change.
  private func evaluateZoom() {
    guard !applyingZoom else { return }
    let sv = webView.scrollView
    let scale = sv.zoomScale
    if abs(scale - lastScale) > 0.0001 {
      // A zoom change while a finger is down (or just lifted) is a pinch or double-tap.
      if lastScale > 0 && touchTracker.isInteracting {
        userAdjustedZoom = true
      }
      lastScale = scale
    }
    if userAdjustedZoom {
      if !touchTracker.isTouching {
        targetPercent = currentPercent()
      }
      emitZoom()
      return
    }
    applyTarget(animated: false)
    emitZoom()
  }

  private func applyTarget(animated: Bool) {
    guard let fit = fitScale() else { return }
    let sv = webView.scrollView
    var target = fit * CGFloat(targetPercent / 100)
    target = min(max(target, sv.minimumZoomScale), sv.maximumZoomScale)
    guard abs(target - sv.zoomScale) > 0.001 else { return }
    // Safety net in case WebKit keeps resetting the scale while a page loads.
    guard autoFitCount < 200 else { return }
    autoFitCount += 1
    setScale(target, animated: animated)
  }

  private func setScale(_ target: CGFloat, animated: Bool) {
    let sv = webView.scrollView
    applyingZoom = true
    let finish = { [weak self] in
      guard let self else { return }
      if self.targetPercent <= 100.5 {
        // Fitted: keep the left edge of the page on screen.
        var offset = sv.contentOffset
        offset.x = -sv.adjustedContentInset.left
        sv.contentOffset = offset
      }
      self.lastScale = sv.zoomScale
      self.applyingZoom = false
      self.emitZoom()
    }
    if animated {
      UIView.animate(withDuration: 0.25, delay: 0, options: [.curveEaseInOut]) {
        sv.setZoomScale(target, animated: false)
      } completion: { _ in finish() }
    } else {
      sv.setZoomScale(target, animated: false)
      finish()
    }
  }

  /// Zoom buttons step in 25% increments of the fitted width.
  func zoomStep(_ direction: Int) -> Double {
    guard let fit = fitScale() else { return 100 }
    let sv = webView.scrollView
    let current = currentPercent()
    var next = direction > 0
      ? (floor(current / 25 + 0.001) + 1) * 25
      : (ceil(current / 25 - 0.001) - 1) * 25
    let minPercent = Double(sv.minimumZoomScale / fit * 100)
    let maxPercent = Double(sv.maximumZoomScale / fit * 100)
    next = min(max(next, minPercent), maxPercent)
    userAdjustedZoom = true
    targetPercent = next
    setScale(fit * CGFloat(next / 100), animated: true)
    return next.rounded()
  }

  func resetZoom() -> Double {
    userAdjustedZoom = false
    targetPercent = 100
    autoFitCount = 0
    guard let fit = fitScale() else { return 100 }
    let sv = webView.scrollView
    setScale(min(max(fit, sv.minimumZoomScale), sv.maximumZoomScale), animated: true)
    return 100
  }

  private static func siteKey(_ url: URL?) -> String? {
    guard var host = url?.host?.lowercased() else { return nil }
    if host.hasPrefix("www.") { host.removeFirst(4) }
    return host
  }

  // MARK: - WKNavigationDelegate

  public func webView(
    _ webView: WKWebView,
    decidePolicyFor navigationAction: WKNavigationAction,
    preferences: WKWebpagePreferences,
    decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void
  ) {
    // Every navigation, every frame: desktop.
    preferences.preferredContentMode = .desktop
    if let url = navigationAction.request.url,
       let scheme = url.scheme?.lowercased(),
       !["http", "https", "about", "data", "blob", "file", "javascript"].contains(scheme) {
      // mailto:, tel:, maps and app links open in their own apps.
      UIApplication.shared.open(url)
      decisionHandler(.cancel, preferences)
      return
    }
    decisionHandler(.allow, preferences)
  }

  public func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    // A new page: start fitted again. Keep your zoom if it's the same website.
    let host = Self.siteKey(webView.url)
    if host != currentHost {
      targetPercent = 100
    }
    currentHost = host
    userAdjustedZoom = false
    autoFitCount = 0
    lastScale = 0
    evaluateZoom()
  }

  public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    evaluateZoom()
    emitState()
    runTestReportIfNeeded()
  }

  public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    reportLoadError(error)
  }

  public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    reportLoadError(error)
  }

  private func reportLoadError(_ error: Error) {
    let nsError = error as NSError
    // Cancelled loads and loads handed to another app aren't errors.
    if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
    if nsError.domain == "WebKitErrorDomain" && (nsError.code == 102 || nsError.code == 204) { return }
    emitState()
    onLoadError([
      "message": nsError.localizedDescription,
      "url": (nsError.userInfo[NSURLErrorFailingURLStringErrorKey] as? String) ?? webView.url?.absoluteString ?? "",
    ])
  }

  public func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    // iOS can stop a background tab's page to save memory. Bring it back.
    reloadPage()
  }

  // MARK: - WKUIDelegate

  public func webView(
    _ webView: WKWebView,
    createWebViewWith configuration: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction,
    windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    // Links that open a new window (target="_blank") open in a new tab.
    if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
      let string = url.absoluteString
      if string.isEmpty || string == "about:blank" {
        return nil
      }
      onOpenWindow(["url": string])
    }
    return nil
  }

  public func webView(
    _ webView: WKWebView,
    runJavaScriptAlertPanelWithMessage message: String,
    initiatedByFrame frame: WKFrameInfo,
    completionHandler: @escaping () -> Void
  ) {
    guard let presenter = topViewController() else { completionHandler(); return }
    let alert = UIAlertController(title: frame.request.url?.host, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
    presenter.present(alert, animated: true)
  }

  public func webView(
    _ webView: WKWebView,
    runJavaScriptConfirmPanelWithMessage message: String,
    initiatedByFrame frame: WKFrameInfo,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let presenter = topViewController() else { completionHandler(false); return }
    let alert = UIAlertController(title: frame.request.url?.host, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
    presenter.present(alert, animated: true)
  }

  public func webView(
    _ webView: WKWebView,
    runJavaScriptTextInputPanelWithPrompt prompt: String,
    defaultText: String?,
    initiatedByFrame frame: WKFrameInfo,
    completionHandler: @escaping (String?) -> Void
  ) {
    guard let presenter = topViewController() else { completionHandler(nil); return }
    let alert = UIAlertController(title: frame.request.url?.host, message: prompt, preferredStyle: .alert)
    alert.addTextField { $0.text = defaultText }
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
    alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
      completionHandler(alert?.textFields?.first?.text)
    })
    presenter.present(alert, animated: true)
  }

  private func topViewController() -> UIViewController? {
    var controller = window?.rootViewController
    while let presented = controller?.presentedViewController {
      controller = presented
    }
    return controller
  }

  // MARK: - Automated simulator test

  /// When the simulator test launches the app, write what the page reports about itself
  /// (identity, layout width, zoom) to Documents/desktop-test.jsonl.
  private func runTestReportIfNeeded() {
    guard testEnv["DESKTOP_TEST_REPORT"] != nil, !testReported else { return }
    testReported = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
      self?.writeTestReport(stage: "loaded")
      guard self?.testEnv["DESKTOP_TEST_ZOOM"] != nil else { return }
      DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
        _ = self?.zoomStep(1)
        _ = self?.zoomStep(1)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
          self?.writeTestReport(stage: "zoomed-in-twice")
        }
      }
    }
  }

  private func writeTestReport(stage: String) {
    let js = """
    JSON.stringify({
      ua: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      innerWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      dpr: window.devicePixelRatio,
      viewportMeta: (document.querySelector('meta[name=viewport]') || {}).content || null,
      href: location.href,
      title: document.title
    })
    """
    let sv = webView.scrollView
    let native: [String: Any] = [
      "stage": stage,
      "zoomScale": sv.zoomScale,
      "minZoom": sv.minimumZoomScale,
      "maxZoom": sv.maximumZoomScale,
      "fitScale": fitScale() ?? -1,
      "percent": currentPercent(),
      "contentWidth": sv.contentSize.width,
      "viewWidth": bounds.width,
      "viewHeight": bounds.height,
    ]
    webView.evaluateJavaScript(js) { result, error in
      var record = native
      record["page"] = (result as? String) ?? "error: \(String(describing: error))"
      guard let data = try? JSONSerialization.data(withJSONObject: record),
            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
      else { return }
      let file = docs.appendingPathComponent("desktop-test.jsonl")
      var line = data
      line.append(0x0A)
      if let handle = try? FileHandle(forWritingTo: file) {
        handle.seekToEndOfFile()
        handle.write(line)
        try? handle.close()
      } else {
        try? line.write(to: file)
      }
    }
  }
}

/// Watches touches on the page without ever taking them over, so the app can tell
/// your pinches and double-taps apart from zoom changes WebKit makes while loading.
final class TouchTracker: UIGestureRecognizer {
  var onChange: (() -> Void)?
  private var activeTouches = 0
  private var lastTouchEnded: CFTimeInterval = 0

  var isTouching: Bool { activeTouches > 0 }
  /// Touching now, or lifted the finger in the last moment (double-tap zoom animates after).
  var isInteracting: Bool { activeTouches > 0 || CACurrentMediaTime() - lastTouchEnded < 1.0 }

  init() {
    super.init(target: nil, action: nil)
    cancelsTouchesInView = false
    delaysTouchesBegan = false
    delaysTouchesEnded = false
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    activeTouches += touches.count
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
    endTouches(touches.count)
  }

  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
    endTouches(touches.count)
  }

  private func endTouches(_ count: Int) {
    activeTouches = max(0, activeTouches - count)
    if activeTouches == 0 {
      lastTouchEnded = CACurrentMediaTime()
      state = .failed
      onChange?()
    }
  }

  override func reset() {
    activeTouches = 0
  }

  override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool { false }
  override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool { false }
}
