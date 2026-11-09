package id.artemis.hadirku.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import id.artemis.hadirku.BuildConfig
import id.artemis.hadirku.HadirkuApplication
import id.artemis.hadirku.data.SupabaseProvider
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.post
import io.ktor.client.request.header
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * Pushes pending attendance records using the signed-in user's JWT.
 * RLS remains the authority for tenant access; the app never uses a service-role key.
 */
class AttendanceSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val organizationId = inputData.getString(KEY_ORGANIZATION_ID)
            ?.takeIf(String::isNotBlank) ?: return@withContext Result.failure()

        if (!SupabaseProvider.isConfigured) return@withContext Result.failure()

        val session = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session ?: return@withContext Result.retry()
        val accessToken = session.accessToken
        if (accessToken.isBlank()) return@withContext Result.retry()

        val app = applicationContext as HadirkuApplication
        val dao = app.localDatabase.attendanceDao()
        val pending = dao.pendingOperations(organizationId)
        if (pending.isEmpty()) return@withContext Result.success()

        val http = HttpClient(Android) {
            install(HttpTimeout) {
                requestTimeoutMillis = 30_000
                connectTimeoutMillis = 15_000
                socketTimeoutMillis = 30_000
            }
        }

        try {
            for (operation in pending) {
                if (operation.entityType != "attendance_record" || operation.operation != "upsert") {
                    dao.recordSyncFailure(operation.id, "Unsupported offline operation")
                    continue
                }

                val payload = runCatching { JSONObject(operation.payloadJson) }.getOrNull()
                if (payload == null || payload.optString("organization_id") != organizationId) {
                    dao.recordSyncFailure(operation.id, "Invalid payload or organization mismatch")
                    continue
                }

                val recordId = payload.optString("id")
                if (recordId.isBlank()) {
                    dao.recordSyncFailure(operation.id, "Attendance record ID is missing")
                    continue
                }

                val response = runCatching {
                    http.post("${BuildConfig.SUPABASE_URL}/rest/v1/attendance_records?on_conflict=session_id,person_id") {
                        header(HttpHeaders.Authorization, "Bearer $accessToken")
                        header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                        header("Prefer", "resolution=merge-duplicates,return=minimal")
                        contentType(ContentType.Application.Json)
                        setBody(payload.toString())
                    }
                }.getOrElse { error ->
                    dao.recordSyncFailure(operation.id, error.message?.take(500) ?: "Network error")
                    return@withContext Result.retry()
                }

                if (response.status.value in 200..299) {
                    // Only remove the exact payload that was sent. If the user edited this
                    // attendance while the request was in flight, keep the newer outbox row.
                    val removed = dao.removeSyncedOperation(operation.id, operation.payloadJson)
                    if (removed > 0) {
                        dao.markRecordSynced(recordId, operation.id)
                    } else {
                        return@withContext Result.retry()
                    }
                } else {
                    val detail = response.bodyAsText().take(500)
                    dao.recordSyncFailure(operation.id, "HTTP ${response.status.value}: $detail")
                    if (response.status.value == 401 || response.status.value == 403 ||
                        response.status.value == 408 || response.status.value == 429 ||
                        response.status.value >= 500
                    ) {
                        return@withContext Result.retry()
                    }
                }
            }
            Result.success()
        } finally {
            http.close()
        }
    }

    companion object {
        const val KEY_ORGANIZATION_ID = "organization_id"
    }
}
