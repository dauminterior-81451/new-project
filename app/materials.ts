export type MaterialCategory =
  | "board"
  | "gypsum"
  | "insulation"
  | "lumber"
  | "supply";

export type MaterialUnit = "장" | "단" | "개" | "박스";

export type Material = {
  id: string;
  category: MaterialCategory;
  name: string;
  size: string;
  thickness?: string;
  unit: MaterialUnit;
  bundleCount?: number;
  price: number | null;
  note?: string;
};

export const materials: Material[] = [
  {
    id: "mdf-5t",
    category: "board",
    name: "MDF 5T",
    size: "1220x2440",
    thickness: "5T",
    unit: "장",
    price: 14800,
  },
  {
    id: "mdf-9t",
    category: "board",
    name: "MDF 9T",
    size: "1220x2440",
    thickness: "9T",
    unit: "장",
    price: 20900,
  },
  {
    id: "mdf-12t",
    category: "board",
    name: "MDF 12T",
    size: "1220x2440",
    thickness: "12T",
    unit: "장",
    price: 31500,
  },
  {
    id: "plywood-9t",
    category: "board",
    name: "합판 9T",
    size: "1220x2440",
    thickness: "9T",
    unit: "장",
    price: 28300,
  },
  {
    id: "plywood-12t",
    category: "board",
    name: "합판 12T",
    size: "1220x2440",
    thickness: "12T",
    unit: "장",
    price: 39800,
  },
  {
    id: "plywood-18t",
    category: "board",
    name: "합판 18T",
    size: "1220x2440",
    thickness: "18T",
    unit: "장",
    price: 54000,
  },
  {
    id: "yoko-plywood",
    category: "board",
    name: "요꼬합판",
    size: "1200x2400",
    thickness: "두께미정",
    unit: "장",
    price: 21000,
  },
  {
    id: "sheetrock-9-5t",
    category: "gypsum",
    name: "시트락석고",
    size: "900x1800",
    thickness: "9.5T",
    unit: "장",
    price: 4400,
  },
  {
    id: "waterproof-gypsum-9-5t",
    category: "gypsum",
    name: "방수석고",
    size: "900x1800",
    thickness: "9.5T",
    unit: "장",
    price: 7000,
  },
  {
    id: "isopink-10t",
    category: "insulation",
    name: "아이소핑크",
    size: "900x1800",
    thickness: "10T",
    unit: "장",
    price: 4000,
  },
  {
    id: "isopink-30t",
    category: "insulation",
    name: "아이소핑크",
    size: "900x1800",
    thickness: "30T",
    unit: "장",
    price: 9300,
  },
  {
    id: "isopink-50t",
    category: "insulation",
    name: "아이소핑크",
    size: "900x1800",
    thickness: "50T",
    unit: "장",
    price: 16500,
  },
  {
    id: "isopink-100t",
    category: "insulation",
    name: "아이소핑크",
    size: "900x1800",
    thickness: "100T",
    unit: "장",
    price: 29000,
    note: "가견적 적용",
  },
  {
    id: "sosong-8",
    category: "lumber",
    name: "소송 8자",
    size: "30x30x2400",
    unit: "단",
    bundleCount: 12,
    price: 29200,
  },
  {
    id: "sosong-12",
    category: "lumber",
    name: "소송 12자",
    size: "30x30x3600",
    unit: "단",
    bundleCount: 12,
    price: 39400,
  },
  {
    id: "one-chi-lumber",
    category: "lumber",
    name: "한치 각재",
    size: "30x30x1자",
    unit: "단",
    bundleCount: 12,
    price: null,
    note: "별도",
  },
  {
    id: "two-by",
    category: "lumber",
    name: "투바이",
    size: "30x60x1자",
    unit: "단",
    bundleCount: 6,
    price: null,
    note: "별도",
  },
  {
    id: "foam-darukki",
    category: "lumber",
    name: "폼다루끼",
    size: "40x40 현장재단",
    unit: "단",
    bundleCount: 9,
    price: null,
    note: "별도",
  },
  {
    id: "foam-bond",
    category: "supply",
    name: "폼본드",
    size: "1개",
    unit: "개",
    price: 7500,
  },
  {
    id: "silicone-white",
    category: "supply",
    name: "실리콘 백색",
    size: "1개",
    unit: "개",
    price: 2900,
  },
  {
    id: "silicone-clear",
    category: "supply",
    name: "실리콘 투명",
    size: "1개",
    unit: "개",
    price: 2800,
  },
  {
    id: "wood-bond",
    category: "supply",
    name: "목공본드",
    size: "1개",
    unit: "개",
    price: 2600,
  },
  {
    id: "staple-422",
    category: "supply",
    name: "타카핀 422",
    size: "1박스",
    unit: "박스",
    price: 5300,
  },
  {
    id: "staple-f30",
    category: "supply",
    name: "타카핀 F30",
    size: "1박스",
    unit: "박스",
    price: 5800,
  },
  {
    id: "staple-t57",
    category: "supply",
    name: "타카핀 T57",
    size: "1박스",
    unit: "박스",
    price: 17000,
  },
  {
    id: "flat-molding",
    category: "supply",
    name: "평몰딩",
    size: "1개",
    unit: "개",
    price: 2200,
  },
];

export const gypsumMaterials = materials.filter(
  (material) => material.category === "gypsum",
);

export const defaultLumber = materials.find(
  (material) => material.id === "sosong-12",
);
