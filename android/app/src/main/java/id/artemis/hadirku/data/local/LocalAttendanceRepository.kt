package id.artemis.hadirku.data.local

import org.json.JSONObject
import java.time.Instant
import java.util.UUID

/**
 * Stores attendance locally first, then adds an idempotent operation to the sync outbox.
 * The transaction guarantees that a local attendance mark is never saved without its
 * corresponding pending sync operation.
 */
class LocalAttendanceRepository(
    private val dao: LocalAttendanceDao,
) {
    suspend fun markAttendance(
        organizationId: String,
        sessionId: String,
        personId: String,
        statusId: String,
        markedBy: String,
        note: String? = null,
    ): String {
        require(organizationId.isNotBlank()) { "Organization is required" }
        require(sessionId.isNotBlank()) { "Attendance session is required" }
        require(personId.isNotBlank()) { "Member is required" }
        require(statusId.isNotBlank()) { "Attendance status is required" }
        require(markedBy.isNotBlank()) { "Authenticated user is required to mark attendance" }

        // Stable per organization/session/member: editing a mark updates the same local/server row.
        val recordId = UUID.nameUUIDFromBytes("$organizationId:$sessionId:$personId".toByteArray()).toString()
        val timestamp = Instant.now().toString()
        val payload = JSONObject()
            .put("id", recordId)
            .put("organization_id", organizationId)
            .put("session_id", sessionId)
            .put("person_id", personId)
            .put("status_id", statusId)
            .put("marked_by", markedBy)
            .put("note", note)
            .put("marked_at", timestamp)
            .put("idempotency_key", recordId)
            .toString()

        val record = LocalAttendanceRecordEntity(
            id = recordId,
            organizationId = organizationId,
            sessionId = sessionId,
            personId = personId,
            statusId = statusId,
            note = note,
            markedAt = timestamp,
            syncState = "pending",
        )
        val operation = SyncOutboxEntity(
            // Reuse the outbox identity so repeated offline edits collapse into the latest payload.
            id = UUID.nameUUIDFromBytes("attendance-outbox:$recordId".toByteArray()).toString(),
            organizationId = organizationId,
            entityType = "attendance_record",
            operation = "upsert",
            payloadJson = payload,
            createdAt = System.currentTimeMillis(),
        )

        dao.saveAttendanceAndQueue(record, operation)
        return recordId
    }
}
