# Dave browz

A simple iPhone browser that always opens the real desktop version of websites.

Built with Expo (SDK 58) and a small Swift module around Apple's WKWebView. iOS 26 or later.

## How desktop browsing works

Every tab is a `WKWebView` with `WKWebpagePreferences.preferredContentMode = .desktop`, set as the
default and again on every navigation. This is the same switch Safari's "Request Desktop Website"
uses. WebKit then:

- sends the Mac Safari identity (we also append `Version/x Safari/605.1.15`, as Safari does, so
  the identity doesn't end in `Mobile/…`),
- ignores the mobile `<meta name="viewport">` hints sites give phones,
- lays the page out at desktop width.

Nothing is faked: no CSS changes and no page scaling tricks. If a site has no desktop version, you
see whatever it sends.

## Zoom

Zoom is the web view's own visual zoom (the same thing pinching does), so it never changes the
layout or brings back a mobile layout.

- Every new page opens fitted: the full desktop width across the screen. That is "100%".
- Pinch, double-tap or the Settings buttons change it. Once you zoom a page yourself, the app
  never changes it back on its own.
- Pages on the same website keep your zoom. A different website starts at 100% again.
- Rotating re-fits the page unless you've zoomed it.

## Layout

```
modules/desktop-web/ios/   Swift: the desktop web view, zoom logic, alerts, new-window links
App.tsx                    Tabs (each tab keeps its live page, so switching never reloads)
src/Toolbar.tsx            Back, forward, address bar with reload, tabs, settings
src/SettingsSheet.tsx      Zoom, desktop mode (always on), search engine, clear website data
src/TabsSheet.tsx          Tab switcher
```

## Checks

- `npm run typecheck`
- `.github/workflows/simulator-test.yml` builds the app for the iPhone Simulator on a GitHub Mac,
  opens several popular sites, and saves screenshots plus what each page reports (browser identity,
  layout width, zoom) to `test-results/`.

## Building for TestFlight

`.github/workflows/eas-build.yml` builds on Expo and uploads to TestFlight. It needs an `EXPO_TOKEN`
repo secret, and `submit.production.ios.ascAppId` in `eas.json` once the App Store Connect app exists.
The very first build of a new app has to be run once from a computer, because Apple asks for a sign-in
to create the app's signing profile:

```
npx eas-cli@latest build -p ios --profile production --auto-submit
```
