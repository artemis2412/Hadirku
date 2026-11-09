package id.artemis.hadirku.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

object AttendanceSyncScheduler {
    fun enqueue(context: Context, organizationId: String) {
        require(organizationId.isNotBlank()) { "Organization is required" }
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val request = OneTimeWorkRequestBuilder<AttendanceSyncWorker>()
            .setInputData(workDataOf(AttendanceSyncWorker.KEY_ORGANIZATION_ID to organizationId))
            .setConstraints(constraints)
            .setBackoffCriteria(
                androidx.work.BackoffPolicy.EXPONENTIAL,
                30,
                TimeUnit.SECONDS,
            )
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            "hadirku-attendance-sync-$organizationId",
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request,
        )
    }
}
