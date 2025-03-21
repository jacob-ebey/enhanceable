"use client";

export function handleIncrement(event: MouseEvent) {
  if (!event.target || !(event.target instanceof HTMLElement)) {
    throw new Error("invalid target");
  }
  event.target.textContent = "" + (Number(event.target.textContent) + 1);
}
