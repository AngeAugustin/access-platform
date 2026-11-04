import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { loadCurriculum } from "@/lib/curriculum";

// Une seule lecture du référentiel par requête, quel que soit le nombre de composants qui l'utilisent.
export const getCurriculum = cache(() => loadCurriculum(db));
