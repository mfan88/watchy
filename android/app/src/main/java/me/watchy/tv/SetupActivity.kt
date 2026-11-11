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

/** Sign in with a Watchy account; the server hands back the stream key. */
class SetupActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val api = api
        fun field(hint: String, type: Int) = EditText(this).apply {
            this.hint = hint
            inputType = type
            isSingleLine = true
            setTextColor(color(R.color.text))
            setHintTextColor(color(R.color.text_faint))
            textSize = 18f
            setBackgroundResource(R.drawable.input_bg)
            setPadding(dp(18), dp(14), dp(18), dp(14))
            imeOptions = EditorInfo.IME_ACTION_NEXT or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        }
        val user = field("Username", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS).apply { setText(api.username) }
        val key = field("Password", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD).apply {
            imeOptions = EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        }
        val error = text(intent.getStringExtra("error") ?: "", 15f, R.color.live).apply { gravity = Gravity.CENTER }
        val submit = Button(this).apply {
            text = "Sign in"
            isAllCaps = false
            textSize = 18f
            setTextColor(color(R.color.text))
            setBackgroundResource(R.drawable.button_bg)
            stateListAnimator = null
        }

        fun go() {
            if (user.text.isBlank() || key.text.isEmpty()) { error.text = "Enter your username and password."; return }
            submit.isEnabled = false
            submit.text = "Signing in…"
            error.text = ""
            lifecycleScope.launch {
                try {
                    api.login(user.text.toString().trim(), key.text.toString())
                    startActivity(Intent(this@SetupActivity, MainActivity::class.java))
                    finish()
                } catch (e: Exception) {
                    error.text = e.message ?: "Sign-in failed"
                    submit.isEnabled = true
                    submit.text = "Sign in"
                    key.requestFocus()
                }
            }
        }
        submit.setOnClickListener { go() }
        key.setOnEditorActionListener { _, a, _ -> if (a == EditorInfo.IME_ACTION_DONE) { go(); true } else false }

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(40), dp(36), dp(40), dp(36))
            setBackgroundResource(R.drawable.panel_bg)
            addView(Wordmark.view(this@SetupActivity, 40f), lp().apply { bottomMargin = dp(6) })
            addView(text("Sign in with your Watchy account", 16f, R.color.text_dim), lp().apply { bottomMargin = dp(28) })
            val w = dp(460)
            addView(user, lp(w).apply { bottomMargin = dp(14) })
            addView(key, lp(w).apply { bottomMargin = dp(14) })
            addView(error, lp(w).apply { bottomMargin = dp(10) })
            addView(submit, lp(w, dp(56)))
        }
        setContentView(FrameLayout(this).apply { addView(col, FrameLayout.LayoutParams(WRAP, WRAP, Gravity.CENTER)) })
        (if (api.username.isEmpty()) user else key).requestFocus()
    }
}
