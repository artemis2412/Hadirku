package id.artemis.hadirku.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.artemis.hadirku.HadirkuApplication
import id.artemis.hadirku.data.OrganizationCacheRepository
import id.artemis.hadirku.data.OrganizationCacheResult
import id.artemis.hadirku.data.OrganizationMembership
import id.artemis.hadirku.data.OrganizationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class OrganizationViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = OrganizationRepository()
    private val cacheRepository = OrganizationCacheRepository(
        (application as HadirkuApplication).localDatabase.attendanceDao()
    )
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

    fun load() {
        if (_loading.value) return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            runCatching { repository.loadActiveOrganizations() }
                .onSuccess { organizations ->
                    _organizations.value = organizations
                    if (organizations.none { it.organizationId == _selectedOrganizationId.value }) {
                        _selectedOrganizationId.value = organizations.firstOrNull()?.organizationId
                    }
                }
                .onFailure { _error.value = it.message ?: "Tidak dapat memuat organisasi." }
            _loading.value = false
        }
    }

    fun select(organizationId: String) {
        if (_organizations.value.any { it.organizationId == organizationId }) {
            _selectedOrganizationId.value = organizationId
            _cacheResult.value = null
            _cacheError.value = null
        }
    }

    fun refreshOrganizationData() {
        val organizationId = _selectedOrganizationId.value ?: return
        if (_cacheLoading.value) return
        viewModelScope.launch {
            _cacheLoading.value = true
            _cacheError.value = null
            _cacheResult.value = null
            runCatching { cacheRepository.refresh(organizationId) }
                .onSuccess { _cacheResult.value = it }
                .onFailure { _cacheError.value = it.message ?: "Gagal memperbarui data." }
            _cacheLoading.value = false
        }
    }
}
