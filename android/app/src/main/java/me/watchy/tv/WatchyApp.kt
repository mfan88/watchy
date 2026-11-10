package me.watchy.tv

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.SvgDecoder

class WatchyApp : Application(), ImageLoaderFactory {
    lateinit var api: Api
        private set

    override fun onCreate() {
        super.onCreate()
        api = Api(this)
    }

    // Images live behind the same login, so Coil shares the authenticated client.
    override fun newImageLoader() = ImageLoader.Builder(this)
        .okHttpClient(api.http)
        .components { add(SvgDecoder.Factory()) }
        .crossfade(true)
        .build()
}

val android.content.Context.api get() = (applicationContext as WatchyApp).api
