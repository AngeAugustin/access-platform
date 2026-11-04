"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent } from "react";

// Réordonnancement d'une liste par glisser-déposer, sans dépendance :
// - souris : on attrape la poignée et on glisse ;
// - tactile : appui long (sur la poignée ou la ligne) puis glisser ;
// - clavier : flèches haut/bas sur la poignée.
// `onSave` reçoit le nouvel ordre complet et la ligne déplacée une fois celle-ci relâchée ;
// s'il renvoie false, l'ordre précédent revient.

const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 10;
const AUTO_SCROLL_EDGE_PX = 80;

// Éléments d'une ligne qui gardent leur comportement normal au toucher (saisie, boutons…).
const INTERACTIVE = "input, textarea, select, button, a, label";

function preventDefault(e: Event) {
  e.preventDefault();
}

type Drag = { id: string; initial: string[]; current: string[]; y: number; cleanup: () => void };

export function useSortable(ids: string[], onSave: (next: string[], moved: string) => Promise<boolean>) {
  const [order, setOrder] = useState(ids);
  const [synced, setSynced] = useState(ids);
  // Données rechargées par le serveur (ajout, suppression, ordre enregistré) : on repart de la nouvelle liste.
  if (synced.join("|") !== ids.join("|")) {
    setSynced(ids);
    setOrder(ids);
  }
  const [dragging, setDragging] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const drag = useRef<Drag | null>(null);
  const press = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      drag.current?.cleanup();
      press.current?.();
    },
    [],
  );

  async function save(next: string[], previous: string[], moved: string) {
    if (!(await onSave(next, moved))) setOrder(previous);
  }

  // Place la ligne déplacée avant la première ligne dont le milieu est sous le pointeur.
  function moveTo(y: number) {
    const d = drag.current;
    if (!d) return;
    const others = d.current.filter((x) => x !== d.id);
    let index = others.length;
    for (let i = 0; i < others.length; i++) {
      const r = rows.current.get(others[i])?.getBoundingClientRect();
      if (r && y < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    const next = [...others.slice(0, index), d.id, ...others.slice(index)];
    if (next.join("|") !== d.current.join("|")) {
      d.current = next;
      setOrder(next);
    }
  }

  function begin(id: string, y: number) {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      drag.current.y = e.clientY;
      moveTo(e.clientY);
    };
    const onUp = () => end();
    // Fait défiler la page quand on approche du haut ou du bas de l'écran.
    const scroll = window.setInterval(() => {
      const d = drag.current;
      if (!d) return;
      if (d.y < AUTO_SCROLL_EDGE_PX) window.scrollBy(0, -12);
      else if (d.y > window.innerHeight - AUTO_SCROLL_EDGE_PX) window.scrollBy(0, 12);
      else return;
      moveTo(d.y);
    }, 16);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Sur mobile, empêche la page de défiler sous le doigt pendant le déplacement.
    document.addEventListener("touchmove", preventDefault, { passive: false });
    drag.current = {
      id,
      initial: order,
      current: order,
      y,
      cleanup: () => {
        window.clearInterval(scroll);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.removeEventListener("touchmove", preventDefault);
      },
    };
    setDragging(id);
    navigator.vibrate?.(10);
  }

  function end() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    d.cleanup();
    setDragging(null);
    // Le clic qui suit le relâchement ne doit pas ouvrir ou fermer la ligne.
    window.addEventListener("click", preventDefault, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", preventDefault, { capture: true }), 50);
    if (d.current.join("|") !== d.initial.join("|")) save(d.current, d.initial, d.id);
  }

  function startPress(e: ReactPointerEvent, id: string, fromHandle: boolean) {
    if (drag.current || press.current || e.button !== 0) return;
    if (e.pointerType === "mouse") {
      if (!fromHandle) return;
      e.preventDefault();
      begin(id, e.clientY);
      return;
    }
    if (!fromHandle && (e.target as Element).closest(INTERACTIVE)) return;
    const x = e.clientX;
    const y = e.clientY;
    const onMove = (ev: PointerEvent) => {
      if (Math.hypot(ev.clientX - x, ev.clientY - y) > MOVE_TOLERANCE_PX) cancel();
    };
    const timer = window.setTimeout(() => {
      cancel();
      begin(id, y);
    }, LONG_PRESS_MS);
    // Le doigt a bougé (défilement) ou s'est levé avant la fin de l'appui long : rien ne se passe.
    function cancel() {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
      press.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
    press.current = cancel;
  }

  function onKeyDown(e: KeyboardEvent, id: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const i = order.indexOf(id);
    const j = e.key === "ArrowUp" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    save(next, order, id);
  }

  return {
    order,
    dragging,
    // Props de la ligne : référence pour le calcul des positions, appui long au toucher.
    rowProps: (id: string) => ({
      ref: (el: HTMLElement | null) => {
        if (el) rows.current.set(id, el);
        else rows.current.delete(id);
      },
      onPointerDown: (e: ReactPointerEvent) => startPress(e, id, false),
      onContextMenu: (e: MouseEvent) => {
        if (press.current || drag.current) e.preventDefault();
      },
    }),
    // Props de la poignée.
    handleProps: (id: string) => ({
      onPointerDown: (e: ReactPointerEvent) => startPress(e, id, true),
      onKeyDown: (e: KeyboardEvent) => onKeyDown(e, id),
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    }),
  };
}
