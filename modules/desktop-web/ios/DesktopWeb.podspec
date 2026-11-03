Pod::Spec.new do |s|
  s.name           = 'DesktopWeb'
  s.version        = '1.0.0'
  s.summary        = 'WKWebView that always requests and shows the desktop version of websites.'
  s.description    = s.summary
  s.author         = 'Dave browz'
  s.homepage       = 'https://github.com/Bluecollarmedia/Desktop-browser'
  s.license        = 'MIT'
  s.platforms      = { :ios => '26.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.swift_version  = '5.9'
  s.source_files   = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.frameworks     = 'WebKit'
end
