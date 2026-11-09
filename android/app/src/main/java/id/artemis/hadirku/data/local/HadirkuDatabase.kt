package id.artemis.hadirku.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        LocalPersonEntity::class,
        LocalAttendanceSessionEntity::class,
        LocalAttendanceRecordEntity::class,
        SyncOutboxEntity::class,
        LocalUnitEntity::class,
        LocalAttendanceStatusEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class HadirkuDatabase : RoomDatabase() {
    abstract fun attendanceDao(): LocalAttendanceDao
}
