import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("refresh publication clock", { minutes: 1 }, internal.jobs.refreshPublicationClock, {});
crons.interval("dispatch due background jobs", { minutes: 1 }, internal.jobs.dispatchDue, {});
crons.interval("recover stale background jobs", { minutes: 10 }, internal.jobs.recoverStale, {});
crons.interval("publish and expire content", { minutes: 2 }, internal.jobs.sweepPublication, {});
crons.daily("retention cleanup", { hourUTC: 20, minuteUTC: 15 }, internal.jobs.cleanupRetention, {});

export default crons;
