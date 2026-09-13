// USPSA's current active classifier roster — number, name, scoring method, and
// round count as published at uspsa.org/classifiers/. Snapshot taken 2026-09-12;
// USPSA periodically retires/adds classifiers, so this list will drift from the
// live site over time. Each entry links out to USPSA's own official stage PDF
// (https://uspsa.org/viewer/<number>.pdf) rather than reproducing the stage
// diagram/procedure here.
export type ClassifierScoring = "Comstock" | "Virginia";

export interface ClassifierStage {
  number: string;
  name: string;
  scoring: ClassifierScoring;
  /** Round count as published — null for Virginia-count stages where USPSA lists none. */
  rounds: number | null;
}

export function classifierPdfUrl(number: string): string {
  return `https://uspsa.org/viewer/${number}.pdf`;
}

export const CLASSIFIER_STAGES: ClassifierStage[] = [
  { number: "03-03", name: "Take em Down", scoring: "Comstock", rounds: 11 },
  { number: "03-05", name: "Paper Poppers", scoring: "Comstock", rounds: 10 },
  { number: "03-07", name: "Riverdale Standards", scoring: "Virginia", rounds: null },
  { number: "03-08", name: "Madness", scoring: "Virginia", rounds: null },
  { number: "03-09", name: "On the Move", scoring: "Virginia", rounds: null },
  { number: "03-18", name: "High Standards", scoring: "Virginia", rounds: null },
  { number: "06-03", name: "Can You Count", scoring: "Virginia", rounds: null },
  { number: "06-04", name: "Fluffy's Revenge 1", scoring: "Comstock", rounds: 8 },
  { number: "06-05", name: "Fluffy's Revenge 2", scoring: "Comstock", rounds: 8 },
  { number: "06-10", name: "Steely Speed VII", scoring: "Comstock", rounds: 6 },
  { number: "08-02", name: "Steeler Standards", scoring: "Virginia", rounds: null },
  { number: "08-03", name: "Six", scoring: "Comstock", rounds: 6 },
  { number: "09-10", name: "Life's Little Problems", scoring: "Comstock", rounds: 12 },
  { number: "13-02", name: "Down The Middle", scoring: "Virginia", rounds: null },
  { number: "13-04", name: "The Roscoe Rattle", scoring: "Virginia", rounds: null },
  { number: "13-05", name: "Tick Tock", scoring: "Virginia", rounds: null },
  { number: "13-06", name: "Too Close For Comfort", scoring: "Virginia", rounds: null },
  { number: "18-03", name: "We Play Games", scoring: "Virginia", rounds: 24 },
  { number: "18-05", name: "No Need To Believe In Either Side", scoring: "Comstock", rounds: 16 },
  { number: "18-07", name: "Someone Is Always Willing To Pay", scoring: "Comstock", rounds: 8 },
  { number: "18-08", name: "The Condor", scoring: "Virginia", rounds: 16 },
  { number: "18-09", name: "I Miss That Kind of Clarity", scoring: "Virginia", rounds: 24 },
  { number: "19-01", name: "HI-Jinx", scoring: "Comstock", rounds: 12 },
  { number: "19-02", name: "HI-Way Robbery", scoring: "Comstock", rounds: 12 },
  { number: "19-04", name: "HI Cost of Living", scoring: "Comstock", rounds: 14 },
  { number: "20-01", name: "Wish You Were Here", scoring: "Comstock", rounds: 12 },
  { number: "20-02", name: "Deja Vu", scoring: "Comstock", rounds: 12 },
  { number: "20-03", name: "Deja Vu All Over Again", scoring: "Comstock", rounds: 12 },
  { number: "21-01", name: "8 x 3 Trigger Freeze", scoring: "Comstock", rounds: 24 },
  { number: "22-01", name: "Righty Tighty", scoring: "Comstock", rounds: 18 },
  { number: "22-02", name: "Lefty Loosey", scoring: "Comstock", rounds: 18 },
  { number: "22-04", name: "Calm Before the Storm", scoring: "Virginia", rounds: 16 },
  { number: "22-06", name: "Blues Don't Care", scoring: "Comstock", rounds: 7 },
  { number: "22-07", name: "Cross Road Blues", scoring: "Comstock", rounds: 14 },
  { number: "23-01", name: "THS Short Course", scoring: "Comstock", rounds: 12 },
  { number: "23-02", name: "This could be the Greatest Night of Our Lives", scoring: "Comstock", rounds: 12 },
  { number: "24-01", name: "Can you Strong and Weak Hand?", scoring: "Virginia", rounds: 24 },
  { number: "24-02", name: "This is more better now", scoring: "Comstock", rounds: 18 },
  { number: "24-04", name: "The Thrill of the Bill Drill", scoring: "Virginia", rounds: 18 },
  { number: "24-06", name: "Surely you can't be serious", scoring: "Comstock", rounds: 18 },
  { number: "24-08", name: "And now for something completely different", scoring: "Comstock", rounds: 24 },
  { number: "24-09", name: "Tres Cajas", scoring: "Comstock", rounds: 18 },
  { number: "25-01", name: "Return to Monke", scoring: "Comstock", rounds: 19 },
  { number: "25-02", name: "Look at Me I Am the Captain Now", scoring: "Comstock", rounds: 10 },
  { number: "25-03", name: "Let Him Cook", scoring: "Comstock", rounds: 10 },
  { number: "25-04", name: "We Did Our Homework", scoring: "Comstock", rounds: 10 },
  { number: "25-05", name: "Its All Porta the Plan", scoring: "Comstock", rounds: 16 },
  { number: "25-06", name: "They All Count", scoring: "Comstock", rounds: 14 },
  { number: "25-07", name: "Absolute Cinema", scoring: "Comstock", rounds: 14 },
  { number: "25-08", name: "We Lost Hero or Zero", scoring: "Comstock", rounds: 10 },
  { number: "25-09", name: "Descent Into Madness", scoring: "Virginia", rounds: 12 },
  { number: "99-08", name: "Melody Line", scoring: "Virginia", rounds: null },
  { number: "99-10", name: "Times Two", scoring: "Comstock", rounds: 12 },
  { number: "99-11", name: "El Presidente", scoring: "Virginia", rounds: null },
  { number: "99-12", name: "Take Your Choice", scoring: "Comstock", rounds: 12 },
  { number: "99-13", name: "Quicky II", scoring: "Virginia", rounds: null },
  { number: "99-19", name: "Paynes Pain", scoring: "Virginia", rounds: null },
  { number: "99-28", name: "Hillbillton Drill", scoring: "Comstock", rounds: 12 },
  { number: "99-42", name: "Fast n Furious", scoring: "Comstock", rounds: 12 },
  { number: "99-46", name: "Close Quarter Standards", scoring: "Comstock", rounds: 24 },
  { number: "99-53", name: "Triple Play", scoring: "Comstock", rounds: 12 },
  { number: "99-57", name: "Bookouts Boogie", scoring: "Comstock", rounds: 12 },
  { number: "99-62", name: "Bang and Clang", scoring: "Comstock", rounds: 6 },
];
