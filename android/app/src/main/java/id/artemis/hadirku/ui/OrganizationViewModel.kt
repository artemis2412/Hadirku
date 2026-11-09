package id.artemis.hadirku.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.artemis.hadirku.data.OrganizationMembership
import id.artemis.hadirku.data.OrganizationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class OrganizationViewModel : ViewModel() {
    private val repository = OrganizationRepository()
    private val _organizations = MutableStateFlow<List<OrganizationMembership>>(emptyList())
    val organizations: StateFlow<List<OrganizationMembership>> = _organizations
    private val _selectedOrganizationId = MutableStateFlow<String?>(null)
    val selectedOrganizationId: StateFlow<String?> = _selectedOrganizationId
    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun load() {
        if (_loading.value) return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            runCatching { repository.loadActiveOrganizations() }
                .onSuccess { organizations ->
                    _organizations.value = organizations
                    if (_selectedOrganizationId.value !in organizations.map { it.organizationId }) {
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
        }
    }
}
