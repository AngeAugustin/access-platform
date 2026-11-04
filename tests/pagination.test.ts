import { describe, expect, it } from "vitest";
import { pageNumbers, pageSlice, paginate } from "@/lib/pagination";

describe("paginate", () => {
  it("calcule le découpage d'une page", () => {
    expect(paginate(45, "2", 20)).toMatchObject({ page: 2, pages: 3, skip: 20, take: 20 });
  });

  it("ramène une page invalide ou hors limites à la plus proche", () => {
    expect(paginate(45, "99", 20).page).toBe(3);
    expect(paginate(45, "abc", 20).page).toBe(1);
    expect(paginate(45, "-4", 20).page).toBe(1);
    expect(paginate(0, "3", 20)).toMatchObject({ page: 1, pages: 1, skip: 0 });
  });

  it("découpe une liste en mémoire", () => {
    expect(pageSlice([1, 2, 3, 4, 5], "2", 2).items).toEqual([3, 4]);
  });
});

describe("pageNumbers", () => {
  it("affiche toutes les pages quand il y en a peu", () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("remplace les trous par « … » autour de la page courante", () => {
    expect(pageNumbers(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, "…", 12]);
    expect(pageNumbers(12, 12)).toEqual([1, "…", 11, 12]);
  });

  it("n'utilise jamais « … » pour une seule page manquante", () => {
    expect(pageNumbers(4, 12)).toEqual([1, 2, 3, 4, 5, "…", 12]);
  });

  it("version mobile : première, courante et dernière", () => {
    expect(pageNumbers(6, 12, 0)).toEqual([1, "…", 6, "…", 12]);
  });
});
