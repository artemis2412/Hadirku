package id.artemis.hadirku.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "local_people",
    indices = [Index("organizationId"), Index("unitId")]
)
data class LocalPersonEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val fullName: String,
    val memberCode: String? = null,
    val unitId: String? = null,
    val isActive: Boolean = true,
    val updatedAt: String,
)

@Entity(
    tableName = "local_attendance_sessions",
    indices = [Index("organizationId"), Index("sessionDate")]
)
data class LocalAttendanceSessionEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val title: String,
    val sessionDate: String,
    val unitId: String? = null,
    val state: String = "open",
    val updatedAt: String,
)

@Entity(
    tableName = "local_attendance_records",
    indices = [
        Index("organizationId"),
        Index("sessionId"),
        Index(value = ["sessionId", "personId"], unique = true),
    ]
)
data class LocalAttendanceRecordEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val sessionId: String,
    val personId: String,
    val statusId: String,
    val note: String? = null,
    val markedAt: String,
    val syncState: String = "pending",
)

@Entity(
    tableName = "sync_outbox",
    indices = [Index("organizationId"), Index("createdAt")]
)
data class SyncOutboxEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val entityType: String,
    val operation: String,
    val payloadJson: String,
    val createdAt: Long,
    val attemptCount: Int = 0,
    val lastError: String? = null,
)
