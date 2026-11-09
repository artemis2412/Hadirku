package id.artemis.hadirku

import android.app.Application
import id.artemis.hadirku.data.SupabaseProvider
import id.artemis.hadirku.data.local.HadirkuDatabase
import id.artemis.hadirku.data.local.LocalDatabaseProvider

class HadirkuApplication : Application() {
    val localDatabase: HadirkuDatabase by lazy { LocalDatabaseProvider.get(this) }
    override fun onCreate() {
        super.onCreate()
        SupabaseProvider.initialize()
    }
}
