package id.artemis.hadirku.data

import id.artemis.hadirku.BuildConfig
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

data class OrganizationMembership(
    val organizationId: String,
    val organizationName: String,
    val organizationType: String,
    val role: String,
)

class OrganizationRepository {
    suspend fun loadActiveOrganizations(): List<OrganizationMembership> = withContext(Dispatchers.IO) {
        val session = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session ?: return@withContext emptyList()
        val userId = session.user?.id ?: return@withContext emptyList()
        val token = session.accessToken
        if (token.isBlank()) return@withContext emptyList()

        val http = HttpClient(Android)
        try {
            val response = http.get(
                "${BuildConfig.SUPABASE_URL}/rest/v1/organization_memberships?select=organization_id,role,organizations(id,name,organization_type)&user_id=eq.$userId&membership_status=eq.active&order=created_at.asc"
            ) {
                header(HttpHeaders.Authorization, "Bearer $token")
                header("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            }
            if (response.status.value !in 200..299) {
                throw IllegalStateException("Gagal memuat organisasi (HTTP ${response.status.value}).")
            }

            val rows = JSONArray(response.bodyAsText())
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    val organization = row.optJSONObject("organizations") ?: continue
                    val id = organization.optString("id")
                    val name = organization.optString("name")
                    if (id.isBlank() || name.isBlank()) continue
                    add(
                        OrganizationMembership(
                            organizationId = id,
                            organizationName = name,
                            organizationType = organization.optString("organization_type", "other"),
                            role = row.optString("role", "member"),
                        )
                    )
                }
            }
        } finally {
            http.close()
        }
    }
}
