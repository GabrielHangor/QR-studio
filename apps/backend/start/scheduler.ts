import app from "@adonisjs/core/services/app";

import RequeueStalePendingNotifications from "#jobs/requeue_stale_pending_notifications";

/** Deliveries pending for longer than this are re-queued by the sweeper. */
const STALE_AFTER_MINUTES = 5;

// Warm-up (ace codegen) loads preloads without starting providers, so the queue manager
// is not initialized there. Register the schedule only when the app runs.
if (app.getMode() === "run") {
  await RequeueStalePendingNotifications.schedule({ olderThanMinutes: STALE_AFTER_MINUTES })
    .id("requeue-stale-pending-notifications")
    .every("5m")
    .run();
}
