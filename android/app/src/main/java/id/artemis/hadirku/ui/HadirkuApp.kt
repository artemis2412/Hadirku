package id.artemis.hadirku.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import id.artemis.hadirku.auth.AuthViewModel
import id.artemis.hadirku.data.OrganizationMembership
import id.artemis.hadirku.data.SupabaseProvider
import io.github.jan.supabase.auth.status.SessionStatus

private val Teal = Color(0xFF087F72)
private val Ink = Color(0xFF19312E)
private val Muted = Color(0xFF71827E)
private val Canvas = Color(0xFFF4F7F6)

@Composable
fun HadirkuApp(
    authViewModel: AuthViewModel = viewModel(),
    organizationViewModel: OrganizationViewModel = viewModel(),
) {
    val sessionStatus by authViewModel.sessionStatus.collectAsState()
    val busy by authViewModel.busy.collectAsState()
    val error by authViewModel.error.collectAsState()

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Teal,
            onPrimary = Color.White,
            background = Canvas,
            surface = Color.White,
            onSurface = Ink,
        )
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Canvas) {
            when (sessionStatus) {
                is SessionStatus.Authenticated -> HomeScreen(
                    email = (sessionStatus as SessionStatus.Authenticated).session.user?.email.orEmpty(),
                    organizationViewModel = organizationViewModel,
                    onSignOut = authViewModel::signOut,
                )
                SessionStatus.Initializing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Teal)
                }
                else -> LoginScreen(
                    configured = SupabaseProvider.isConfigured,
                    busy = busy,
                    error = error,
                    onSignIn = authViewModel::signIn,
                    onClearError = authViewModel::clearError,
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(
    configured: Boolean,
    busy: Boolean,
    error: String?,
    onSignIn: (String, String) -> Unit,
    onClearError: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("HADIRKU", style = MaterialTheme.typography.labelLarge, color = Teal, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        Text("Presensi lebih tertata.", style = MaterialTheme.typography.headlineMedium, color = Ink, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("Masuk untuk melanjutkan ke organisasi Anda.", color = Muted)
        Spacer(Modifier.height(28.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it; onClearError() },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; onClearError() },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Kata sandi") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
        )
        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        if (!configured) {
            Spacer(Modifier.height(12.dp))
            Text(
                "Aplikasi siap dibangun. Konfigurasi URL dan publishable key Supabase diperlukan untuk login.",
                color = Muted,
                style = MaterialTheme.typography.bodySmall,
            )
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { onSignIn(email, password) },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            enabled = !busy && configured && email.isNotBlank() && password.isNotBlank(),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.width(20.dp), color = Color.White, strokeWidth = 2.dp)
            else Text("Masuk")
        }
    }
}

@Composable
private fun HomeScreen(
    email: String,
    organizationViewModel: OrganizationViewModel,
    onSignOut: () -> Unit,
) {
    val organizations by organizationViewModel.organizations.collectAsState()
    val selectedId by organizationViewModel.selectedOrganizationId.collectAsState()
    val loading by organizationViewModel.loading.collectAsState()
    val error by organizationViewModel.error.collectAsState()

    LaunchedEffect(email) { organizationViewModel.load() }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("HADIRKU", color = Teal, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                Text("Ruang kerja presensi", style = MaterialTheme.typography.headlineSmall, color = Ink, fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = onSignOut) { Text("Keluar") }
        }
        Spacer(Modifier.height(8.dp))
        Text(email, color = Muted, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(24.dp))

        Text("Organisasi Anda", color = Ink, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        when {
            loading -> CircularProgressIndicator(color = Teal, modifier = Modifier.padding(8.dp))
            error != null -> Text(error ?: "", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            organizations.isEmpty() -> Text(
                "Belum ada organisasi aktif di akun ini. Buat organisasi melalui dashboard web terlebih dahulu.",
                color = Muted,
                style = MaterialTheme.typography.bodyMedium,
            )
            else -> organizations.forEach { organization ->
                OrganizationOption(
                    organization = organization,
                    selected = organization.organizationId == selectedId,
                    onSelect = { organizationViewModel.select(organization.organizationId) },
                )
                Spacer(Modifier.height(8.dp))
            }
        }

        Spacer(Modifier.height(18.dp))
        Text(
            selectedId?.let { id -> organizations.firstOrNull { it.organizationId == id }?.organizationName }
                ?.let { "Organisasi aktif: $it" } ?: "Pilih organisasi untuk memulai.",
            color = Teal,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(18.dp))
        FeatureCard("Presensi", "Pencatatan hadir, izin, sakit, terlambat, dan alpa.")
        Spacer(Modifier.height(12.dp))
        FeatureCard("Anggota", "Data peserta, siswa, karyawan, dan anggota organisasi.")
        Spacer(Modifier.height(12.dp))
        FeatureCard("Riwayat & laporan", "Rekap presensi dan laporan per periode.")
        Spacer(Modifier.height(18.dp))
        Text(
            "Data organisasi dimuat dari Supabase sesuai keanggotaan akun. Modul presensi dan sinkronisasi akan dihubungkan berikutnya.",
            color = Muted,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun OrganizationOption(
    organization: OrganizationMembership,
    selected: Boolean,
    onSelect: () -> Unit,
) {
    Button(
        onClick = onSelect,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
            containerColor = if (selected) Teal else Color(0xFFE4EFED),
            contentColor = if (selected) Color.White else Ink,
        ),
    ) {
        Column(Modifier.fillMaxWidth()) {
            Text(organization.organizationName, fontWeight = FontWeight.SemiBold)
            Text(
                "${organization.organizationType} · ${organization.role}",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun FeatureCard(title: String, description: String) {
    Column(
        Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).padding(18.dp)
    ) {
        Text(title, color = Ink, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(5.dp))
        Text(description, color = Muted, style = MaterialTheme.typography.bodyMedium)
    }
}
