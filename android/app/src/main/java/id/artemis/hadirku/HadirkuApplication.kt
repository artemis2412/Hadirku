package id.artemis.hadirku

import android.app.Application
import id.artemis.hadirku.data.SupabaseProvider

class HadirkuApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SupabaseProvider.initialize()
    }
}
