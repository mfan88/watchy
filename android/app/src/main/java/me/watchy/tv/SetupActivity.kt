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

/** Only shown when the APK was built without the access key: asks for it once. */
class SetupActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val api = api
        val key = EditText(this).apply {
            hint = "Access key"
            setText(api.secret)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            isSingleLine = true
            setTextColor(color(R.color.text))
            setHintTextColor(color(R.color.text_faint))
            textSize = 18f
            setBackgroundResource(R.drawable.input_bg)
            setPadding(dp(18), dp(14), dp(18), dp(14))
            imeOptions = EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        }
        val error = text(intent.getStringExtra("error") ?: "", 15f, R.color.live).apply { gravity = Gravity.CENTER }
        val submit = Button(this).apply {
            text = "Continue"
            isAllCaps = false
            textSize = 18f
            setTextColor(color(R.color.text))
            setBackgroundResource(R.drawable.button_bg)
            stateListAnimator = null
        }

        fun go() {
            val v = key.text.toString().trim().trim('/')
            if (v.isEmpty()) { error.text = "Enter the access key."; return }
            api.secret = v
            submit.isEnabled = false
            submit.text = "Checking…"
            error.text = ""
            lifecycleScope.launch {
                try {
                    api.channels()
                    startActivity(Intent(this@SetupActivity, MainActivity::class.java))
                    finish()
                } catch (e: Exception) {
                    api.forgetSecret()
                    error.text = (e as? ApiException)?.message ?: "Can't reach the stream server. Check the network."
                    submit.isEnabled = true
                    submit.text = "Continue"
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
            addView(text("Enter the stream server access key (HTV_SECRET)", 16f, R.color.text_dim), lp().apply { bottomMargin = dp(28) })
            val w = dp(460)
            addView(key, lp(w).apply { bottomMargin = dp(14) })
            addView(error, lp(w).apply { bottomMargin = dp(10) })
            addView(submit, lp(w, dp(56)))
        }
        setContentView(FrameLayout(this).apply { addView(col, FrameLayout.LayoutParams(WRAP, WRAP, Gravity.CENTER)) })
        key.requestFocus()
    }
}
