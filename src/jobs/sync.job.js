import cron from "node-cron";
import { syncAllJiraProjects } from "../controllers/jira.controller.js";
import { syncAllBambooHROrganizations } from "../controllers/bamboohr.controller.js";
import { syncAllKekaOrganizations } from "../controllers/keka.controller.js";

export const startSyncJobs = () => {

  const runJiraSync = async () => {
    try {
      await syncAllJiraProjects();
    } catch (error) {
      console.error("[Jira] Sync failed:", error);
    }
  };


  const runBambooSync = async () => {
    try {
      await syncAllBambooHROrganizations();
    } catch (error) {
      console.error("[BambooHR] Sync failed:", error);
    }
  };

  const runKekaSync = async () => {
    try {
      await syncAllKekaOrganizations();
    } catch (error) {
      console.error("[Keka] Sync failed:", error);
    }
  };

  runJiraSync();
  runBambooSync();
  runKekaSync();

  // Schedules
  cron.schedule("*/5 * * * *", runJiraSync); 
  cron.schedule("0 0 * * *", runBambooSync);  
  cron.schedule("0 0 * * *", runKekaSync);   

  console.info("Sync jobs initialized (Jira, BambooHR, Keka)");
};