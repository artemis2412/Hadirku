package id.artemis.hadirku.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface LocalAttendanceDao {
    @Query("SELECT * FROM local_people WHERE organizationId = :organizationId AND isActive = 1 ORDER BY fullName")
    fun observeActivePeople(organizationId: String): Flow<List<LocalPersonEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertPeople(people: List<LocalPersonEntity>)

    @Query("SELECT * FROM local_attendance_sessions WHERE organizationId = :organizationId ORDER BY sessionDate DESC")
    fun observeSessions(organizationId: String): Flow<List<LocalAttendanceSessionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSessions(sessions: List<LocalAttendanceSessionEntity>)

    @Query("SELECT * FROM local_attendance_records WHERE sessionId = :sessionId ORDER BY markedAt")
    fun observeRecords(sessionId: String): Flow<List<LocalAttendanceRecordEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAttendanceRecord(record: LocalAttendanceRecordEntity)

    @Transaction
    suspend fun saveAttendanceAndQueue(record: LocalAttendanceRecordEntity, operation: SyncOutboxEntity) {
        upsertAttendanceRecord(record)
        enqueue(operation)
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAttendanceRecords(records: List<LocalAttendanceRecordEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(operation: SyncOutboxEntity)

    @Query("SELECT * FROM sync_outbox WHERE organizationId = :organizationId ORDER BY createdAt, id")
    suspend fun pendingOperations(organizationId: String): List<SyncOutboxEntity>

    @Query("UPDATE sync_outbox SET attemptCount = attemptCount + 1, lastError = :error WHERE id = :id")
    suspend fun recordSyncFailure(id: String, error: String?)

    @Query("UPDATE local_attendance_records SET syncState = 'synced' WHERE id = :recordId AND NOT EXISTS (SELECT 1 FROM sync_outbox WHERE id = :outboxId)")
    suspend fun markRecordSynced(recordId: String, outboxId: String)

    @Query("DELETE FROM sync_outbox WHERE id = :id AND payloadJson = :sentPayload")
    suspend fun removeSyncedOperation(id: String, sentPayload: String): Int

    @Query("SELECT COUNT(*) FROM sync_outbox WHERE organizationId = :organizationId")
    fun observePendingCount(organizationId: String): Flow<Int>
}
