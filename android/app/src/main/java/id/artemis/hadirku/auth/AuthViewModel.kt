package id.artemis.hadirku.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.artemis.hadirku.data.SupabaseProvider
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel : ViewModel() {
    val sessionStatus: StateFlow<SessionStatus> = SupabaseProvider.client.auth.sessionStatus
    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun signIn(email: String, password: String) {
        if (!SupabaseProvider.isConfigured) {
            _error.value = "Konfigurasi Supabase belum tersedia. Isi android/local.properties."
            return
        }
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            runCatching {
                SupabaseProvider.client.auth.signInWith(Email) {
                    this.email = email.trim()
                    this.password = password
                }
            }.onFailure {
                _error.value = it.message ?: "Tidak dapat masuk. Periksa koneksi dan data akun."
            }
            _busy.value = false
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { SupabaseProvider.client.auth.signOut() }
                .onFailure { _error.value = it.message ?: "Gagal keluar." }
        }
    }

    fun clearError() { _error.value = null }
}
