package com.nebuza.boostyourcountry

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.content.SharedPreferences
import java.util.Locale

class MainActivity : Activity() {
    private val bg = Color.rgb(8, 13, 29)
    private val panel = Color.rgb(20, 29, 57)
    private val cyan = Color.rgb(65, 224, 255)
    private val gold = Color.rgb(255, 218, 67)
    private val white = Color.WHITE
    private val gameUrl = "https://chatverse-live.onrender.com/public/index.html"
    private lateinit var prefs: SharedPreferences
    private var webView: WebView? = null

    data class Country(val code: String, val name: String, val flag: String)
    private val countries: List<Country> by lazy {
        Locale.getISOCountries().sorted().take(195).map { code ->
            val locale = Locale("", code)
            Country(code, locale.getDisplayCountry(Locale.ENGLISH).ifBlank { code }, flagFor(code))
        }.sortedBy { it.name }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("country_battle", MODE_PRIVATE)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        showHome()
    }

    private fun flagFor(code: String): String {
        val upper = code.uppercase(Locale.ROOT)
        if (upper.length != 2) return "🌍"
        return String(Character.toChars(0x1F1E6 + upper[0] - 'A')) +
            String(Character.toChars(0x1F1E6 + upper[1] - 'A'))
    }

    private fun points(country: Country) = prefs.getInt("score_" + country.code, 0)
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun text(value: String, size: Float, color: Int = white, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }

    private fun button(label: String, color: Int = cyan, action: () -> Unit) =
        Button(this).apply {
            text = label
            setTextColor(Color.rgb(8, 13, 29))
            setBackgroundColor(color)
            textSize = 14f
            isAllCaps = false
            setOnClickListener { action() }
        }

    private fun basePage(): LinearLayout =
        LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
            setPadding(dp(14), dp(12), dp(14), dp(16))
        }

    private fun showHome() {
        webView?.destroy()
        webView = null
        val root = basePage()
        root.addView(text("🌍 BOOST YOUR COUNTRY", 25f, gold, true))
        root.addView(text("195 COUNTRY FLAG BATTLE", 16f, cyan, true))
        root.addView(text("Choose a mode to begin", 14f, white))
        root.addView(button("🎮  OFFLINE BATTLE", gold) { showOfflineGame() },
            LinearLayout.LayoutParams(-1, dp(54)).apply { setMargins(0, dp(10), 0, dp(8)) })
        root.addView(button("🔴  YOUTUBE LIVE BATTLE", cyan) { showLiveMode() },
            LinearLayout.LayoutParams(-1, dp(54)).apply { setMargins(0, 0, 0, dp(12)) })
        root.addView(text("Offline mode saves scores on this phone. Live mode needs internet, YouTube API access, and an active livestream with chat enabled.", 13f, Color.LTGRAY))
        root.addView(text("🏆 TOP 3 COUNTRIES", 18f, gold, true))
        countries.sortedByDescending { points(it) }.take(3).forEachIndexed { i, c ->
            root.addView(text("${i + 1}. ${c.flag} ${c.name} — ${points(c)} points", 16f))
        }
        setContentView(root)
    }

    private fun showOfflineGame() {
        val root = basePage()
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        top.addView(text("COUNTRY BATTLE", 21f, gold, true), LinearLayout.LayoutParams(0, -2, 1f))
        top.addView(button("HOME", cyan) { showHome() })
        root.addView(top)
        root.addView(text("Tap a country to give it +100 points. Scores are saved on this device.", 13f, Color.LTGRAY))
        root.addView(text("🏆 TOP 3", 17f, gold, true))
        countries.sortedByDescending { points(it) }.take(3).forEachIndexed { i, c ->
            root.addView(text("${i + 1}. ${c.flag} ${c.name} · ${points(c)}", 15f))
        }
        root.addView(text("ALL COUNTRIES", 18f, cyan, true))
        val scroll = ScrollView(this)
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        countries.forEach { c ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(8), dp(3), dp(8), dp(3))
                setBackgroundColor(panel)
            }
            row.addView(text("${c.flag}  ${c.name}", 15f), LinearLayout.LayoutParams(0, -2, 1f))
            row.addView(button("+100  ·  ${points(c)}", gold) {
                prefs.edit().putInt("score_" + c.code, points(c) + 100).apply()
                showOfflineGame()
            })
            list.addView(row, LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(3), 0, dp(3)) })
        }
        scroll.addView(list)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(button("RESET OFFLINE SCORES", Color.LTGRAY) {
            prefs.edit().clear().apply()
            showOfflineGame()
        }, LinearLayout.LayoutParams(-1, dp(48)).apply { setMargins(0, dp(8), 0, 0) })
        setContentView(root)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun showLiveMode() {
        val wv = WebView(this)
        webView = wv
        wv.setBackgroundColor(bg)
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true
        wv.settings.mediaPlaybackRequiresUserGesture = false
        wv.settings.allowFileAccess = false
        wv.settings.allowContentAccess = false
        wv.webChromeClient = WebChromeClient()
        wv.webViewClient = WebViewClient()
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(bg) }
        root.addView(button("← BACK TO OFFLINE / HOME", gold) { showHome() }, LinearLayout.LayoutParams(-1, dp(48)))
        root.addView(wv, LinearLayout.LayoutParams(-1, 0, 1f))
        setContentView(root)
        wv.loadUrl(gameUrl)
    }

    @Deprecated("Deprecated in Android API")
    override fun onBackPressed() {
        val wv = webView
        if (wv != null && wv.canGoBack()) wv.goBack() else showHome()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}
