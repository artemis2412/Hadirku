package id.artemis.hadirku

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import id.artemis.hadirku.data.SupabaseProvider
import id.artemis.hadirku.ui.HadirkuApp
import io.github.jan.supabase.auth.handleDeeplinks

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (SupabaseProvider.isConfigured) SupabaseProvider.client.handleDeeplinks(intent)
        setContent { HadirkuApp() }
    }
}
