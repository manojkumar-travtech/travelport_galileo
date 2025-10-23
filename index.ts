import { runGwsJob } from "./src/services/getGdsProfiles.service";
import { getTravelPortToken } from "./src/services/loginTravelPort.service";

(async () => {
  try {
    console.log("🚀 Starting Travelport session...");
    const token = await getTravelPortToken();
    console.log("🔑 Token:", token);
    if (token) {
      runGwsJob(token);
    }
  } catch (error) {
    console.log("err", error);
    console.error("❌ Error starting session:", (error as Error).message);
  }
})();
