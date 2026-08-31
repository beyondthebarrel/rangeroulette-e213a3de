import { auth, defineMcp } from "@lovable.dev/mcp-js";
import drawDrill from "./tools/draw-drill";
import getLeaderboard from "./tools/leaderboard";
import listSavedDrills from "./tools/list-saved-drills";
import listSessions from "./tools/list-sessions";
import logResult from "./tools/log-result";
import saveDrill from "./tools/save-drill";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "range-roulette-connect",
  title: "Range Roulette Connect",
  version: "0.1.0",
  instructions:
    "Tools for Range Roulette, a firearms training and match app. Draw random drills, save drills by name, log training results with penalties, review session history, and read the match leaderboard. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [drawDrill, listSavedDrills, saveDrill, logResult, listSessions, getLeaderboard],
});
