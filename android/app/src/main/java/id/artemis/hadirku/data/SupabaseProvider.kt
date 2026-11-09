package id.artemis.hadirku.data

import id.artemis.hadirku.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseProvider {
    val isConfigured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()

    lateinit var client: SupabaseClient
        private set

    fun initialize() {
        if (!::client.isInitialized) {
            client = createSupabaseClient(
                supabaseUrl = BuildConfig.SUPABASE_URL.ifBlank { "https://example.supabase.co" },
                supabaseKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY.ifBlank { "sb_publishable_not_configured" },
            ) {
                install(Auth) {
                    host = "auth-callback"
                    scheme = "hadirku"
                }
                install(Postgrest)
            }
        }
    }
}
