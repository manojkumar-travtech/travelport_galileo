import { runGwsJob } from "./services/getGdsProfilesService";
import { getTravelPortToken } from "./services/loginTravelPortService";
import { logoutFromTravlePort } from "./services/logoutTravelPortService";

(async () => {
  try {
    console.log("🚀 Starting Travelport session...");
    const token = await getTravelPortToken();
    if (token) {
      console.log("✅ LogIn successful.");

      const finishedJob = await runGwsJob(token);
      if (finishedJob) {
        await logoutFromTravlePort(token);
      }
    }
  } catch (error) {
    console.log("err", error);
    console.error("❌ Error starting session:", (error as Error).message);
  }
})();
