package com.nebuza.boostyourcountry

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Color
import android.view.Gravity

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var root: LinearLayout
    private val gameUrl = "https://chatverse-live.onrender.com/public/index.html"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(8, 13, 29)
        window.navigationBarColor = Color.rgb(8, 13, 29)

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(8, 13, 29))
            gravity = Gravity.CENTER
        }
        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 13, 29))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    if (request?.isForMainFrame == true) showOfflineMessage()
                }
            }
        }
        root.addView(webView, LinearLayout.LayoutParams(-1, -1))
        setContentView(root)
        if (savedInstanceState == null) webView.loadUrl(gameUrl) else webView.restoreState(savedInstanceState)
    }

    private fun showOfflineMessage() {
        runOnUiThread {
            val message = TextView(this).apply {
                text = "BOOST YOUR COUNTRY\n\nInternet connection or game server is unavailable.\nPlease check your connection and try again."
                setTextColor(Color.WHITE)
                textSize = 18f
                gravity = Gravity.CENTER
                setPadding(28, 28, 28, 28)
            }
            val retry = Button(this).apply {
                text = "RETRY"
                setOnClickListener { setContentView(webView); webView.loadUrl(gameUrl) }
            }
            root.removeAllViews()
            root.addView(message, LinearLayout.LayoutParams(-1, 0, 1f))
            root.addView(retry)
            setContentView(root)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Android API")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
