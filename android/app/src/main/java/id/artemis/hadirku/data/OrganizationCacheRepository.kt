package id.artemis.hadirku.data

import id.artemis.hadirku.BuildConfig
import id.artemis.hadirku.data.local.LocalAttendanceDao
import id.artemis.hadirku.data.local.LocalAttendanceStatusEntity
import id.artemis.hadirku.data.local.LocalPersonEntity
import id.artemis.hadirku.data.local.LocalUnitEntity
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

data class OrganizationCacheResult(
    val peopleCount: Int,
    val unitCount: Int,
    val statusCount: Int,
)

class OrganizationCacheRepository(private val dao: LocalAttendanceDao) {
    suspend fun refresh(organizationId: String): OrganizationCacheResult = withContext(Dispatchers.IO) {
        require(organizationId.isNotBlank()) { "Pilih organisasi terlebih dahulu." }
        val session = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session ?: throw IllegalStateException("Sesi login berakhir. Silakan masuk kembali.")
        val token = session.accessToken
        require(token.isNotBlank()) { "Token login tidak tersedia." }

        val http = HttpClient(Android)
        try {
            suspend fun fetch(table: String, select: String): JSONArray {
                val response = http.get(
                    "${BuildConfig.SUPABASE_URL}/rest/v1/$table?select=$select&organization_id=eq.$organizationId&limit=1000"
                ) {
                    header(HttpHeaders.Authorization, "Bearer $token")
                    header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                }
                if (response.status.value !in 200..299) {
                    throw IllegalStateException("Gagal memuat $table (HTTP ${response.status.value}).")
                }
                return JSONArray(response.bodyAsText())
            }

            val peopleRows = fetch(
                "people",
                "id,organization_id,full_name,external_code,unit_id,is_active,updated_at"
            )
            val people = buildList {
                for (i in 0 until peopleRows.length()) {
                    val row = peopleRows.optJSONObject(i) ?: continue
                    add(LocalPersonEntity(
                        id = row.getString("id"),
                        organizationId = row.getString("organization_id"),
                        fullName = row.getString("full_name"),
                        memberCode = row.optString("external_code").takeIf { it.isNotBlank() && it != "null" },
                        unitId = row.optString("unit_id").takeIf { it.isNotBlank() && it != "null" },
                        isActive = row.optBoolean("is_active", true),
                        updatedAt = row.optString("updated_at"),
                    ))
                }
            }

            val unitRows = fetch(
                "organization_units",
                "id,organization_id,name,unit_type,parent_unit_id,is_active,updated_at"
            )
            val units = buildList {
                for (i in 0 until unitRows.length()) {
                    val row = unitRows.optJSONObject(i) ?: continue
                    add(LocalUnitEntity(
                        id = row.getString("id"),
                        organizationId = row.getString("organization_id"),
                        name = row.getString("name"),
                        unitType = row.optString("unit_type", "general"),
                        parentUnitId = row.optString("parent_unit_id").takeIf { it.isNotBlank() && it != "null" },
                        isActive = row.optBoolean("is_active", true),
                        updatedAt = row.optString("updated_at"),
                    ))
                }
            }

            val statusRows = fetch(
                "attendance_statuses",
                "id,organization_id,label,code,is_present,is_excused,sort_order,is_active,updated_at"
            )
            val statuses = buildList {
                for (i in 0 until statusRows.length()) {
                    val row = statusRows.optJSONObject(i) ?: continue
                    add(LocalAttendanceStatusEntity(
                        id = row.getString("id"),
                        organizationId = row.getString("organization_id"),
                        label = row.getString("label"),
                        code = row.getString("code"),
                        isPresent = row.optBoolean("is_present"),
                        isExcused = row.optBoolean("is_excused"),
                        sortOrder = row.optInt("sort_order"),
                        isActive = row.optBoolean("is_active", true),
                        updatedAt = row.optString("updated_at"),
                    ))
                }
            }

            dao.replaceOrganizationCache(organizationId, people, units, statuses)
            OrganizationCacheResult(people.size, units.size, statuses.size)
        } finally {
            http.close()
        }
    }
}
