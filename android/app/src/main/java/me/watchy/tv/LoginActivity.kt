package me.watchy.tv

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val api = api

        fun field(hint: String, value: String, type: Int) = EditText(this).apply {
            this.hint = hint
            setText(value)
            inputType = type
            isSingleLine = true
            setTextColor(color(R.color.text))
            setHintTextColor(color(R.color.text_faint))
            textSize = 18f
            setBackgroundResource(R.drawable.input_bg)
            setPadding(dp(18), dp(14), dp(18), dp(14))
            imeOptions = EditorInfo.IME_ACTION_NEXT or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        }

        val server = field("Server (https://…)", api.server, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI)
        val user = field("Username", api.username, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS)
        val pass = field("Password", "", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD).apply {
            imeOptions = EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        }
        val error = text("", 15f, R.color.live).apply { gravity = Gravity.CENTER }
        val submit = Button(this).apply {
            text = "Sign in"
            isAllCaps = false
            textSize = 18f
            setTextColor(color(R.color.text))
            setBackgroundResource(R.drawable.button_bg)
            stateListAnimator = null
        }

        fun go() {
            val s = server.text.toString().trim().let { if (it.isNotEmpty() && !it.startsWith("http")) "https://$it" else it }
            if (s.isEmpty()) { error.text = "Enter the Watchy server address."; server.requestFocus(); return }
            if (user.text.isBlank() || pass.text.isEmpty()) { error.text = "Enter your username and password."; return }
            api.server = s
            api.username = user.text.toString().trim()
            submit.isEnabled = false
            submit.text = "Signing in…"
            error.text = ""
            lifecycleScope.launch {
                try {
                    api.login(api.username, pass.text.toString())
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                } catch (e: Exception) {
                    error.text = when (e) {
                        is ApiException -> e.message
                        else -> "Can't reach the server. Check the address and network."
                    }
                    submit.isEnabled = true
                    submit.text = "Sign in"
                    pass.requestFocus()
                }
            }
        }
        submit.setOnClickListener { go() }
        pass.setOnEditorActionListener { _, a, _ -> if (a == EditorInfo.IME_ACTION_DONE) { go(); true } else false }

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(40), dp(36), dp(40), dp(36))
            setBackgroundResource(R.drawable.panel_bg)
            addView(Wordmark.view(this@LoginActivity, 40f), lp().apply { bottomMargin = dp(6) })
            addView(text("Sign in to continue", 16f, R.color.text_dim), lp().apply { bottomMargin = dp(28) })
            val w = dp(420)
            for (v in listOf(server, user, pass)) addView(v, lp(w).apply { bottomMargin = dp(14) })
            addView(error, lp(w).apply { bottomMargin = dp(10) })
            addView(submit, lp(w, dp(56)))
        }
        setContentView(FrameLayout(this).apply {
            addView(col, FrameLayout.LayoutParams(WRAP, WRAP, Gravity.CENTER))
        })
        (if (api.server.isEmpty()) server else if (api.username.isEmpty()) user else pass).requestFocus()
    }
}
