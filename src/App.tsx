import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { AnalyticsScreen } from "./components/AnalyticsScreen";
import { AuthScreen } from "./components/AuthScreen";
import { BillDrillScreen } from "./components/BillDrillScreen";
import { Header } from "./components/Header";
import { LeaderboardScreen } from "./components/LeaderboardScreen";
import { MatchOverScreen } from "./components/MatchOverScreen";
import { ModeSelectScreen } from "./components/ModeSelectScreen";
import { PlayChallengesScreen } from "./components/PlayChallengesScreen";
import { PlayerSetup } from "./components/PlayerSetup";
import { ProfileSetupScreen } from "./components/ProfileSetupScreen";
import { RangeLocatorScreen } from "./components/RangeLocatorScreen";
import { RoundBuildScreen } from "./components/RoundBuildScreen";
import { RoundResultScreen } from "./components/RoundResultScreen";
import { RulesIntroScreen } from "./components/RulesIntroScreen";
import { SafetyChecklistScreen } from "./components/SafetyChecklistScreen";
import { ScoreScreen } from "./components/ScoreScreen";
import { SubscribeScreen } from "./components/SubscribeScreen";
import { TrainHistoryScreen } from "./components/TrainHistoryScreen";
import { TrainScreen } from "./components/TrainScreen";
import { GameProvider, useGame } from "./game/GameContext";
import { hasSeenRulesIntro, markRulesIntroSeen } from "./onboarding/rulesIntro";
import { getOnboardedStatus } from "./profile";
import { getMySubscriptionStatus } from "./subscription";
import { useOfflineSync } from "./training/useOfflineSync";

type View =
  | "modeSelect"
  | "rulesIntro"
  | "safetyCheck"
  | "game"
  | "train"
  | "trainHistory"
  | "trainAnalytics"
  | "leaderboard"
  | "editProfile"
  | "rangeLocator";
type PendingMode = "game" | "train";

function GameScreen({ onBackToModes }: { onBackToModes: () => void }) {
  const { state } = useGame();
  switch (state.phase) {
    case "setup":
      return <PlayerSetup onBackToModes={onBackToModes} />;
    case "billDrill":
      return <BillDrillScreen />;
    case "playChallenges":
      return <PlayChallengesScreen />;
    case "build":
      return <RoundBuildScreen />;
    case "score":
      return <ScoreScreen />;
    case "roundResult":
      return <RoundResultScreen />;
    case "matchOver":
      return <MatchOverScreen />;
    default:
      return null;
  }
}

function App() {
  const [view, setView] = useState<View>(() =>
    hasSeenRulesIntro() ? "modeSelect" : "rulesIntro",
  );
  const [pendingMode, setPendingMode] = useState<PendingMode | null>(null);
  const { session, loading } = useAuth();
  // Mounted for the whole signed-in session (not just while Train Mode is
  // open) so a session logged offline still syncs even if the user has since
  // navigated to History, Analytics, or Modes by the time connectivity returns.
  useOfflineSync(session?.user?.id);

  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setOnboarded(null);
      return;
    }
    let cancelled = false;
    getOnboardedStatus(session.user.id).then((value) => {
      if (!cancelled) setOnboarded(value);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) {
      setSubscribed(null);
      return;
    }
    let cancelled = false;
    getMySubscriptionStatus(session.user.id).then((status) => {
      if (!cancelled) setSubscribed(status === "active");
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-black text-zinc-400">Loading…</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (subscribed === null) {
    return <div className="flex min-h-svh items-center justify-center bg-black text-zinc-400">Loading…</div>;
  }

  if (!subscribed) {
    return <SubscribeScreen onSubscribed={() => setSubscribed(true)} />;
  }

  if (onboarded === null) {
    return <div className="flex min-h-svh items-center justify-center bg-black text-zinc-400">Loading…</div>;
  }

  if (!onboarded) {
    return <ProfileSetupScreen onComplete={() => setOnboarded(true)} />;
  }

  function selectMode(mode: PendingMode) {
    setPendingMode(mode);
    setView("safetyCheck");
  }

  function closeRulesIntro() {
    markRulesIntroSeen();
    setView("modeSelect");
  }

  return (
    <GameProvider>
      <div className="min-h-svh bg-zinc-950">
        <Header />
        {view === "rulesIntro" && <RulesIntroScreen onDone={closeRulesIntro} />}
        {view === "modeSelect" && (
          <ModeSelectScreen
            onSelectGame={() => selectMode("game")}
            onSelectTrain={() => selectMode("train")}
            onOpenLeaderboard={() => setView("leaderboard")}
            onOpenRules={() => setView("rulesIntro")}
            onOpenAnalytics={() => setView("trainAnalytics")}
            onOpenProfile={() => setView("editProfile")}
            onOpenRangeLocator={() => setView("rangeLocator")}
          />
        )}
        {view === "rangeLocator" && (
          <RangeLocatorScreen onBack={() => setView("modeSelect")} />
        )}
        {view === "editProfile" && (
          <ProfileSetupScreen
            mode="edit"
            onComplete={() => setView("modeSelect")}
            onBack={() => setView("modeSelect")}
          />
        )}
        {view === "safetyCheck" && pendingMode && (
          <SafetyChecklistScreen
            mode={pendingMode}
            onAcknowledge={() => setView(pendingMode)}
            onBack={() => {
              setView("modeSelect");
              setPendingMode(null);
            }}
          />
        )}
        {view === "game" && <GameScreen onBackToModes={() => setView("modeSelect")} />}
        {view === "train" && (
          <TrainScreen
            onBack={() => setView("modeSelect")}
            onOpenHistory={() => setView("trainHistory")}
            onOpenAnalytics={() => setView("trainAnalytics")}
          />
        )}
        {view === "trainHistory" && <TrainHistoryScreen onBack={() => setView("train")} />}
        {view === "trainAnalytics" && <AnalyticsScreen onBack={() => setView("train")} />}
        {view === "leaderboard" && (
          <LeaderboardScreen onBack={() => setView("modeSelect")} />
        )}
      </div>
    </GameProvider>
  );
}

export default App;
