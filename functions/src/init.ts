import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';

admin.initializeApp();

// Size every gen2 function to fit the project's Cloud Run CPU quota
// (us-central1: 20 vCPU). At the default of 1 vCPU per instance, a deploy
// that updates ~21 functions starts ~21 vCPU of health-check instances at
// once, exceeds the quota, and Cloud Run then rejects requests to EVERY
// revision for a penalty window ("exceeded its quota limit ... recently",
// HTTP 503/429) — this took completeRegistration down on 2026-09-24.
// 'gcf_gen1' = the gen1 CPU share for the memory size (0.167 vCPU at
// 256MiB), so a full deploy needs ~3.5 vCPU. It also drops concurrency to
// 1 request per instance, hence the higher maxInstances. Must run before
// any function is defined, which is why it lives in this first import.
setGlobalOptions({ cpu: 'gcf_gen1', maxInstances: 10 });

export { admin };
