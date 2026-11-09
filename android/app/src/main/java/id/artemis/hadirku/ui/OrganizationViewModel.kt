package id.artemis.hadirku.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.artemis.hadirku.HadirkuApplication
import id.artemis.hadirku.data.AttendanceSessionRepository
import id.artemis.hadirku.data.OrganizationCacheRepository
import id.artemis.hadirku.data.OrganizationCacheResult
import id.artemis.hadirku.data.OrganizationMembership
import id.artemis.hadirku.data.OrganizationRepository
import id.artemis.hadirku.data.SupabaseProvider
import id.artemis.hadirku.data.local.LocalAttendanceRecordEntity
import id.artemis.hadirku.data.local.LocalAttendanceSessionEntity
import id.artemis.hadirku.data.local.LocalAttendanceStatusEntity
import id.artemis.hadirku.data.local.LocalPersonEntity
import id.artemis.hadirku.data.local.LocalUnitEntity
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class OrganizationViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HadirkuApplication
    private val dao = app.localDatabase.attendanceDao()
    private val repository = OrganizationRepository()
    private val cacheRepository = OrganizationCacheRepository(dao)
    private val sessionRepository = AttendanceSessionRepository(dao)

    private val _organizations = MutableStateFlow<List<OrganizationMembership>>(emptyList())
    val organizations: StateFlow<List<OrganizationMembership>> = _organizations
    private val _selectedOrganizationId = MutableStateFlow<String?>(null)
    val selectedOrganizationId: StateFlow<String?> = _selectedOrganizationId
    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error
    private val _cacheLoading = MutableStateFlow(false)
    val cacheLoading: StateFlow<Boolean> = _cacheLoading
    private val _cacheResult = MutableStateFlow<OrganizationCacheResult?>(null)
    val cacheResult: StateFlow<OrganizationCacheResult?> = _cacheResult
    private val _cacheError = MutableStateFlow<String?>(null)
    val cacheError: StateFlow<String?> = _cacheError
    private val _people = MutableStateFlow<List<LocalPersonEntity>>(emptyList())
    val people: StateFlow<List<LocalPersonEntity>> = _people
    private val _units = MutableStateFlow<List<LocalUnitEntity>>(emptyList())
    val units: StateFlow<List<LocalUnitEntity>> = _units
    private val _statuses = MutableStateFlow<List<LocalAttendanceStatusEntity>>(emptyList())
    val statuses: StateFlow<List<LocalAttendanceStatusEntity>> = _statuses
    private val _sessions = MutableStateFlow<List<LocalAttendanceSessionEntity>>(emptyList())
    val sessions: StateFlow<List<LocalAttendanceSessionEntity>> = _sessions
    private val _records = MutableStateFlow<List<LocalAttendanceRecordEntity>>(emptyList())
    val records: StateFlow<List<LocalAttendanceRecordEntity>> = _records
    private val _actionBusy = MutableStateFlow(false)
    val actionBusy: StateFlow<Boolean> = _actionBusy
    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage
    private var localDataJob: Job? = null
    private var recordsJob: Job? = null

    fun load() {
        if (_loading.value) return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            runCatching { repository.loadActiveOrganizations() }
                .onSuccess { list ->
                    _organizations.value = list
                    if (list.none { it.organizationId == _selectedOrganizationId.value }) {
                        select(list.firstOrNull()?.organizationId)
                    }
                }
                .onFailure { _error.value = it.message ?: "Tidak dapat memuat organisasi." }
            _loading.value = false
        }
    }

    fun select(organizationId: String?) {
        if (organizationId != null && _organizations.value.none { it.organizationId == organizationId }) return
        _selectedOrganizationId.value = organizationId
        _cacheResult.value = null
        _cacheError.value = null
        localDataJob?.cancel()
        if (organizationId == null) return
        localDataJob = viewModelScope.launch {
            launch { dao.observeActivePeople(organizationId).collect { _people.value = it } }
            launch { dao.observeActiveUnits(organizationId).collect { _units.value = it } }
            launch { dao.observeActiveStatuses(organizationId).collect { _statuses.value = it } }
            launch { dao.observeSessions(organizationId).collect { _sessions.value = it } }
        }
    }

    fun refreshOrganizationData() {
        val id = _selectedOrganizationId.value ?: return
        if (_cacheLoading.value) return
        viewModelScope.launch {
            _cacheLoading.value = true
            _cacheError.value = null
            _cacheResult.value = null
            runCatching {
                val result = cacheRepository.refresh(id)
                sessionRepository.refresh(id)
                result
            }.onSuccess { _cacheResult.value = it }
                .onFailure { _cacheError.value = it.message ?: "Gagal memperbarui data." }
            _cacheLoading.value = false
        }
    }

    fun refreshSessions() {
        val id = _selectedOrganizationId.value ?: return
        viewModelScope.launch {
            runCatching { sessionRepository.refresh(id) }
                .onFailure { _actionMessage.value = it.message ?: "Gagal memuat sesi." }
        }
    }

    fun createSession(title: String) {
        val id = _selectedOrganizationId.value ?: return
        if (_actionBusy.value) return
        viewModelScope.launch {
            _actionBusy.value = true
            _actionMessage.value = null
            runCatching { sessionRepository.create(id, title) }
                .onSuccess { _actionMessage.value = "Sesi presensi berhasil dibuat." }
                .onFailure { _actionMessage.value = it.message ?: "Gagal membuat sesi." }
            _actionBusy.value = false
        }
    }

    fun observeSessionRecords(sessionId: String) {
        recordsJob?.cancel()
        recordsJob = viewModelScope.launch {
            dao.observeRecords(sessionId).collect { _records.value = it }
        }
    }

    fun markAttendance(sessionId: String, personId: String, statusId: String) {
        val organizationId = _selectedOrganizationId.value ?: return
        val userId = (SupabaseProvider.client.auth.sessionStatus.value as? SessionStatus.Authenticated)
            ?.session?.user?.id ?: run {
                _actionMessage.value = "Sesi login tidak tersedia."
                return
            }
        viewModelScope.launch {
            runCatching {
                app.attendanceRepository.markAttendance(organizationId, sessionId, personId, statusId, userId)
            }.onSuccess { _actionMessage.value = "Presensi tersimpan di perangkat dan masuk antrean sinkronisasi." }
                .onFailure { _actionMessage.value = it.message ?: "Gagal menyimpan presensi." }
        }
    }
}
