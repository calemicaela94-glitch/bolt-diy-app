import { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Pressable, BackHandler, Platform } from 'react-native';
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

// Read URL from app.json extra config, fallback to hardcoded
const BOLT_DIY_URL =
  (Constants.expoConfig?.extra as any)?.boltDiyUrl ??
  'https://scaling-telegram-6v9g79xp9jxxc4g5g-5173.app.github.dev/';

export default function BoltDIYScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const canGoBackRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    canGoBackRef.current = navState.canGoBack;
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setLoadError(false);
  }, []);

  const handleLoadError = useCallback(() => {
    setIsLoading(false);
    setLoadError(true);
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'console') {
        console.log(`[WebView ${data.level}]`, data.message);
      }
    } catch (e) {
      console.log('[WebView]', event.nativeEvent.data);
    }
  }, []);

  const handleReload = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    webViewRef.current?.reload();
  }, []);

  // Register back handler for Android with proper cleanup
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webViewRef}
        source={{ uri: BOLT_DIY_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        webviewDebuggingEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={handleLoadEnd}
        onError={handleLoadError}
        onHttpError={handleLoadError}
        onMessage={handleMessage}
        injectedJavaScript={`
          (function() {
            var originalLog = console.log;
            var originalWarn = console.warn;
            var originalError = console.error;
            function send(level, args) {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'console',
                  level: level,
                  message: Array.from(args).map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ')
                }));
              } catch(e) {}
            }
            console.log = function() { send('log', arguments); originalLog.apply(console, arguments); };
            console.warn = function() { send('warn', arguments); originalWarn.apply(console, arguments); };
            console.error = function() { send('error', arguments); originalError.apply(console, arguments); };
            window.addEventListener('error', function(e) {
              send('error', ['Uncaught: ' + e.message + ' at ' + e.filename + ':' + e.lineno]);
            });
            window.addEventListener('unhandledrejection', function(e) {
              send('error', ['Unhandled promise rejection: ' + (e.reason ? e.reason.message || e.reason : 'unknown')]);
            });
          })();
          true;
        `}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={styles.loadingText}>Loading Bolt.diy...</Text>
          </View>
        )}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#208AEF" />
          <Text style={styles.loadingText}>Loading Bolt.diy...</Text>
        </View>
      )}

      {loadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>
            Could not connect to Bolt.diy server.{'\n'}
            Make sure the dev server is running.
          </Text>
          <Text style={styles.errorUrl}>{BOLT_DIY_URL}</Text>
          <Pressable style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorUrl: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  retryButton: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
