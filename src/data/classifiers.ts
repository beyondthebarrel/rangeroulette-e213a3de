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
  /** Short original summary of the course of fire, written from USPSA's stage briefing PDF — not a verbatim copy. */
  description: string;
}

export function classifierPdfUrl(number: string): string {
  return `https://uspsa.org/viewer/${number}.pdf`;
}

export const CLASSIFIER_STAGES: ClassifierStage[] = [
  { number: "03-03", name: "Take em Down", scoring: "Comstock", rounds: 11, description: "Draw from Box A, engaging two targets from each side of a barricade, then move to Box B for three poppers." },
  { number: "03-05", name: "Paper Poppers", scoring: "Comstock", rounds: 10, description: "Engage 2 paper targets or 6 poppers in any order, with a mandatory reload required between arrays." },
  { number: "03-07", name: "Riverdale Standards", scoring: "Virginia", rounds: null, description: "Three strings from one box, one round per target each time: freestyle twice, then strong-hand, then weak-hand." },
  { number: "03-08", name: "Madness", scoring: "Virginia", rounds: null, description: "Engage all seven targets once, reload, then engage them all again — no movement, no strings." },
  { number: "03-09", name: "On the Move", scoring: "Virginia", rounds: null, description: "Two strings from opposite ends of the bay, engaging every target with two rounds each time." },
  { number: "03-18", name: "High Standards", scoring: "Virginia", rounds: null, description: "Two-round strings at 15 and 10 yards, each pairing a freestyle pass with a one-handed reload pass." },
  { number: "06-03", name: "Can You Count", scoring: "Virginia", rounds: null, description: "Five rounds on one target, reload, five on the next — twice, from a single box." },
  { number: "06-04", name: "Fluffy's Revenge 1", scoring: "Comstock", rounds: 8, description: "A straightforward five-target array — three paper and two poppers — from one shooting position." },
  { number: "06-05", name: "Fluffy's Revenge 2", scoring: "Comstock", rounds: 8, description: "Turn-and-draw start into a five-target array of three paper targets and two mini poppers." },
  { number: "06-10", name: "Steely Speed VII", scoring: "Comstock", rounds: 6, description: "Pure steel — three poppers and three mini poppers — from a hands-on-the-barricade start." },
  { number: "08-02", name: "Steeler Standards", scoring: "Virginia", rounds: null, description: "Three strings from one box, one round per target each time: freestyle twice, then strong-hand, then weak-hand." },
  { number: "08-03", name: "Six", scoring: "Comstock", rounds: 6, description: "Turn-and-draw start into two paper targets, a popper, and a mini popper as they appear." },
  { number: "09-10", name: "Life's Little Problems", scoring: "Comstock", rounds: 12, description: "Six paper targets engaged from a single stationary position — no movement, no reload required." },
  { number: "13-02", name: "Down The Middle", scoring: "Virginia", rounds: null, description: "A quick eight-round pass — two rounds on each of four targets from a single box." },
  { number: "13-04", name: "The Roscoe Rattle", scoring: "Virginia", rounds: null, description: "Turn-and-draw strings that isolate targets one at a time, six rounds apiece, with a reload mid-string." },
  { number: "13-05", name: "Tick Tock", scoring: "Virginia", rounds: null, description: "Starts with an unloaded gun on the table — load, engage all four targets twice, reloading from table-staged mags only." },
  { number: "13-06", name: "Too Close For Comfort", scoring: "Virginia", rounds: null, description: "One round on each of five targets, reload, then one more round on each — all from one spot." },
  { number: "18-03", name: "We Play Games", scoring: "Virginia", rounds: 24, description: "Move through two boxes, pairing a freestyle pass with a one-handed pass at each stop." },
  { number: "18-05", name: "No Need To Believe In Either Side", scoring: "Comstock", rounds: 16, description: "Ten-target array of paper and mini poppers, split into two groups by a single mandatory reload." },
  { number: "18-07", name: "Someone Is Always Willing To Pay", scoring: "Comstock", rounds: 8, description: "Five-target mix of paper and mini poppers, split into two groups by a single mandatory reload." },
  { number: "18-08", name: "The Condor", scoring: "Virginia", rounds: 16, description: "Two strings moving between two boxes, engaging four targets from each box with a reload in between." },
  { number: "18-09", name: "I Miss That Kind of Clarity", scoring: "Virginia", rounds: 24, description: "Two strings, each splitting six targets into two groups of three with a mandatory reload between." },
  { number: "19-01", name: "HI-Jinx", scoring: "Comstock", rounds: 12, description: "Six targets engaged freestyle from anywhere in the shooting area as they become visible." },
  { number: "19-02", name: "HI-Way Robbery", scoring: "Comstock", rounds: 12, description: "Eight targets — four paper, four mini poppers — engaged as they become available from a fixed start." },
  { number: "19-04", name: "HI Cost of Living", scoring: "Comstock", rounds: 14, description: "Seven paper targets engaged freestyle from within the shooting area as they become available." },
  { number: "20-01", name: "Wish You Were Here", scoring: "Comstock", rounds: 12, description: "Seven-target mix of paper and poppers, engaged freestyle from anywhere in the shooting area." },
  { number: "20-02", name: "Deja Vu", scoring: "Comstock", rounds: 12, description: "Six paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "20-03", name: "Deja Vu All Over Again", scoring: "Comstock", rounds: 12, description: "Eight-target mix of paper, poppers, and mini poppers, engaged freestyle from anywhere in the bay." },
  { number: "21-01", name: "8 x 3 Trigger Freeze", scoring: "Comstock", rounds: 24, description: "Twelve paper targets across three arrays, engaged freestyle from anywhere in the shooting area." },
  { number: "22-01", name: "Righty Tighty", scoring: "Comstock", rounds: 18, description: "Nine targets freestyle, but the last three must be engaged strong-hand only." },
  { number: "22-02", name: "Lefty Loosey", scoring: "Comstock", rounds: 18, description: "Nine targets freestyle, but the last three must be engaged weak-hand only." },
  { number: "22-04", name: "Calm Before the Storm", scoring: "Virginia", rounds: 16, description: "Starts seated with the gun on the table — engage two targets with four rounds each, reload, then the other two." },
  { number: "22-06", name: "Blues Don't Care", scoring: "Comstock", rounds: 7, description: "Freestyle four-target array of paper and one mini popper from the rear fault line." },
  { number: "22-07", name: "Cross Road Blues", scoring: "Comstock", rounds: 14, description: "Seven paper targets engaged freestyle from within the shooting area." },
  { number: "23-01", name: "THS Short Course", scoring: "Comstock", rounds: 12, description: "Six paper targets engaged freestyle from within the shooting area, starting on the front fault line." },
  { number: "23-02", name: "This could be the Greatest Night of Our Lives", scoring: "Comstock", rounds: 12, description: "Six paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "24-01", name: "Can you Strong and Weak Hand?", scoring: "Virginia", rounds: 24, description: "Two strings on four targets: two rounds each freestyle, reload, then one round each strong-hand — repeated weak-hand for string two." },
  { number: "24-02", name: "This is more better now", scoring: "Comstock", rounds: 18, description: "Nine paper targets engaged freestyle from a start-stick position." },
  { number: "24-04", name: "The Thrill of the Bill Drill", scoring: "Virginia", rounds: 18, description: "Three single-target strings: pure speed on one target, a mid-string reload on the next, and a reload into strong-hand only on the third." },
  { number: "24-06", name: "Surely you can't be serious", scoring: "Comstock", rounds: 18, description: "Nine paper targets engaged freestyle, starting completely outside the shooting area straddling the start stick." },
  { number: "24-08", name: "And now for something completely different", scoring: "Comstock", rounds: 24, description: "Twelve paper targets engaged freestyle, starting completely outside the shooting area at the rear fault line." },
  { number: "24-09", name: "Tres Cajas", scoring: "Comstock", rounds: 18, description: "Six targets, three rounds apiece, engaged from the center of the shooting area." },
  { number: "25-01", name: "Return to Monke", scoring: "Comstock", rounds: 19, description: "Ten-target mix of paper and one popper, engaged freestyle from anywhere in the shooting area." },
  { number: "25-02", name: "Look at Me I Am the Captain Now", scoring: "Comstock", rounds: 10, description: "Five paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "25-03", name: "Let Him Cook", scoring: "Comstock", rounds: 10, description: "Five paper targets engaged freestyle from a fixed, toes-on-the-marks start position." },
  { number: "25-04", name: "We Did Our Homework", scoring: "Comstock", rounds: 10, description: "Five paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "25-05", name: "Its All Porta the Plan", scoring: "Comstock", rounds: 16, description: "Ten-target mix of paper, poppers, and mini poppers, engaged freestyle from anywhere in the bay." },
  { number: "25-06", name: "They All Count", scoring: "Comstock", rounds: 14, description: "Seven paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "25-07", name: "Absolute Cinema", scoring: "Comstock", rounds: 14, description: "Seven paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "25-08", name: "We Lost Hero or Zero", scoring: "Comstock", rounds: 10, description: "Five paper targets engaged freestyle from anywhere in the shooting area." },
  { number: "25-09", name: "Descent Into Madness", scoring: "Virginia", rounds: 12, description: "From Box A, two freestyle rounds per target, reload, then one round per target weak-hand only." },
  { number: "99-08", name: "Melody Line", scoring: "Virginia", rounds: null, description: "Turn-and-draw start with your back to the targets — one round on each of six targets, reload, repeat." },
  { number: "99-10", name: "Times Two", scoring: "Comstock", rounds: 12, description: "Choose Box A or B, engage three targets with two rounds each, then move to the other box for the rest." },
  { number: "99-11", name: "El Presidente", scoring: "Virginia", rounds: null, description: "The classic turn-and-draw: two rounds on each of three targets, reload, then two more rounds apiece." },
  { number: "99-12", name: "Take Your Choice", scoring: "Comstock", rounds: 12, description: "Hands-on-the-barricade start — engage three targets from one side, reload, then three from the other side." },
  { number: "99-13", name: "Quicky II", scoring: "Virginia", rounds: null, description: "Overhead-reach start into two strings, each pairing a freestyle pass with a one-handed reload pass." },
  { number: "99-19", name: "Paynes Pain", scoring: "Virginia", rounds: null, description: "Engage all four targets from one side of a barricade, then through the port, then the other side — two reloads total." },
  { number: "99-28", name: "Hillbillton Drill", scoring: "Comstock", rounds: 12, description: "Nine-target mix of paper and poppers, split into two groups by a single mandatory reload." },
  { number: "99-42", name: "Fast n Furious", scoring: "Comstock", rounds: 12, description: "Eight-target mix of paper and poppers split across both sides of a barricade, one reload between sides." },
  { number: "99-46", name: "Close Quarter Standards", scoring: "Comstock", rounds: 24, description: "Three strings across three boxes: freestyle twice, then strong-hand, then a hand-transfer to weak-hand only." },
  { number: "99-53", name: "Triple Play", scoring: "Comstock", rounds: 12, description: "Nine-target mix of paper, poppers, and plates split across both sides of a barricade and through a port." },
  { number: "99-57", name: "Bookouts Boogie", scoring: "Comstock", rounds: 12, description: "Eight-target mix of paper and poppers split between two boxes — no re-engaging a target from the other box." },
  { number: "99-62", name: "Bang and Clang", scoring: "Comstock", rounds: 6, description: "A quick five-target array — one paper target and four poppers — from a single position." },
];
