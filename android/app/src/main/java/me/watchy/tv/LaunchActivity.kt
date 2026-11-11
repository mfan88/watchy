package me.watchy.tv

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class LaunchActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(Intent(this, if (api.signedIn) MainActivity::class.java else SetupActivity::class.java))
        finish()
    }
}
