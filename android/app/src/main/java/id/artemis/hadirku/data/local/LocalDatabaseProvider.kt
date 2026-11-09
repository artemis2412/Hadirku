package id.artemis.hadirku.data.local

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

private val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""CREATE TABLE IF NOT EXISTS local_units (
            id TEXT NOT NULL PRIMARY KEY,
            organizationId TEXT NOT NULL,
            name TEXT NOT NULL,
            unitType TEXT NOT NULL,
            parentUnitId TEXT,
            isActive INTEGER NOT NULL,
            updatedAt TEXT NOT NULL
        )""")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_local_units_organizationId ON local_units(organizationId)")
        db.execSQL("""CREATE TABLE IF NOT EXISTS local_statuses (
            id TEXT NOT NULL PRIMARY KEY,
            organizationId TEXT NOT NULL,
            label TEXT NOT NULL,
            code TEXT NOT NULL,
            isPresent INTEGER NOT NULL,
            isExcused INTEGER NOT NULL,
            sortOrder INTEGER NOT NULL,
            isActive INTEGER NOT NULL,
            updatedAt TEXT NOT NULL
        )""")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_local_statuses_organizationId ON local_statuses(organizationId)")
        db.execSQL("CREATE INDEX IF NOT EXISTS index_local_statuses_organizationId_sortOrder ON local_statuses(organizationId, sortOrder)")
    }
}

object LocalDatabaseProvider {
    @Volatile
    private var instance: HadirkuDatabase? = null

    fun get(context: Context): HadirkuDatabase =
        instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                HadirkuDatabase::class.java,
                "hadirku-local.db",
            ).addMigrations(MIGRATION_1_2).build().also { instance = it }
        }
}
