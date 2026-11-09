package id.artemis.hadirku

import android.app.Application
import id.artemis.hadirku.data.SupabaseProvider
import id.artemis.hadirku.data.local.HadirkuDatabase
import id.artemis.hadirku.data.local.LocalDatabaseProvider
import id.artemis.hadirku.data.local.LocalAttendanceRepository

class HadirkuApplication : Application() {
    val localDatabase: HadirkuDatabase by lazy { LocalDatabaseProvider.get(this) }
    val attendanceRepository: LocalAttendanceRepository by lazy {
        LocalAttendanceRepository(localDatabase.attendanceDao())
    }
    override fun onCreate() {
        super.onCreate()
        SupabaseProvider.initialize()
    }
}
