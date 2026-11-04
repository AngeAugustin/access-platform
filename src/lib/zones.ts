// Zones d'intervention proposées aux éducateurs et aux tuteurs : les 77 communes du Bénin, plus le détail des quartiers
// des grandes communes du Sud. Chaque quartier s'écrit « Quartier (Commune) » : la recherche des familles par quartier ou par commune la retrouve.
// Pas de virgule dans les libellés : la sélection est enregistrée sous la forme « A, B, C ».
const QUARTERS: Record<string, string[]> = {
  Cotonou: [
    "Abokicodji",
    "Agbato",
    "Agla",
    "Agontinkon",
    "Ahouansori",
    "Aïdjèdo",
    "Akogbato",
    "Akpakpa",
    "Avotrou",
    "Ayélawadjè",
    "Cadjèhoun",
    "Cocotiers",
    "Dandji",
    "Dantokpa",
    "Dédokpo",
    "Dégakon",
    "Djèdjèlayé",
    "Djomèhountin",
    "Enagnon",
    "Fidjrossè",
    "Fifadji",
    "Gankpodo",
    "Ganhi",
    "Gbèdjromèdé",
    "Gbégamey",
    "Gbèto",
    "Guinkomey",
    "Haie Vive",
    "Hlazounto",
    "Houéyiho",
    "Jéricho",
    "Kindonou",
    "Kouhounou",
    "Kowégbo",
    "Kpondéhou",
    "Ladji",
    "Mènontin",
    "Midombo",
    "Minonkpo",
    "Missèbo",
    "Missessin",
    "Patte d'Oie",
    "Placodji",
    "Saint-Michel",
    "Sainte-Cécile",
    "Sainte-Rita",
    "Sègbèya",
    "Sènadé",
    "Sikècodji",
    "Suru-Léré",
    "Tokpa-Hoho",
    "Tokplégbé",
    "Vèdoko",
    "Vossa",
    "Xwlacodji",
    "Yénawa",
    "Zogbo",
    "Zogbohouè",
    "Zongo",
  ],
  "Abomey-Calavi": [
    "Adjagbo",
    "Agori",
    "Aïtchédji",
    "Akassato",
    "Arconville",
    "Atrokpocodji",
    "Bidossessi",
    "Calavi Centre",
    "Cococodji",
    "Cocotomey",
    "Djadjo",
    "Glo-Djigbé",
    "Godomey",
    "Hêvié",
    "Houèto",
    "Kansoukpa",
    "Kpanroun",
    "Ouèdo",
    "Tankpè",
    "Togba",
    "Togbin",
    "Tokan",
    "Womey",
    "Zinvié",
    "Zogbadjè",
    "Zopah",
  ],
  "Sèmè-Podji": ["Agblangandan", "Djèrègbé", "Ekpè", "PK10", "Sèmè-Podji Centre", "Tohouè"],
  "Porto-Novo": ["Djègan-Kpèvi", "Dowa", "Houinmè", "Ouando", "Porto-Novo Centre", "Tokpota"],
  Ouidah: ["Ouidah Centre", "Pahou", "Savi"],
};

// Les 77 communes, par département.
export const COMMUNES_BY_DEPARTMENT: Record<string, string[]> = {
  Alibori: ["Banikoara", "Gogounou", "Kandi", "Karimama", "Malanville", "Ségbana"],
  Atacora: ["Boukoumbé", "Cobly", "Kérou", "Kouandé", "Matéri", "Natitingou", "Péhunco", "Tanguiéta", "Toucountouna"],
  Atlantique: ["Abomey-Calavi", "Allada", "Kpomassè", "Ouidah", "Sô-Ava", "Toffo", "Tori-Bossito", "Zè"],
  Borgou: ["Bembèrèkè", "Kalalé", "N'Dali", "Nikki", "Parakou", "Pèrèrè", "Sinendé", "Tchaourou"],
  Collines: ["Bantè", "Dassa-Zoumè", "Glazoué", "Ouèssè", "Savalou", "Savè"],
  Couffo: ["Aplahoué", "Djakotomey", "Dogbo", "Klouékanmè", "Lalo", "Toviklin"],
  Donga: ["Bassila", "Copargo", "Djougou", "Ouaké"],
  Littoral: ["Cotonou"],
  Mono: ["Athiémé", "Bopa", "Comè", "Grand-Popo", "Houéyogbé", "Lokossa"],
  Ouémé: ["Adjarra", "Adjohoun", "Aguégués", "Akpro-Missérété", "Avrankou", "Bonou", "Dangbo", "Porto-Novo", "Sèmè-Podji"],
  Plateau: ["Adja-Ouèrè", "Ifangni", "Kétou", "Pobè", "Sakété"],
  Zou: ["Abomey", "Agbangnizoun", "Bohicon", "Covè", "Djidja", "Ouinhi", "Za-Kpota", "Zagnanado", "Zogbodomey"],
};

export const COMMUNES: string[] = Object.values(COMMUNES_BY_DEPARTMENT)
  .flat()
  .sort((a, b) => a.localeCompare(b, "fr"));

// Toute une commune d'abord (pour qui se déplace partout), puis les quartiers détaillés.
export const ZONES: string[] = [
  ...COMMUNES.map((commune) => `${commune} (toute la commune)`),
  ...Object.entries(QUARTERS).flatMap(([commune, quarters]) => quarters.map((q) => `${q} (${commune})`)),
];

export const parseZones = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
