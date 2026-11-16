package org.likesyou.mallorca

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private val networkExecutor = Executors.newSingleThreadExecutor()
    private lateinit var apiUserAgent: String
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.setGeolocationEnabled(true)
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = true
        apiUserAgent = webView.settings.userAgentString

        // La API se consulta desde Android, sin depender de CORS del WebView.
        webView.addJavascriptInterface(AndroidApiBridge(), "MLYAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
                    ?: super.shouldInterceptRequest(view, request)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                val fineGranted = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
                    PackageManager.PERMISSION_GRANTED
                val coarseGranted = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
                    PackageManager.PERMISSION_GRANTED

                if (fineGranted || coarseGranted) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    requestPermissions(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        ),
                        LOCATION_PERMISSION_REQUEST
                    )
                }
            }
        }

        setContentView(webView)
        if (savedInstanceState == null) {
            webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private inner class AndroidApiBridge {
        @JavascriptInterface
        fun get(rawUrl: String, requestId: Int) {
            networkExecutor.execute {
                var status = 0
                var body = ""
                var error = ""
                var connection: HttpURLConnection? = null
                try {
                    val url = URL(rawUrl)
                    if (url.protocol != "https" ||
                        url.host != "mallorca.likesyou.org" ||
                        !(url.path.startsWith("/backend/api/")) ||
                        (url.port != -1 && url.port != 443)
                    ) {
                        throw SecurityException("URL no permitida para la API.")
                    }

                    connection = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 15000
                        readTimeout = 20000
                        instanceFollowRedirects = true
                        setRequestProperty("Accept", "application/json")
                        setRequestProperty("User-Agent", apiUserAgent)
                        setRequestProperty("Referer", "https://mallorca.likesyou.org/")
                        setRequestProperty("Cache-Control", "no-cache")
                    }
                    status = connection.responseCode
                    val stream = if (status >= 400) connection.errorStream else connection.inputStream
                    body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                } catch (exception: Exception) {
                    error = exception.message ?: exception.javaClass.simpleName
                } finally {
                    connection?.disconnect()
                }

                val safeBody = JSONObject.quote(body)
                val safeError = JSONObject.quote(error)
                val script = "window.MLYNativeApi && window.MLYNativeApi._complete(" +
                    requestId + "," + status + "," + safeBody + "," + safeError + ");"
                runOnUiThread {
                    if (this@MainActivity::webView.isInitialized) {
                        webView.evaluateJavascript(script, null)
                    }
                }
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        networkExecutor.shutdownNow()
        if (this::webView.isInitialized) webView.removeJavascriptInterface("MLYAndroid")
        super.onDestroy()
    }

    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    @Deprecated("Deprecated in Android API 23; retained for compatibility with this Activity")
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            pendingGeoOrigin?.let { origin -> pendingGeoCallback?.invoke(origin, granted, false) }
            pendingGeoCallback = null
            pendingGeoOrigin = null
        }
    }

    companion object {
        private const val LOCATION_PERMISSION_REQUEST = 4102
    }
}
