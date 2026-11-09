package id.artemis.hadirku.data.local

import android.content.Context
import androidx.room.Room

object LocalDatabaseProvider {
    @Volatile
    private var instance: HadirkuDatabase? = null

    fun get(context: Context): HadirkuDatabase =
        instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                HadirkuDatabase::class.java,
                "hadirku-local.db",
            ).build().also { instance = it }
        }
}
