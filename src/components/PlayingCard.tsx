import { useEffect, useState, type ReactNode } from "react";
import { useRetryingImageSrc } from "../hooks/useRetryingImageSrc";

export function PlayingCard({
  cardId,
  overlay,
  className = "",
  faceDown = false,
  tappable = false,
  onRevealChange,
  backImage = "/card-back.jpg",
}: {
  cardId: string;
  overlay?: ReactNode;
  className?: string;
  faceDown?: boolean;
  /** When true and faceDown, tapping flips the card — tap again to flip it back down. */
  tappable?: boolean;
  onRevealChange?: (revealed: boolean) => void;
  /** Back-of-card art. Defaults to the standard Range Roulette back. */
  backImage?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [tapped, setTapped] = useState(false);
  const { src, onError } = useRetryingImageSrc(`/cards/${cardId}.jpg`);
  const { src: backSrc, onError: backOnError } = useRetryingImageSrc(backImage);

  useEffect(() => {
    setTapped(false);
    if (faceDown) {
      setRevealed(false);
      return;
    }
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 150);
    return () => clearTimeout(t);
  }, [cardId, faceDown]);

  const showFace = revealed || tapped;
  const isTappable = tappable && faceDown;

  function handleTap() {
    if (!isTappable) return;
    // Compute from the closed-over `tapped` rather than the setTapped
    // updater form — calling onRevealChange (a parent setState) inside a
    // state updater is a side effect updaters must stay free of; React can
    // re-invoke them, which is exactly what warns "Cannot update a
    // component while rendering a different component."
    const next = !tapped;
    setTapped(next);
    onRevealChange?.(next);
  }

  return (
    <div
      className={`[perspective:1000px] ${isTappable ? "cursor-pointer" : ""} ${className}`}
      onClick={handleTap}
      role={isTappable ? "button" : undefined}
      tabIndex={isTappable ? 0 : undefined}
      onKeyDown={
        isTappable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTap();
              }
            }
          : undefined
      }
      aria-label={isTappable ? (tapped ? "Tap to hide card" : "Tap to reveal card") : undefined}
    >
      <div
        className="relative aspect-[552/812] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
        style={{ transform: showFace ? "rotateY(0deg)" : "rotateY(180deg)" }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl shadow-lg [backface-visibility:hidden]">
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={onError}
          />
          {overlay}
          {isTappable && tapped && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/80 py-1.5 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">
                Tap to Hide
              </span>
            </div>
          )}
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-xl shadow-lg [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <img
            src={backSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            onError={backOnError}
          />
          {isTappable && !tapped && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/80 py-1.5 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500">
                Tap to Reveal
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
