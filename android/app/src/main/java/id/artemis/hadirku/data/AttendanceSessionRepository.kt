package id.artemis.hadirku.data

import id.artemis.hadirku.BuildConfig
import id.artemis.hadirku.data.local.LocalAttendanceDao
import id.artemis.hadirku.data.local.LocalAttendanceSessionEntity
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

class AttendanceSessionRepository(private val dao: LocalAttendanceDao) {
    suspend fun refresh(organizationId: String) = withContext(Dispatchers.IO) {
        val session = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session ?: throw IllegalStateException("Sesi login berakhir.")
        val http = HttpClient(Android)
        try {
            val response = http.get("${BuildConfig.SUPABASE_URL}/rest/v1/attendance_sessions?select=id,organization_id,title,attendance_date,unit_id,session_status,updated_at&organization_id=eq.$organizationId&order=attendance_date.desc&limit=100") {
                header(HttpHeaders.Authorization, "Bearer ${session.accessToken}")
                header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            }
            if (response.status.value !in 200..299) throw IllegalStateException("Gagal memuat sesi (HTTP ${response.status.value}).")
            val rows = JSONArray(response.bodyAsText())
            val sessions = buildList {
                for (i in 0 until rows.length()) {
                    val row = rows.optJSONObject(i) ?: continue
                    add(LocalAttendanceSessionEntity(
                        id = row.getString("id"),
                        organizationId = row.getString("organization_id"),
                        title = row.getString("title"),
                        sessionDate = row.getString("attendance_date"),
                        unitId = row.optString("unit_id").takeIf { it.isNotBlank() && it != "null" },
                        state = row.optString("session_status", "open"),
                        updatedAt = row.optString("updated_at"),
                    ))
                }
            }
            dao.upsertSessions(sessions)
        } finally { http.close() }
    }

    suspend fun create(organizationId: String, title: String): LocalAttendanceSessionEntity = withContext(Dispatchers.IO) {
        require(title.isNotBlank()) { "Isi nama sesi presensi." }
        val session = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session ?: throw IllegalStateException("Sesi login berakhir.")
        val userId = session.user?.id ?: throw IllegalStateException("Identitas akun tidak tersedia.")
        val http = HttpClient(Android)
        try {
            val body = JSONObject()
                .put("organization_id", organizationId)
                .put("created_by", userId)
                .put("title", title.trim())
                .put("attendance_date", LocalDate.now().toString())
                .put("session_status", "open")
            val response = http.post("${BuildConfig.SUPABASE_URL}/rest/v1/attendance_sessions?select=id,organization_id,title,attendance_date,unit_id,session_status,updated_at") {
                header(HttpHeaders.Authorization, "Bearer ${session.accessToken}")
                header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                header(HttpHeaders.Prefer, "return=representation")
                contentType(ContentType.Application.Json)
                setBody(body.toString())
            }
            if (response.status.value !in 200..299) throw IllegalStateException("Gagal membuat sesi (HTTP ${response.status.value}): ${response.bodyAsText().take(180)}")
            val row = JSONArray(response.bodyAsText()).getJSONObject(0)
            LocalAttendanceSessionEntity(
                id = row.getString("id"),
                organizationId = row.getString("organization_id"),
                title = row.getString("title"),
                sessionDate = row.getString("attendance_date"),
                unitId = row.optString("unit_id").takeIf { it.isNotBlank() && it != "null" },
                state = row.optString("session_status", "open"),
                updatedAt = row.optString("updated_at"),
            ).also { dao.upsertSessions(listOf(it)) }
        } finally { http.close() }
    }
}
