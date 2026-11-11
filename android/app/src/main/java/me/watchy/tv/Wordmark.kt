package me.watchy.tv

import android.content.Context
import androidx.core.content.res.ResourcesCompat

object Wordmark {
    fun view(ctx: Context, sizeSp: Float) = ctx.text("watchy", sizeSp).apply {
        typeface = ResourcesCompat.getFont(ctx, R.font.anxler)
    }
}
