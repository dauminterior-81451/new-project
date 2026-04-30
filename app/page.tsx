"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  loadMaterialPriceSettings,
  loadSavedProjects,
  loadSavedZones,
  saveMaterialPriceSettings,
  saveSavedProjects,
  saveSavedZones,
} from "@/lib/storage/materialStorage";
import { materials, type MaterialCategory } from "./materials";

type WorkType = "ceiling" | "wall";
type JoistSpacing = 300 | 450 | null;
type GypsumLayer = 1 | 2;
type LumberSelection = "auto" | "sosong-8" | "sosong-12";
type CeilingAreaUnit = "m2" | "mm2";
type LumberSpecKey = "sosong-8" | "sosong-12";
type SheetMaterialCategory = Extract<
  MaterialCategory,
  "board" | "gypsum" | "insulation"
>;

type MaterialPriceSettings = {
  updatedAt: string | null;
  materials: ManagedMaterial[];
  prices?: Record<string, number | null>;
};

type ManagedMaterial = {
  id: string;
  category: MaterialCategory;
  name: string;
  size: string;
  width?: number;
  height?: number;
  length?: number;
  thickness?: string;
  unit: string;
  bundleCount?: number;
  piecesPerBundle?: number;
  price: number | null;
  note?: string;
  updatedAt?: string;
};

const LUMBER_LENGTH_BY_ID = {
  "sosong-8": 2400,
  "sosong-12": 3600,
} as const;

const SHEET_CATEGORY_LABELS: Record<SheetMaterialCategory, string> = {
  board: "목재류",
  gypsum: "석고보드류",
  insulation: "단열재류",
};

const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  board: "목재류",
  gypsum: "석고보드류",
  insulation: "단열재류",
  lumber: "목상류",
  supply: "부자재류",
};

const LUMBER_SPEC_TOTALS_TEMPLATE: Record<LumberSpecKey, LumberSpecTotal> = {
  "sosong-8": {
    name: "소송 8자",
    lengthMm: 2400,
    bundleCount: 12,
    pieces: 0,
    orderBundles: 0,
    amount: 0,
  },
  "sosong-12": {
    name: "소송 12자",
    lengthMm: 3600,
    bundleCount: 12,
    pieces: 0,
    orderBundles: 0,
    amount: 0,
  },
};

type SavedEstimate = {
  id: string;
  savedAt: string;
  materialPriceSnapshot?: MaterialPriceSettings;
  siteName: string;
  zoneName: string;
  workType: WorkType;
  widthMm: number;
  depthOrHeightMm: number;
  ceilingArea?: number;
  ceilingAreaUnit?: CeilingAreaUnit;
  convertedAreaM2?: number;
  ceilingLumberLengthMm?: number;
  lumberCalculationMethod?: "cad-total-length" | "area-estimate" | "wall-layout";
  joistSpacing: JoistSpacing;
  sheetCategory: SheetMaterialCategory;
  sheetMaterialId?: string;
  sheetMaterialSnapshot?: ManagedMaterial;
  sheetMaterialName: string;
  sheetMaterialSize: string;
  sheetMaterialThickness?: string;
  sheetMaterialUnit?: string;
  sheetMaterialPrice: number;
  sheetQuantity: number;
  sheetAmount: number;
  lossRateSnapshot?: number;
  lumberName: string;
  lumberSpecId?: LumberSpecKey;
  lumberLengthMm?: number;
  lumberBundleCount?: number;
  lumberPieces: number;
  lumberOrderBundles: number;
  lumberAmount: number;
  totalAmount: number;
};

type LumberSpecTotal = {
  name: string;
  lengthMm: number;
  bundleCount: number;
  pieces: number;
  orderBundles: number;
  amount: number;
};

type ProjectZoneSnapshot = {
  zoneId: string;
  siteName: string;
  zoneName: string;
  workType: WorkType;
  sheetCategory: SheetMaterialCategory;
  sheetCategoryName: string;
  sheetMaterialId?: string;
  sheetMaterialName: string;
  sheetMaterialWidthMm: number;
  sheetMaterialHeightMm: number;
  sheetMaterialThickness: string;
  sheetMaterialUnit: string;
  sheetMaterialPrice: number;
  inputWidthMm?: number;
  inputHeightMm?: number;
  inputArea?: number;
  areaUnit?: CeilingAreaUnit;
  convertedAreaM2: number;
  sheetQuantity: number;
  sheetAmount: number;
  materialCategory: SheetMaterialCategory;
  materialName: string;
  materialSize: string;
  unitPriceSnapshot: number;
  quantitySnapshot: number;
  materialAmountSnapshot: number;
  lossRateSnapshot: number;
  boardCountSnapshot: number;
  joistSpacing: JoistSpacing;
  lumberSpecId: LumberSpecKey;
  lumberSpecName: string;
  lumberLengthMm: number;
  lumberBundleCount: number;
  lumberPieces: number;
  lumberOrderBundles: number;
  lumberAmount: number;
  totalAmount: number;
  woodSpacingSnapshot: JoistSpacing;
  woodSizeSnapshot: string;
  woodRequiredCountSnapshot: number;
  woodOrderBundleSnapshot: number;
  woodAmountSnapshot: number;
  zoneTotalSnapshot: number;
};

type ProjectTotalsSnapshot = {
  materialQuantityTotals: Record<string, number>;
  sheetTotalAmount: number;
  lumberTotals: {
    pieces: number;
    orderBundles: number;
    amount: number;
  };
  lumberSpecTotals: Record<LumberSpecKey, LumberSpecTotal>;
  totalMaterialAmount: number;
};

type ProjectSummarySnapshot = {
  materialTotals: Record<string, number>;
  woodTotals: {
    pieces: number;
    orderBundles: number;
    amount: number;
    bySpec: Record<LumberSpecKey, LumberSpecTotal>;
  };
  sheetTotalAmount: number;
  totalAmount: number;
};

type SavedProject = {
  id?: string;
  name?: string;
  createdAt?: string;
  projectId: string;
  projectSaveName?: string;
  projectName?: string;
  savedAt: string;
  materialPriceSnapshot?: MaterialPriceSettings;
  siteName: string;
  zones?: SavedEstimate[];
  zonesSnapshot?: ProjectZoneSnapshot[];
  totalsSnapshot?: ProjectTotalsSnapshot;
  summarySnapshot?: ProjectSummarySnapshot;
  materialQuantityTotals: Record<string, number>;
  lumberTotals: {
    pieces: number;
    orderBundles: number;
    amount?: number;
  };
  lumberSpecTotals?: Record<LumberSpecKey, LumberSpecTotal>;
  sheetTotalAmount: number;
  lumberTotalAmount: number;
  totalMaterialAmount: number;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);

const formatAmountInput = (value: number | null) =>
  value === null ? "" : new Intl.NumberFormat("ko-KR").format(value);

const parseAmountInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "");

  return digitsOnly === "" ? null : Number(digitsOnly);
};

const formatDateTime = (value: string | null) =>
  value ? value.slice(0, 16).replace("T", " ") : "기본 단가 사용 중";

const toPositiveNumber = (value: string) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const countLines = (spanMm: number, spacingMm: number) =>
  spanMm > 0 ? Math.ceil(spanMm / spacingMm) + 1 : 0;

const getSheetSize = (size: string) => {
  const [width = 0, height = 0] = size.split("x").map(Number);

  return {
    width,
    height,
    area: width > 0 && height > 0 ? (width * height) / 1_000_000 : 0,
  };
};

const createSavedEstimateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptyLumberSpecTotals = () => ({
  "sosong-8": { ...LUMBER_SPEC_TOTALS_TEMPLATE["sosong-8"] },
  "sosong-12": { ...LUMBER_SPEC_TOTALS_TEMPLATE["sosong-12"] },
});

const createMaterialId = () =>
  `material-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const parseSizeParts = (size: string) => {
  const [widthText = "", heightText = "", lengthText = ""] = size.split("x");
  const width = Number(widthText);
  const height = Number(heightText);
  const length = Number(lengthText);

  return {
    width: Number.isFinite(width) && width > 0 ? width : undefined,
    height: Number.isFinite(height) && height > 0 ? height : undefined,
    length: Number.isFinite(length) && length > 0 ? length : undefined,
  };
};

const buildMaterialSize = (material: ManagedMaterial) => {
  if (material.category === "supply") {
    return material.size.trim() || material.unit || "1개";
  }

  if (material.category === "lumber") {
    const width = material.width ?? 0;
    const height = material.height ?? 0;
    const length = material.length ?? 0;

    return width > 0 && height > 0 && length > 0
      ? `${width}x${height}x${length}`
      : material.size.trim();
  }

  const width = material.width ?? 0;
  const height = material.height ?? 0;

  return width > 0 && height > 0 ? `${width}x${height}` : material.size.trim();
};

const getMaterialSpecDisplay = (material: ManagedMaterial) => {
  if (material.category === "lumber") {
    const bundleCount = material.piecesPerBundle ?? material.bundleCount;

    return bundleCount
      ? `${material.size} / 1단 ${formatNumber(bundleCount)}본`
      : material.size;
  }

  if (material.thickness) {
    return `${material.size} / ${material.thickness}`;
  }

  return material.size;
};

const normalizeMaterial = (
  material: Partial<ManagedMaterial>,
  fallbackIndex: number,
): ManagedMaterial => {
  const category = material.category ?? "board";
  const size = typeof material.size === "string" ? material.size : "";
  const sizeParts = parseSizeParts(size);
  const bundleCount = material.bundleCount ?? material.piecesPerBundle;
  const width =
    typeof material.width === "number" && Number.isFinite(material.width)
      ? material.width
      : sizeParts.width;
  const height =
    typeof material.height === "number" && Number.isFinite(material.height)
      ? material.height
      : sizeParts.height;
  const length =
    typeof material.length === "number" && Number.isFinite(material.length)
      ? material.length
      : sizeParts.length;
  const normalizedBundleCount =
    typeof bundleCount === "number" && Number.isFinite(bundleCount)
      ? bundleCount
      : undefined;
  const nextMaterial: ManagedMaterial = {
    id: material.id || `material-${fallbackIndex + 1}`,
    category,
    name: material.name?.trim() || "이름 미입력",
    size,
    width,
    height,
    length,
    thickness: material.thickness ?? "",
    unit: material.unit || (category === "supply" ? "개" : "장"),
    bundleCount: normalizedBundleCount,
    piecesPerBundle: normalizedBundleCount,
    price:
      typeof material.price === "number" && Number.isFinite(material.price)
        ? material.price
        : null,
    note: material.note,
    updatedAt: material.updatedAt,
  };

  return {
    ...nextMaterial,
    size: buildMaterialSize(nextMaterial),
  };
};

const normalizeMaterials = (sourceMaterials: Partial<ManagedMaterial>[]) => {
  const usedIds = new Set<string>();

  return sourceMaterials.map((material, index) => {
    const normalized = normalizeMaterial(material, index);

    if (usedIds.has(normalized.id)) {
      normalized.id = `${normalized.id}-${index + 1}`;
    }

    usedIds.add(normalized.id);

    return normalized;
  });
};

const createDefaultManagedMaterials = () =>
  normalizeMaterials(materials as Partial<ManagedMaterial>[]);

const createDefaultMaterialPriceSettings = (): MaterialPriceSettings => ({
  updatedAt: null,
  materials: createDefaultManagedMaterials(),
});

const parseMaterialPriceSettings = (
  value: Partial<MaterialPriceSettings> | null,
): MaterialPriceSettings | null => {
  if (!value) {
    return null;
  }

  const parsed = value;

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (Array.isArray(parsed.materials)) {
    return {
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      materials: normalizeMaterials(parsed.materials),
    };
  }

  if (!parsed.prices) {
    return null;
  }

  const legacyMaterials = createDefaultManagedMaterials().map((material) => {
    const price = parsed.prices?.[material.id];

    return {
      ...material,
      price:
        typeof price === "number" && Number.isFinite(price)
          ? price
          : price === null
            ? null
            : material.price,
    };
  });

  return {
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    materials: legacyMaterials,
  };
};

const getLumberSpecId = (estimate: SavedEstimate): LumberSpecKey => {
  if (estimate.lumberSpecId) {
    return estimate.lumberSpecId;
  }

  if (
    estimate.lumberLengthMm === LUMBER_LENGTH_BY_ID["sosong-8"] ||
    estimate.lumberName.includes("8")
  ) {
    return "sosong-8";
  }

  return "sosong-12";
};

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getProjectDisplayName = (project: SavedProject) =>
  project.name || project.projectSaveName || project.projectName || project.siteName;

const getEstimateSheetMaterialName = (
  estimate: Pick<
    SavedEstimate,
    | "sheetMaterialId"
    | "sheetMaterialName"
    | "sheetMaterialSnapshot"
    | "sheetCategory"
  >,
  managedMaterials: ManagedMaterial[] = [],
) =>
  estimate.sheetMaterialSnapshot?.name ||
  managedMaterials.find((material) => material.id === estimate.sheetMaterialId)
    ?.name ||
  materials.find((material) => material.id === estimate.sheetMaterialId)?.name ||
  estimate.sheetMaterialName ||
  SHEET_CATEGORY_LABELS[estimate.sheetCategory];

const getEstimateAreaM2 = (estimate: SavedEstimate) =>
  estimate.convertedAreaM2 ??
  (estimate.widthMm * estimate.depthOrHeightMm) / 1_000_000;

const createZoneSnapshot = (estimate: SavedEstimate): ProjectZoneSnapshot => {
  const material = materials.find(
    (candidate) =>
      candidate.category === estimate.sheetCategory &&
      candidate.name === estimate.sheetMaterialName &&
      candidate.size === estimate.sheetMaterialSize,
  );
  const sheetSize = getSheetSize(estimate.sheetMaterialSize);
  const lumberSpecId = getLumberSpecId(estimate);
  const lumberSpec = LUMBER_SPEC_TOTALS_TEMPLATE[lumberSpecId];

  return {
    zoneId: estimate.id,
    siteName: estimate.siteName,
    zoneName: estimate.zoneName,
    workType: estimate.workType,
    sheetCategory: estimate.sheetCategory,
    sheetCategoryName: SHEET_CATEGORY_LABELS[estimate.sheetCategory],
    sheetMaterialId: estimate.sheetMaterialId,
    sheetMaterialName: estimate.sheetMaterialName,
    sheetMaterialWidthMm: sheetSize.width,
    sheetMaterialHeightMm: sheetSize.height,
    sheetMaterialThickness:
      estimate.sheetMaterialThickness ?? material?.thickness ?? "두께미정",
    sheetMaterialUnit: estimate.sheetMaterialUnit ?? material?.unit ?? "장",
    sheetMaterialPrice: estimate.sheetMaterialPrice,
    inputWidthMm: estimate.workType === "wall" ? estimate.widthMm : undefined,
    inputHeightMm:
      estimate.workType === "wall" ? estimate.depthOrHeightMm : undefined,
    inputArea: estimate.workType === "ceiling" ? estimate.ceilingArea : undefined,
    areaUnit: estimate.workType === "ceiling" ? estimate.ceilingAreaUnit : undefined,
    convertedAreaM2: getEstimateAreaM2(estimate),
    sheetQuantity: estimate.sheetQuantity,
    sheetAmount: estimate.sheetAmount,
    materialCategory: estimate.sheetCategory,
    materialName: estimate.sheetMaterialName,
    materialSize: estimate.sheetMaterialSize,
    unitPriceSnapshot: estimate.sheetMaterialPrice,
    quantitySnapshot: estimate.sheetQuantity,
    materialAmountSnapshot: estimate.sheetAmount,
    lossRateSnapshot: estimate.lossRateSnapshot ?? 0,
    boardCountSnapshot: estimate.sheetQuantity,
    joistSpacing: estimate.joistSpacing,
    lumberSpecId,
    lumberSpecName: estimate.lumberName || lumberSpec.name,
    lumberLengthMm: estimate.lumberLengthMm ?? lumberSpec.lengthMm,
    lumberBundleCount: estimate.lumberBundleCount ?? lumberSpec.bundleCount,
    lumberPieces: estimate.lumberPieces,
    lumberOrderBundles: estimate.lumberOrderBundles,
    lumberAmount: estimate.lumberAmount,
    totalAmount: estimate.totalAmount,
    woodSpacingSnapshot: estimate.joistSpacing,
    woodSizeSnapshot: estimate.lumberName || lumberSpec.name,
    woodRequiredCountSnapshot: estimate.lumberPieces,
    woodOrderBundleSnapshot: estimate.lumberOrderBundles,
    woodAmountSnapshot: estimate.lumberAmount,
    zoneTotalSnapshot: estimate.totalAmount,
  };
};

const createTotalsSnapshot = (
  zonesSnapshot: ProjectZoneSnapshot[],
): ProjectTotalsSnapshot => {
  const materialQuantityTotals = zonesSnapshot.reduce<Record<string, number>>(
    (accumulator, zone) => {
      accumulator[zone.sheetMaterialName] =
        (accumulator[zone.sheetMaterialName] ?? 0) + zone.sheetQuantity;

      return accumulator;
    },
    {},
  );
  const lumberSpecTotals = zonesSnapshot.reduce<
    Record<LumberSpecKey, LumberSpecTotal>
  >((accumulator, zone) => {
    const specTotal = accumulator[zone.lumberSpecId];

    specTotal.pieces += zone.lumberPieces;
    specTotal.orderBundles += zone.lumberOrderBundles;
    specTotal.amount += zone.lumberAmount;

    return accumulator;
  }, createEmptyLumberSpecTotals());
  const sheetTotalAmount = zonesSnapshot.reduce(
    (sum, zone) => sum + zone.sheetAmount,
    0,
  );
  const lumberAmount = zonesSnapshot.reduce(
    (sum, zone) => sum + zone.lumberAmount,
    0,
  );

  return {
    materialQuantityTotals,
    sheetTotalAmount,
    lumberTotals: {
      pieces: zonesSnapshot.reduce((sum, zone) => sum + zone.lumberPieces, 0),
      orderBundles: zonesSnapshot.reduce(
        (sum, zone) => sum + zone.lumberOrderBundles,
        0,
      ),
      amount: lumberAmount,
    },
    lumberSpecTotals,
    totalMaterialAmount: sheetTotalAmount + lumberAmount,
  };
};

const createSummarySnapshot = (
  totalsSnapshot: ProjectTotalsSnapshot,
): ProjectSummarySnapshot => ({
  materialTotals: deepCopy(totalsSnapshot.materialQuantityTotals),
  woodTotals: {
    pieces: totalsSnapshot.lumberTotals.pieces,
    orderBundles: totalsSnapshot.lumberTotals.orderBundles,
    amount: totalsSnapshot.lumberTotals.amount,
    bySpec: deepCopy(totalsSnapshot.lumberSpecTotals),
  },
  sheetTotalAmount: totalsSnapshot.sheetTotalAmount,
  totalAmount: totalsSnapshot.totalMaterialAmount,
});

const getProjectZonesSnapshot = (project: SavedProject) =>
  deepCopy(project.zonesSnapshot ?? project.zones?.map(createZoneSnapshot) ?? []);

const getProjectTotalsSnapshot = (project: SavedProject) => {
  if (project.summarySnapshot) {
    return {
      materialQuantityTotals: deepCopy(project.summarySnapshot.materialTotals),
      sheetTotalAmount: project.summarySnapshot.sheetTotalAmount,
      lumberTotals: {
        pieces: project.summarySnapshot.woodTotals.pieces,
        orderBundles: project.summarySnapshot.woodTotals.orderBundles,
        amount: project.summarySnapshot.woodTotals.amount,
      },
      lumberSpecTotals: deepCopy(project.summarySnapshot.woodTotals.bySpec),
      totalMaterialAmount: project.summarySnapshot.totalAmount,
    };
  }

  return deepCopy(
    project.totalsSnapshot ?? createTotalsSnapshot(getProjectZonesSnapshot(project)),
  );
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const createProjectPdfHtml = (
  project: SavedProject,
  zonesSnapshot: ProjectZoneSnapshot[],
  totalsSnapshot: ProjectTotalsSnapshot,
) => {
  const projectName = escapeHtml(getProjectDisplayName(project));
  const materialRows = Object.entries(totalsSnapshot.materialQuantityTotals)
    .map(
      ([materialName, quantity]) =>
        `<tr><td>${escapeHtml(materialName)}</td><td class="right">${formatNumber(
          quantity,
        )}장</td></tr>`,
    )
    .join("");
  const lumberRows = (
    Object.entries(totalsSnapshot.lumberSpecTotals) as [
      LumberSpecKey,
      LumberSpecTotal,
    ][]
  )
    .map(
      ([, specTotal]) => `<tr>
        <td>${escapeHtml(specTotal.name)}</td>
        <td class="right">${formatNumber(specTotal.pieces)}본</td>
        <td class="right">${formatNumber(specTotal.orderBundles)}단</td>
      </tr>`,
    )
    .join("");
  const zoneRows = zonesSnapshot
    .map(
      (zone) => `<tr>
        <td>${escapeHtml(zone.zoneName)}</td>
        <td>${zone.workType === "ceiling" ? "천장" : "벽체"}</td>
        <td>${escapeHtml(zone.sheetMaterialName)}</td>
        <td>${formatNumber(zone.sheetMaterialWidthMm)}x${formatNumber(
          zone.sheetMaterialHeightMm,
        )}mm / ${escapeHtml(zone.sheetMaterialThickness)}</td>
        <td class="right">${formatNumber(zone.sheetQuantity)}장</td>
        <td class="right">${formatCurrency(zone.sheetAmount)}</td>
        <td>${escapeHtml(zone.lumberSpecName)}</td>
        <td class="right">${formatNumber(zone.lumberPieces)}본</td>
        <td class="right">${formatNumber(zone.lumberOrderBundles)}단</td>
        <td class="right">${formatCurrency(zone.lumberAmount)}</td>
        <td class="right">${formatCurrency(zone.totalAmount)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>${projectName}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body {
            font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", Arial, sans-serif;
            color: #1d1d1b;
            font-size: 12px;
          }
          h1 { font-size: 22px; margin: 0 0 6px; }
          h2 { font-size: 15px; margin: 18px 0 8px; }
          p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { border: 1px solid #cfcac0; padding: 6px; vertical-align: top; }
          th { background: #f4f1eb; text-align: left; }
          .right { text-align: right; white-space: nowrap; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
          .box { border: 1px solid #cfcac0; padding: 8px; background: #fbfaf7; }
          .box strong { display: block; font-size: 14px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>${projectName}</h1>
        <p>저장일시: ${escapeHtml(project.savedAt.slice(0, 16).replace("T", " "))}</p>
        <p>현장명: ${escapeHtml(project.siteName)}</p>

        <div class="summary">
          <div class="box">구역 수<strong>${formatNumber(zonesSnapshot.length)}개</strong></div>
          <div class="box">판재 총액<strong>${formatCurrency(totalsSnapshot.sheetTotalAmount)}</strong></div>
          <div class="box">소송 총액<strong>${formatCurrency(totalsSnapshot.lumberTotals.amount)}</strong></div>
          <div class="box">전체 자재 총액<strong>${formatCurrency(totalsSnapshot.totalMaterialAmount)}</strong></div>
        </div>

        <h2>구역별 상세 산출표</h2>
        <table>
          <thead>
            <tr>
              <th>구역명</th>
              <th>시공</th>
              <th>자재명</th>
              <th>자재 사이즈</th>
              <th>필요 장수</th>
              <th>판재 금액</th>
              <th>소송 규격</th>
              <th>필요 본수</th>
              <th>발주 단수</th>
              <th>소송 금액</th>
              <th>구역 총액</th>
            </tr>
          </thead>
          <tbody>${zoneRows}</tbody>
        </table>

        <h2>전체 자재 합계</h2>
        <table>
          <thead><tr><th>자재명</th><th>필요 장수</th></tr></thead>
          <tbody>${materialRows || '<tr><td colspan="2">저장된 자재가 없습니다.</td></tr>'}</tbody>
        </table>

        <h2>소송 8자/12자별 합계</h2>
        <table>
          <thead><tr><th>소송 규격</th><th>필요 본수</th><th>발주 단수</th></tr></thead>
          <tbody>${lumberRows}</tbody>
        </table>
      </body>
    </html>`;
};

export default function Home() {
  const [siteName, setSiteName] = useState("다움인테리어");
  const [spaceName, setSpaceName] = useState("거실 천장");
  const [workType, setWorkType] = useState<WorkType>("ceiling");
  const [widthMm, setWidthMm] = useState("3600");
  const [depthOrHeightMm, setDepthOrHeightMm] = useState("2400");
  const [ceilingArea, setCeilingArea] = useState("8.64");
  const [ceilingAreaUnit, setCeilingAreaUnit] =
    useState<CeilingAreaUnit>("m2");
  const [ceilingLumberLengthMm, setCeilingLumberLengthMm] = useState("");
  const [joistSpacing, setJoistSpacing] = useState<JoistSpacing>(300);
  const [lumberSelection, setLumberSelection] =
    useState<LumberSelection>("auto");
  const [sheetCategory, setSheetCategory] =
    useState<SheetMaterialCategory>("gypsum");
  const [sheetMaterialId, setSheetMaterialId] = useState("sheetrock-9-5t");
  const [gypsumLayer, setGypsumLayer] = useState<GypsumLayer>(1);
  const [lossRate, setLossRate] = useState("10");
  const [projectSaveName, setProjectSaveName] = useState("");
  const [projectSaveNameError, setProjectSaveNameError] = useState("");
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [materialPriceSettings, setMaterialPriceSettings] =
    useState<MaterialPriceSettings>(() => createDefaultMaterialPriceSettings());
  const [materialEditorValues, setMaterialEditorValues] = useState<
    ManagedMaterial[]
  >(() => createDefaultManagedMaterials());
  const [isPriceManagerOpen, setIsPriceManagerOpen] = useState(false);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const projectImportInputRef = useRef<HTMLInputElement | null>(null);

  const pricedMaterials = materialPriceSettings.materials;
  const sheetMaterials = pricedMaterials.filter(
    (material) => material.category === sheetCategory,
  );
  const selectedSheetMaterial =
    sheetMaterials.find((material) => material.id === sheetMaterialId) ??
    sheetMaterials[0];
  const selectedSheetSize = getSheetSize(selectedSheetMaterial?.size ?? "");
  const recommendedLumberId = workType === "ceiling" ? "sosong-12" : "sosong-8";
  const selectedLumberId =
    lumberSelection === "auto" ? recommendedLumberId : lumberSelection;
  const selectedLumber =
    pricedMaterials.find((material) => material.id === selectedLumberId) ??
    pricedMaterials.find((material) => material.id === "sosong-12");
  const selectedLumberLength =
    selectedLumber?.length ??
    LUMBER_LENGTH_BY_ID[selectedLumberId as keyof typeof LUMBER_LENGTH_BY_ID] ??
    0;
  const selectedLumberBundleCount =
    selectedLumber?.piecesPerBundle ?? selectedLumber?.bundleCount ?? 12;
  const selectedLumberName = selectedLumber?.name ?? "";
  const selectedLumberPrice = selectedLumber?.price ?? 0;
  const selectedSheetArea = selectedSheetSize.area;
  const selectedSheetPrice = selectedSheetMaterial?.price ?? 0;

  const result = (() => {
    const width = toPositiveNumber(widthMm);
    const depthOrHeight = toPositiveNumber(depthOrHeightMm);
    const ceilingAreaInput = toPositiveNumber(ceilingArea);
    const convertedCeilingArea =
      ceilingAreaUnit === "mm2" ? ceilingAreaInput / 1_000_000 : ceilingAreaInput;
    const wallArea = (width * depthOrHeight) / 1_000_000;
    const lossMultiplier = 1 + Math.max(0, Number(lossRate) || 0) / 100;
    const area = workType === "ceiling" ? convertedCeilingArea : wallArea;
    const sheetQuantity =
      selectedSheetArea > 0
        ? Math.ceil((area / selectedSheetArea) * gypsumLayer * lossMultiplier)
        : 0;

    const spacing = joistSpacing;
    const hasJoistSpacing = spacing !== null;
    const ceilingLumberInput = toPositiveNumber(ceilingLumberLengthMm);
    const horizontalLineCount = workType === "ceiling" ? 0 : 2;
    const verticalLineCount =
      workType === "ceiling" || !hasJoistSpacing
        ? 0
        : countLines(width, spacing);
    const estimatedCeilingLumberLength = hasJoistSpacing
      ? Math.ceil((area * 2 * 1_000_000) / spacing)
      : 0;
    const lumberLength = hasJoistSpacing
      ? workType === "ceiling"
        ? ceilingLumberInput || estimatedCeilingLumberLength
        : verticalLineCount * depthOrHeight + width * 2
      : 0;
    const lumberCalculationMethod: NonNullable<
      SavedEstimate["lumberCalculationMethod"]
    > =
      workType === "ceiling"
        ? ceilingLumberInput > 0
          ? "cad-total-length"
          : "area-estimate"
        : "wall-layout";
    const lumberPieces =
      hasJoistSpacing && selectedLumberLength > 0
        ? Math.ceil(lumberLength / selectedLumberLength)
        : 0;
    const actualBundles =
      selectedLumberBundleCount > 0 ? lumberPieces / selectedLumberBundleCount : 0;
    const orderBundles = Math.ceil(actualBundles);

    const sheetAmount = sheetQuantity * selectedSheetPrice;
    const lumberAmount = hasJoistSpacing ? actualBundles * selectedLumberPrice : 0;

    return {
      area,
      sheetQuantity,
      sheetAmount,
      lumberPieces,
      actualBundles,
      orderBundles,
      lumberAmount,
      totalAmount: sheetAmount + lumberAmount,
      spacing,
      horizontalLineCount,
      verticalLineCount,
      lumberLength,
      lumberCalculationMethod,
      ceilingAreaInput,
      ceilingAreaUnit,
      convertedCeilingArea,
      width,
      depthOrHeight,
      selectedLumberName,
      selectedLumberLength,
    };
  })();

  const totalSummary = (() => {
    const byMaterial = savedEstimates.reduce<Record<string, number>>(
      (accumulator, estimate) => {
        const materialName = getEstimateSheetMaterialName(
          estimate,
          pricedMaterials,
        );

        accumulator[materialName] =
          (accumulator[materialName] ?? 0) + estimate.sheetQuantity;

        return accumulator;
      },
      {},
    );
    const byLumberSpec = savedEstimates.reduce<Record<LumberSpecKey, LumberSpecTotal>>(
      (accumulator, estimate) => {
        const specId = getLumberSpecId(estimate);
        const specTotal = accumulator[specId];

        specTotal.pieces += estimate.lumberPieces;
        specTotal.orderBundles += estimate.lumberOrderBundles;
        specTotal.amount += estimate.lumberAmount;

        return accumulator;
      },
      createEmptyLumberSpecTotals(),
    );

    return {
      totalSheetQuantity: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.sheetQuantity,
        0,
      ),
      totalLumberPieces: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.lumberPieces,
        0,
      ),
      totalLumberOrderBundles: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.lumberOrderBundles,
        0,
      ),
      totalSheetAmount: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.sheetAmount,
        0,
      ),
      totalLumberAmount: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.lumberAmount,
        0,
      ),
      totalAmount: savedEstimates.reduce(
        (sum, estimate) => sum + estimate.totalAmount,
        0,
      ),
      byMaterial,
      byLumberSpec,
    };
  })();
  const selectedProject =
    savedProjects.find((project) => project.projectId === selectedProjectId) ??
    null;

  useEffect(() => {
    window.queueMicrotask(async () => {
      const savedMaterialPriceSettings = parseMaterialPriceSettings(
        await loadMaterialPriceSettings<Partial<MaterialPriceSettings>>(),
      );

      if (savedMaterialPriceSettings) {
        setMaterialPriceSettings(savedMaterialPriceSettings);
        setMaterialEditorValues(deepCopy(savedMaterialPriceSettings.materials));
      }

      setSavedEstimates(await loadSavedZones<SavedEstimate>());
      setSavedProjects(await loadSavedProjects<SavedProject>());

      setIsStorageLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveSavedZones(savedEstimates);
  }, [isStorageLoaded, savedEstimates]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    saveSavedProjects(savedProjects);
  }, [isStorageLoaded, savedProjects]);

  useEffect(() => {
    const nextSheetMaterials = pricedMaterials.filter(
      (material) => material.category === sheetCategory,
    );

    if (
      sheetMaterialId &&
      nextSheetMaterials.some((material) => material.id === sheetMaterialId)
    ) {
      return;
    }

    setSheetMaterialId(nextSheetMaterials[0]?.id ?? "");
  }, [pricedMaterials, sheetCategory, sheetMaterialId]);

  const handleOpenPriceManager = () => {
    setMaterialEditorValues(deepCopy(pricedMaterials));
    setIsPriceManagerOpen(true);
  };

  const handleSaveMaterialPrices = async () => {
    console.log("Material price save handler started");

    const updatedAt = new Date().toISOString();
    const normalizedMaterials = normalizeMaterials(materialEditorValues).map(
      (material) => ({
        ...material,
        updatedAt,
      }),
    );
    const nextSettings: MaterialPriceSettings = {
      updatedAt,
      materials: normalizedMaterials,
    };

    setMaterialPriceSettings(nextSettings);
    setMaterialEditorValues(deepCopy(normalizedMaterials));
    console.log("Calling saveMaterialPriceSettings", nextSettings);
    await saveMaterialPriceSettings(nextSettings);
    setIsPriceManagerOpen(false);
  };

  const handleRestoreDefaultMaterialPrices = () => {
    const nextSettings = {
      ...createDefaultMaterialPriceSettings(),
      updatedAt: new Date().toISOString(),
    };

    setMaterialPriceSettings(nextSettings);
    setMaterialEditorValues(deepCopy(nextSettings.materials));
    saveMaterialPriceSettings(nextSettings);
  };

  const handleAddMaterial = () => {
    const now = new Date().toISOString();
    const defaultCategory: MaterialCategory = "board";

    setMaterialEditorValues((currentMaterials) => [
      ...currentMaterials,
      normalizeMaterial(
        {
          id: createMaterialId(),
          category: defaultCategory,
          name: "새 자재",
          size: "900x1800",
          width: 900,
          height: 1800,
          thickness: "",
          unit: "장",
          price: 0,
          updatedAt: now,
        },
        currentMaterials.length,
      ),
    ]);
  };

  const handleChangeEditorMaterial = (
    materialId: string,
    updates: Partial<ManagedMaterial>,
  ) => {
    setMaterialEditorValues((currentMaterials) =>
      currentMaterials.map((material) =>
        material.id === materialId
          ? {
              ...material,
              ...updates,
            }
          : material,
      ),
    );
  };

  const handleDeleteEditorMaterial = (materialId: string) => {
    if (!window.confirm("이 자재를 삭제하시겠습니까?")) {
      return;
    }

    setMaterialEditorValues((currentMaterials) =>
      currentMaterials.filter((material) => material.id !== materialId),
    );
  };

  const handleSaveEstimate = () => {
    const nextEstimate: SavedEstimate = {
      id: createSavedEstimateId(),
      savedAt: new Date().toISOString(),
      materialPriceSnapshot: deepCopy(materialPriceSettings),
      siteName: siteName.trim() || "현장명 미입력",
      zoneName: spaceName.trim() || "구역명 미입력",
      workType,
      widthMm: workType === "wall" ? toPositiveNumber(widthMm) : 0,
      depthOrHeightMm:
        workType === "wall" ? toPositiveNumber(depthOrHeightMm) : 0,
      ceilingArea: workType === "ceiling" ? result.ceilingAreaInput : undefined,
      ceilingAreaUnit: workType === "ceiling" ? result.ceilingAreaUnit : undefined,
      convertedAreaM2:
        workType === "ceiling" ? result.convertedCeilingArea : result.area,
      ceilingLumberLengthMm:
        workType === "ceiling"
          ? toPositiveNumber(ceilingLumberLengthMm) || undefined
          : undefined,
      lumberCalculationMethod: result.lumberCalculationMethod,
      joistSpacing,
      sheetCategory,
      sheetMaterialId: selectedSheetMaterial?.id,
      sheetMaterialSnapshot: selectedSheetMaterial
        ? deepCopy(selectedSheetMaterial)
        : undefined,
      sheetMaterialName: selectedSheetMaterial?.name ?? "",
      sheetMaterialSize: selectedSheetMaterial?.size ?? "",
      sheetMaterialThickness: selectedSheetMaterial?.thickness ?? "두께미정",
      sheetMaterialUnit: selectedSheetMaterial?.unit ?? "장",
      sheetMaterialPrice: selectedSheetMaterial?.price ?? 0,
      sheetQuantity: result.sheetQuantity,
      sheetAmount: result.sheetAmount,
      lossRateSnapshot: Math.max(0, Number(lossRate) || 0),
      lumberName: result.selectedLumberName,
      lumberSpecId: selectedLumberId,
      lumberLengthMm: result.selectedLumberLength,
      lumberBundleCount: selectedLumberBundleCount,
      lumberPieces: result.lumberPieces,
      lumberOrderBundles: result.orderBundles,
      lumberAmount: result.lumberAmount,
      totalAmount: result.totalAmount,
    };

    setSavedEstimates((currentEstimates) => [
      ...currentEstimates,
      nextEstimate,
    ]);
  };

  const handleDeleteEstimate = (estimateId: string) => {
    setSavedEstimates((currentEstimates) =>
      currentEstimates.filter((estimate) => estimate.id !== estimateId),
    );
  };

  const handleSaveProject = () => {
    if (savedEstimates.length === 0) {
      return;
    }

    const trimmedProjectSaveName = projectSaveName.trim();

    if (!trimmedProjectSaveName) {
      setProjectSaveNameError("전체 저장 이름을 입력해주세요.");
      return;
    }

    const projectId = createSavedEstimateId();
    const createdAt = new Date().toISOString();
    const zonesSnapshot = deepCopy(savedEstimates.map(createZoneSnapshot));
    const totalsSnapshot = deepCopy(createTotalsSnapshot(zonesSnapshot));
    const summarySnapshot = deepCopy(createSummarySnapshot(totalsSnapshot));

    const nextProject: SavedProject = {
      id: projectId,
      name: trimmedProjectSaveName,
      createdAt,
      projectId,
      projectSaveName: trimmedProjectSaveName,
      projectName: trimmedProjectSaveName,
      savedAt: createdAt,
      materialPriceSnapshot: deepCopy(materialPriceSettings),
      siteName: siteName.trim() || savedEstimates[0]?.siteName || "현장명 미입력",
      zonesSnapshot,
      totalsSnapshot,
      summarySnapshot,
      materialQuantityTotals: deepCopy(summarySnapshot.materialTotals),
      lumberTotals: deepCopy(summarySnapshot.woodTotals),
      lumberSpecTotals: deepCopy(summarySnapshot.woodTotals.bySpec),
      sheetTotalAmount: summarySnapshot.sheetTotalAmount,
      lumberTotalAmount: summarySnapshot.woodTotals.amount,
      totalMaterialAmount: summarySnapshot.totalAmount,
    };

    setSavedProjects((currentProjects) => [nextProject, ...currentProjects]);
  };

  const handleChangeProjectName = (projectId: string, projectName: string) => {
    setSavedProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.projectId === projectId
          ? {
              ...project,
              name: projectName,
              projectName,
              projectSaveName: projectName,
            }
          : project,
      ),
    );
  };

  const handleDeleteProject = (projectId: string) => {
    setSavedProjects((currentProjects) =>
      currentProjects.filter((project) => project.projectId !== projectId),
    );
  };

  const handleExportProjectsJson = () => {
    const today = new Date();
    const dateText = `${today.getFullYear()}${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    const blob = new Blob([JSON.stringify(savedProjects, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `material-saved-projects-${dateText}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportProjectsJson = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedProjects = Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as { savedProjects?: unknown }).savedProjects)
          ? (parsed as { savedProjects: unknown[] }).savedProjects
          : null;

      if (!importedProjects) {
        window.alert("저장 프로젝트 JSON 형식이 올바르지 않습니다.");
        return;
      }

      setSavedProjects((currentProjects) => {
        const usedIds = new Set(
          currentProjects.flatMap((project) =>
            [project.id, project.projectId].filter(Boolean),
          ),
        );
        const nextImportedProjects = importedProjects.map((project) => {
          const importedProject = project as SavedProject;
          const currentId =
            importedProject.id || importedProject.projectId || createSavedEstimateId();
          const nextId = usedIds.has(currentId) ? createSavedEstimateId() : currentId;

          usedIds.add(nextId);

          return {
            ...deepCopy(importedProject),
            id: nextId,
            projectId: nextId,
          };
        });

        return [...nextImportedProjects, ...currentProjects];
      });
    } catch {
      window.alert("JSON 파일을 읽을 수 없습니다.");
    }
  };

  const handlePrintProjectPdf = (project: SavedProject) => {
    const zonesSnapshot = getProjectZonesSnapshot(project);
    const totalsSnapshot = getProjectTotalsSnapshot(project);
    const printableWindow = window.open("", "_blank", "width=1120,height=900");

    if (!printableWindow) {
      return;
    }

    printableWindow.document.write(
      createProjectPdfHtml(project, zonesSnapshot, totalsSnapshot),
    );
    printableWindow.document.close();
    printableWindow.focus();
    printableWindow.setTimeout(() => {
      printableWindow.print();
    }, 250);
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#1d1d1b]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b border-black/10 pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2f6a57]">
              Daum Interior Material Calculator
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              목공 자재 산출 프로그램
            </h1>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <p className="text-xs font-medium text-black/55">
              소송 기준: 천장 12자 추천 / 벽체 8자 추천 / 1단 12본
            </p>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <p className="text-xs font-semibold text-black/50">
                마지막 단가 수정일:{" "}
                {formatDateTime(materialPriceSettings.updatedAt)}
              </p>
              <button
                type="button"
                onClick={handleOpenPriceManager}
                className="h-9 rounded-md bg-[#2f6a57] px-3 text-sm font-bold text-white transition-colors hover:bg-[#245342]"
              >
                자재 단가 관리
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <section className="grid gap-3">
            <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold">
                  현장명
                  <input
                    value={siteName}
                    onChange={(event) => setSiteName(event.currentTarget.value)}
                    onInput={(event) => setSiteName(event.currentTarget.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold">
                  구역명
                  <input
                    value={spaceName}
                    onChange={(event) => setSpaceName(event.currentTarget.value)}
                    onInput={(event) => setSpaceName(event.currentTarget.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                  />
                </label>

                <fieldset className="grid gap-1 text-xs font-semibold">
                  <legend>시공 타입</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      ["ceiling", "천장"],
                      ["wall", "벽체"],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className="flex h-9 items-center justify-center rounded-md border border-black/15 text-sm has-[:checked]:border-[#2f6a57] has-[:checked]:bg-[#e4f0eb]"
                      >
                        <input
                          type="radio"
                          name="workType"
                          value={value}
                          checked={workType === value}
                          onChange={() => setWorkType(value as WorkType)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="grid gap-1 text-xs font-semibold">
                  <legend>자재군</legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      Object.entries(SHEET_CATEGORY_LABELS) as [
                        SheetMaterialCategory,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex h-9 items-center justify-center rounded-md border border-black/15 px-1 text-center text-xs has-[:checked]:border-[#2f6a57] has-[:checked]:bg-[#e4f0eb]"
                      >
                        <input
                          type="radio"
                          name="sheetCategory"
                          value={value}
                          checked={sheetCategory === value}
                          onChange={() => {
                            const nextMaterials = pricedMaterials.filter(
                              (material) => material.category === value,
                            );

                            setSheetCategory(value);
                            setSheetMaterialId(nextMaterials[0]?.id ?? "");
                          }}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
                  자재 선택
                  <select
                    value={selectedSheetMaterial?.id ?? ""}
                    onChange={(event) => setSheetMaterialId(event.target.value)}
                    className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                  >
                    {sheetMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} / {material.thickness ?? "두께미정"} /{" "}
                        {formatCurrency(material.price ?? 0)}
                      </option>
                    ))}
                  </select>
                </label>

                {workType === "ceiling" && (
                  <>
                    <label className="grid gap-1 text-xs font-semibold">
                      천장 면적
                      <input
                        type="number"
                        min="0"
                        value={ceilingArea}
                        onChange={(event) => setCeilingArea(event.target.value)}
                        className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                      />
                    </label>
                    <fieldset className="grid gap-1 text-xs font-semibold">
                      <legend>면적 단위</legend>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          ["m2", "㎡"],
                          ["mm2", "㎟"],
                        ].map(([value, label]) => (
                          <label
                            key={value}
                            className="flex h-9 items-center justify-center rounded-md border border-black/15 text-sm has-[:checked]:border-[#2f6a57] has-[:checked]:bg-[#e4f0eb]"
                          >
                            <input
                              type="radio"
                              name="ceilingAreaUnit"
                              value={value}
                              checked={ceilingAreaUnit === value}
                              onChange={() =>
                                setCeilingAreaUnit(value as CeilingAreaUnit)
                              }
                              className="sr-only"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
                      목상 총 길이(mm, 선택)
                      <input
                        type="number"
                        min="0"
                        value={ceilingLumberLengthMm}
                        onChange={(event) =>
                          setCeilingLumberLengthMm(event.target.value)
                        }
                        placeholder="CAD 총 목상 길이를 알 때만 입력"
                        className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                      />
                    </label>
                  </>
                )}

                {workType === "wall" && (
                  <>
                    <label className="grid gap-1 text-xs font-semibold">
                      벽체 가로 길이(mm)
                      <input
                        type="number"
                        min="0"
                        value={widthMm}
                        onChange={(event) => setWidthMm(event.target.value)}
                        className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold">
                      벽체 높이(mm)
                      <input
                        type="number"
                        min="0"
                        value={depthOrHeightMm}
                        onChange={(event) => setDepthOrHeightMm(event.target.value)}
                        className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                      />
                    </label>
                  </>
                )}

                <fieldset className="grid gap-1 text-xs font-semibold">
                  <legend>목상 간격</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[300, 450].map((spacing) => (
                      <button
                        type="button"
                        key={spacing}
                        onClick={() =>
                          setJoistSpacing((currentSpacing) =>
                            currentSpacing === spacing
                              ? null
                              : (spacing as JoistSpacing),
                          )
                        }
                        className={`flex h-9 items-center justify-center rounded-md border border-black/15 text-sm ${
                          joistSpacing === spacing
                            ? "border-[#2f6a57] bg-[#e4f0eb]"
                            : ""
                        }`}
                      >
                        {spacing}mm
                      </button>
                    ))}
                  </div>
                  {joistSpacing === null ? (
                    <p className="text-xs font-bold text-[#2f6a57]">목상 없음</p>
                  ) : null}
                </fieldset>

                <fieldset className="grid gap-1 text-xs font-semibold">
                  <legend>소송 규격</legend>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      ["auto", "자동"],
                      ["sosong-8", "8자"],
                      ["sosong-12", "12자"],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className="flex h-9 items-center justify-center rounded-md border border-black/15 text-center text-sm has-[:checked]:border-[#2f6a57] has-[:checked]:bg-[#e4f0eb]"
                      >
                        <input
                          type="radio"
                          name="lumberSelection"
                          value={value}
                          checked={lumberSelection === value}
                          onChange={() =>
                            setLumberSelection(value as LumberSelection)
                          }
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="grid gap-1 text-xs font-semibold">
                  <legend>자재 겹수</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[1, 2].map((layer) => (
                      <label
                        key={layer}
                        className="flex h-9 items-center justify-center rounded-md border border-black/15 text-sm has-[:checked]:border-[#2f6a57] has-[:checked]:bg-[#e4f0eb]"
                      >
                        <input
                          type="radio"
                          name="gypsumLayer"
                          value={layer}
                          checked={gypsumLayer === layer}
                          onChange={() => setGypsumLayer(layer as GypsumLayer)}
                          className="sr-only"
                        />
                        {layer}P
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="grid gap-1 text-xs font-semibold">
                  로스율(%)
                  <input
                    type="number"
                    min="0"
                    value={lossRate}
                    onChange={(event) => setLossRate(event.target.value)}
                    className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-[#1f2421] p-3 text-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-white/10 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94d0bb]">계산 결과</p>
                  <h2 className="text-base font-semibold">
                    {siteName || "현장명"} / {spaceName || "구역명"}
                  </h2>
                </div>
                <p className="text-xs text-white/58">
                  {workType === "ceiling"
                    ? "천장 면적 기준 계산"
                    : "벽체 세로 스터드 계산"}
                </p>
              </div>

              <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {workType === "ceiling" ? (
                  <>
                    <ResultRow
                      label="입력 면적"
                      value={`${formatNumber(result.ceilingAreaInput)} ${
                        result.ceilingAreaUnit === "m2" ? "㎡" : "㎟"
                      }`}
                    />
                    <ResultRow
                      label="환산 면적"
                      value={`${formatNumber(result.convertedCeilingArea)} ㎡`}
                    />
                    <ResultRow
                      label="목상 계산"
                      value={
                        result.lumberCalculationMethod === "cad-total-length"
                          ? "CAD 총길이 기준"
                          : "면적 기준 추정값"
                      }
                    />
                  </>
                ) : (
                  <>
                    <ResultRow
                      label="벽체 가로"
                      value={`${formatNumber(result.width)}mm`}
                    />
                    <ResultRow
                      label="벽체 높이"
                      value={`${formatNumber(result.depthOrHeight)}mm`}
                    />
                    <ResultRow
                      label="벽체 면적"
                      value={`${formatNumber(result.area)} ㎡`}
                    />
                    <ResultRow
                      label="벽체 목상"
                      value="세로 다테 + 상하단 런너"
                    />
                  </>
                )}
                <ResultRow
                  label="목상 간격"
                  value={
                    result.spacing === null
                      ? "목상 없음"
                      : `${formatNumber(result.spacing)}mm`
                  }
                />
                <ResultRow
                  label="목상 총 길이"
                  value={`${formatNumber(result.lumberLength)}mm`}
                />
                <ResultRow
                  label="소송 규격"
                  value={`${result.selectedLumberName}${
                    lumberSelection === "auto" ? " (자동)" : ""
                  }`}
                />
                <ResultRow
                  label="소송 1본 길이"
                  value={`${formatNumber(result.selectedLumberLength)}mm`}
                />
                <ResultRow
                  label="자재명"
                  value={selectedSheetMaterial?.name ?? ""}
                />
                <ResultRow
                  label="자재 크기"
                  value={`${formatNumber(selectedSheetSize.width)}x${formatNumber(
                    selectedSheetSize.height,
                  )}mm`}
                />
                <ResultRow
                  label="필요 장수"
                  value={`${formatNumber(result.sheetQuantity)}장`}
                />
                <ResultRow
                  label="소송 발주"
                  value={`${formatNumber(result.orderBundles)}단`}
                />
                <ResultRow
                  label="판재 금액"
                  value={formatCurrency(result.sheetAmount)}
                />
                <ResultRow
                  label="소송 금액"
                  value={formatCurrency(result.lumberAmount)}
                />
              </dl>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-stretch">
                <div className="rounded-md bg-[#f2d16b] px-3 py-2 text-[#1d1d1b]">
                  <dt className="text-xs font-bold">총 자재 금액</dt>
                  <dd className="text-xl font-bold">
                    {formatCurrency(result.totalAmount)}
                  </dd>
                </div>
                <button
                  type="button"
                  onClick={handleSaveEstimate}
                  className="h-10 rounded-md bg-[#94d0bb] px-5 text-sm font-bold text-[#1d1d1b] transition-colors hover:bg-[#b4e3d2] sm:h-auto"
                >
                  저장
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-rows-[minmax(0,1fr)_auto_auto]">
            <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#2f6a57]">
                    Saved zones
                  </p>
                  <h2 className="text-lg font-semibold">저장된 구역 목록</h2>
                </div>
                <p className="text-xs font-semibold text-black/52">
                  {formatNumber(savedEstimates.length)}개 구역
                </p>
              </div>

              <div className="mt-2 grid max-h-[46vh] gap-2 overflow-y-auto pr-1 lg:max-h-[52vh]">
                {savedEstimates.length === 0 ? (
                  <p className="rounded-md bg-[#fbfaf7] p-3 text-sm text-black/58">
                    저장된 구역이 없습니다. 계산 결과를 저장하면 여기에 누적됩니다.
                  </p>
                ) : (
                  savedEstimates.map((estimate) => (
                    <article
                      key={estimate.id}
                      className="rounded-md border border-black/10 bg-[#fbfaf7] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold">
                            {estimate.zoneName}
                          </h3>
                          <p className="mt-0.5 truncate text-xs text-black/56">
                            {estimate.siteName} /{" "}
                            {estimate.workType === "ceiling" ? "천장" : "벽체"} /{" "}
                            {estimate.sheetMaterialName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEstimate(estimate.id)}
                          className="h-8 shrink-0 rounded-md border border-black/15 px-2 text-xs font-semibold transition-colors hover:bg-white"
                        >
                          삭제
                        </button>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
                        <SummaryItem
                          label="필요 장수"
                          value={`${formatNumber(estimate.sheetQuantity)}장`}
                        />
                        <SummaryItem
                          label="소송 규격"
                          value={
                            LUMBER_SPEC_TOTALS_TEMPLATE[
                              getLumberSpecId(estimate)
                            ].name
                          }
                        />
                        <SummaryItem
                          label="필요 본수"
                          value={`${formatNumber(estimate.lumberPieces)}본`}
                        />
                        <SummaryItem
                          label="소송 발주"
                          value={`${formatNumber(
                            estimate.lumberOrderBundles,
                          )}단`}
                        />
                        <SummaryItem
                          label="총 금액"
                          value={formatCurrency(estimate.totalAmount)}
                        />
                        <SummaryItem
                          label={estimate.workType === "ceiling" ? "면적" : "규격"}
                          value={
                            estimate.workType === "ceiling"
                              ? `${formatNumber(
                                  estimate.convertedAreaM2 ?? 0,
                                )}㎡`
                              : `${formatNumber(
                                  estimate.widthMm,
                                )}x${formatNumber(estimate.depthOrHeightMm)}mm`
                          }
                        />
                      </dl>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-[#1f2421] p-3 text-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                <div>
                  <p className="text-xs font-bold text-[#94d0bb]">Totals</p>
                  <h2 className="text-lg font-semibold">전체 합계</h2>
                </div>
                <div className="rounded-md bg-[#f2d16b] px-3 py-2 text-right text-[#1d1d1b]">
                  <dt className="text-xs font-bold">전체 금액</dt>
                  <dd className="text-lg font-bold">
                    {formatCurrency(totalSummary.totalAmount)}
                  </dd>
                </div>
              </div>
              <label className="mt-2 grid gap-1 text-xs font-semibold text-white">
                전체 저장 이름
                <input
                  value={projectSaveName}
                  onChange={(event) => {
                    setProjectSaveName(event.currentTarget.value);
                    if (projectSaveNameError) {
                      setProjectSaveNameError("");
                    }
                  }}
                  onInput={(event) => {
                    setProjectSaveName(event.currentTarget.value);
                    if (projectSaveNameError) {
                      setProjectSaveNameError("");
                    }
                  }}
                  placeholder="예: 버드네 아파트 천장 자재"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 rounded-md border border-white/15 bg-white px-2 text-sm font-normal text-[#1d1d1b] outline-none focus:border-[#94d0bb]"
                />
              </label>
              {projectSaveNameError ? (
                <p className="mt-1 text-xs font-semibold text-[#f2d16b]">
                  {projectSaveNameError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={savedEstimates.length === 0}
                className="mt-2 h-9 w-full rounded-md bg-[#94d0bb] px-3 text-sm font-bold text-[#1d1d1b] transition-colors hover:bg-[#b4e3d2] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
              >
                전체 저장
              </button>
              <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <ResultRow
                  label="총 판재 수량"
                  value={`${formatNumber(totalSummary.totalSheetQuantity)}장`}
                />
                <ResultRow
                  label="소송 본수"
                  value={`${formatNumber(totalSummary.totalLumberPieces)}본`}
                />
                <ResultRow
                  label="소송 발주"
                  value={`${formatNumber(
                    totalSummary.totalLumberOrderBundles,
                  )}단`}
                />
                <ResultRow
                  label="판재 총액"
                  value={formatCurrency(totalSummary.totalSheetAmount)}
                />
                <ResultRow
                  label="소송 총액"
                  value={formatCurrency(totalSummary.totalLumberAmount)}
                />
              </dl>
              <div className="mt-2 grid gap-2">
                {(
                  Object.entries(totalSummary.byLumberSpec) as [
                    LumberSpecKey,
                    LumberSpecTotal,
                  ][]
                ).map(([specId, specTotal]) => (
                  <div key={specId} className="rounded-md bg-white/7 p-2">
                    <p className="text-xs font-bold text-white/72">
                      {specTotal.name} 합계
                    </p>
                    <dl className="mt-1 grid gap-1 sm:grid-cols-3">
                      <ResultRow
                        label="필요 본수"
                        value={`${formatNumber(specTotal.pieces)}본`}
                      />
                      <ResultRow
                        label="발주 단수"
                        value={`${formatNumber(specTotal.orderBundles)}단`}
                      />
                      <ResultRow
                        label="금액"
                        value={formatCurrency(specTotal.amount)}
                      />
                    </dl>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-md bg-white/7 p-2">
                <p className="text-xs font-bold text-white/72">자재별 수량 합계</p>
                <div className="mt-1 grid gap-1">
                  {Object.entries(totalSummary.byMaterial).length === 0 ? (
                    <p className="text-xs text-white/50">저장된 자재가 없습니다.</p>
                  ) : (
                    Object.entries(totalSummary.byMaterial).map(
                      ([materialName, quantity]) => (
                        <div
                          key={materialName}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="truncate text-white/62">
                            {materialName}
                          </span>
                          <span className="font-semibold">
                            {formatNumber(quantity)}장
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#2f6a57]">
                    Saved projects
                  </p>
                  <h2 className="text-lg font-semibold">전체 저장 목록</h2>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <p className="text-xs font-semibold text-black/52">
                    {formatNumber(savedProjects.length)}개
                  </p>
                  <button
                    type="button"
                    onClick={handleExportProjectsJson}
                    className="h-8 rounded-md border border-black/15 px-2 text-xs font-semibold transition-colors hover:bg-[#fbfaf7]"
                  >
                    JSON 내보내기
                  </button>
                  <button
                    type="button"
                    onClick={() => projectImportInputRef.current?.click()}
                    className="h-8 rounded-md border border-black/15 px-2 text-xs font-semibold transition-colors hover:bg-[#fbfaf7]"
                  >
                    JSON 가져오기
                  </button>
                  <input
                    ref={projectImportInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportProjectsJson}
                    className="sr-only"
                  />
                </div>
              </div>
              <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto pr-1">
                {savedProjects.length === 0 ? (
                  <p className="rounded-md bg-[#fbfaf7] p-3 text-sm text-black/58">
                    전체 저장된 프로젝트가 없습니다.
                  </p>
                ) : (
                  savedProjects.map((project) => (
                    <article
                      key={project.projectId}
                      className="rounded-md border border-black/10 bg-[#fbfaf7] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <label className="grid gap-1 text-xs font-semibold text-black/48">
                            저장 이름
                            <input
                              value={getProjectDisplayName(project)}
                              onChange={(event) =>
                                handleChangeProjectName(
                                  project.projectId,
                                  event.currentTarget.value,
                                )
                              }
                              onInput={(event) =>
                                handleChangeProjectName(
                                  project.projectId,
                                  event.currentTarget.value,
                                )
                              }
                              autoComplete="off"
                              spellCheck={false}
                              className="h-8 min-w-0 rounded-md border border-black/15 bg-white px-2 text-sm font-semibold text-[#1d1d1b] outline-none focus:border-[#2f6a57]"
                            />
                          </label>
                          <p className="mt-0.5 text-xs text-black/56">
                            {project.savedAt.slice(0, 16).replace("T", " ")} /{" "}
                            {formatNumber(
                              getProjectZonesSnapshot(project).length,
                            )}
                            개 구역
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.projectId)}
                          className="h-8 shrink-0 rounded-md border border-black/15 px-2 text-xs font-semibold transition-colors hover:bg-white"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProjectId((currentProjectId) =>
                              currentProjectId === project.projectId
                                ? null
                                : project.projectId,
                            )
                          }
                          className="h-8 rounded-md border border-black/15 px-2 text-xs font-semibold transition-colors hover:bg-white"
                        >
                          {selectedProjectId === project.projectId
                            ? "상세 닫기"
                            : "상세 보기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintProjectPdf(project)}
                          className="h-8 rounded-md bg-[#2f6a57] px-2 text-xs font-semibold text-white transition-colors hover:bg-[#245342]"
                        >
                          PDF 다운로드
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-md bg-white px-2 py-1.5 text-xs">
                        <span className="font-semibold text-black/48">
                          전체 자재 총액
                        </span>
                        <span className="font-bold">
                          {formatCurrency(
                            getProjectTotalsSnapshot(project).totalMaterialAmount,
                          )}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
      {selectedProject ? (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProjectId(null)}
        />
      ) : null}
      {isPriceManagerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-3 py-4">
          <section className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] rounded-lg bg-white shadow-xl">
            <div className="flex flex-col gap-2 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#2f6a57]">
                  Material prices
                </p>
                <h2 className="text-lg font-semibold">자재 단가 관리</h2>
                <p className="mt-1 text-xs font-semibold text-black/52">
                  마지막 단가 수정일:{" "}
                  {formatDateTime(materialPriceSettings.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceManagerOpen(false)}
                className="h-9 rounded-md border border-black/15 px-3 text-sm font-semibold transition-colors hover:bg-[#fbfaf7]"
              >
                닫기
              </button>
            </div>

            <div className="overflow-y-auto overflow-x-hidden p-4">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="h-9 rounded-md bg-[#f2d16b] px-3 text-sm font-bold text-[#1d1d1b] transition-colors hover:bg-[#f6dc87]"
                >
                  자재 추가
                </button>
              </div>
              <div className="grid gap-2">
                {materialEditorValues.map((material) => (
                  <article
                    key={material.id}
                    className="grid gap-2 rounded-md border border-black/10 bg-[#fbfaf7] p-3"
                  >
                    <div className="grid gap-2">
                      <div className="grid gap-2 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.45fr)]">
                        <label className="grid gap-1 text-xs font-semibold text-black/58">
                          자재군
                          <select
                            value={material.category}
                            onChange={(event) =>
                              handleChangeEditorMaterial(material.id, {
                                category: event.currentTarget
                                  .value as MaterialCategory,
                              })
                            }
                            className="h-9 min-w-0 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                          >
                            {(
                              Object.entries(MATERIAL_CATEGORY_LABELS) as [
                                MaterialCategory,
                                string,
                              ][]
                            ).map(([category, label]) => (
                              <option key={category} value={category}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-black/58">
                          자재명
                          <input
                            value={material.name}
                            onChange={(event) =>
                              handleChangeEditorMaterial(material.id, {
                                name: event.currentTarget.value,
                              })
                            }
                            className="h-9 min-w-0 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-black/58">
                          규격
                          <input
                            value={material.size}
                            onChange={(event) =>
                              handleChangeEditorMaterial(material.id, {
                                size: event.currentTarget.value,
                              })
                            }
                            className="h-9 min-w-0 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                            placeholder="1220x2440 / 9T"
                          />
                        </label>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[120px_minmax(180px,240px)_96px] sm:items-end sm:justify-end">
                        <label className="grid gap-1 text-xs font-semibold text-black/58">
                          단위
                          <input
                            value={material.unit}
                            onChange={(event) =>
                              handleChangeEditorMaterial(material.id, {
                                unit: event.currentTarget.value,
                              })
                            }
                            className="h-9 min-w-0 rounded-md border border-black/15 bg-white px-2 text-sm font-normal outline-none focus:border-[#2f6a57]"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-black/58">
                          현재 단가
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatAmountInput(material.price)}
                            onFocus={() => {
                              if (material.price === 0) {
                                handleChangeEditorMaterial(material.id, {
                                  price: null,
                                });
                              }
                            }}
                            onChange={(event) =>
                              handleChangeEditorMaterial(material.id, {
                                price: parseAmountInput(
                                  event.currentTarget.value,
                                ),
                              })
                            }
                            onBlur={() => {
                              if (material.price === null) {
                                handleChangeEditorMaterial(material.id, {
                                  price: 0,
                                });
                              }
                            }}
                            className="h-9 min-w-0 rounded-md border border-black/15 bg-white px-2 text-right text-sm font-semibold outline-none focus:border-[#2f6a57]"
                            placeholder="단가 없음"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteEditorMaterial(material.id)}
                          className="h-9 w-full rounded-md border border-black/15 px-3 text-sm font-semibold transition-colors hover:bg-white sm:w-24"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-black/48">
                      현재 규격 표시: {getMaterialSpecDisplay(material)}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleRestoreDefaultMaterialPrices}
                className="h-9 rounded-md border border-black/15 px-3 text-sm font-semibold transition-colors hover:bg-[#fbfaf7]"
              >
                기본 단가 복구
              </button>
              <button
                type="button"
                onClick={handleSaveMaterialPrices}
                className="h-9 rounded-md bg-[#2f6a57] px-5 text-sm font-bold text-white transition-colors hover:bg-[#245342]"
              >
                저장
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 rounded-md bg-white/7 px-2.5 py-1.5">
      <dt className="text-xs text-white/62">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5">
      <dt className="text-[11px] font-semibold text-black/48">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-semibold text-[#1d1d1b]">
        {value}
      </dd>
    </div>
  );
}

function ProjectDetail({
  project,
  onClose,
}: {
  project: SavedProject;
  onClose: () => void;
}) {
  const zonesSnapshot = getProjectZonesSnapshot(project);
  const totalsSnapshot = getProjectTotalsSnapshot(project);
  const materialQuantityTotalEntries = Object.entries(
    totalsSnapshot.materialQuantityTotals,
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-x-auto bg-black/45 px-3 py-4"
      onClick={onClose}
    >
      <section
        className="grid max-h-[85vh] w-[min(96vw,1120px)] min-w-[900px] grid-rows-[auto_minmax(0,1fr)] rounded-lg bg-white text-xs shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 p-4">
          <div className="grid gap-1 text-black/62">
            <p>
              <span className="font-semibold text-black/48">저장 이름: </span>
              {getProjectDisplayName(project)}
            </p>
            <p>
              <span className="font-semibold text-black/48">저장일시: </span>
              {project.savedAt.slice(0, 16).replace("T", " ")}
            </p>
            <p>
              <span className="font-semibold text-black/48">현장명: </span>
              {project.siteName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 shrink-0 rounded-md border border-black/15 px-3 text-sm font-semibold transition-colors hover:bg-[#fbfaf7]"
          >
            닫기
          </button>
        </div>

        <div className="grid gap-2 overflow-y-auto p-4">
          <div className="grid gap-1">
            <p className="font-bold text-[#2f6a57]">저장 당시 구역 목록</p>
            {zonesSnapshot.map((zone) => (
              <div
                key={zone.zoneId}
                className="grid gap-1 rounded-md bg-[#fbfaf7] p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{zone.zoneName}</p>
                  <p className="text-black/52">
                    {zone.workType === "ceiling" ? "천장" : "벽체"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-1 md:grid-cols-3">
                  <SummaryItem label="자재명" value={zone.sheetMaterialName} />
                  <SummaryItem
                    label="자재 사이즈"
                    value={`${formatNumber(zone.sheetMaterialWidthMm)}x${formatNumber(
                      zone.sheetMaterialHeightMm,
                    )}mm`}
                  />
                  <SummaryItem
                    label="필요 장수"
                    value={`${formatNumber(zone.sheetQuantity)}장`}
                  />
                  <SummaryItem
                    label="판재 금액"
                    value={formatCurrency(zone.sheetAmount)}
                  />
                  <SummaryItem label="소송 규격" value={zone.lumberSpecName} />
                  <SummaryItem
                    label="필요 본수"
                    value={`${formatNumber(zone.lumberPieces)}본`}
                  />
                  <SummaryItem
                    label="발주 단수"
                    value={`${formatNumber(zone.lumberOrderBundles)}단`}
                  />
                  <SummaryItem
                    label="소송 금액"
                    value={formatCurrency(zone.lumberAmount)}
                  />
                  <SummaryItem
                    label="구역 총액"
                    value={formatCurrency(zone.totalAmount)}
                  />
                </dl>
              </div>
            ))}
          </div>

          <div className="grid gap-1 rounded-md bg-[#1f2421] p-2 text-white">
            <p className="font-bold text-[#94d0bb]">전체 합계</p>
            <dl className="grid gap-1 sm:grid-cols-2">
              <ResultRow
                label="판재 총액"
                value={formatCurrency(totalsSnapshot.sheetTotalAmount)}
              />
              <ResultRow
                label="소송 총액"
                value={formatCurrency(totalsSnapshot.lumberTotals.amount)}
              />
              <ResultRow
                label="소송 필요 본수"
                value={`${formatNumber(totalsSnapshot.lumberTotals.pieces)}본`}
              />
              <ResultRow
                label="소송 발주 단수"
                value={`${formatNumber(totalsSnapshot.lumberTotals.orderBundles)}단`}
              />
            </dl>
            <div className="grid gap-1">
              <div className="rounded-md bg-white/7 p-2">
                <p className="font-semibold text-white/72">자재별 수량 합계</p>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {materialQuantityTotalEntries.length === 0 ? (
                    <p className="text-xs text-white/50">
                      저장된 자재가 없습니다.
                    </p>
                  ) : (
                    materialQuantityTotalEntries.map(
                      ([materialName, quantity]) => (
                        <div
                          key={materialName}
                          className="flex min-h-8 items-center justify-between gap-3 rounded-md bg-white/7 px-2.5 py-1.5"
                        >
                          <span className="min-w-0 truncate text-xs text-white/62">
                            {materialName}
                          </span>
                          <span className="text-right text-sm font-semibold">
                            {formatNumber(quantity)}장
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
              {(
                Object.entries(totalsSnapshot.lumberSpecTotals) as [
                  LumberSpecKey,
                  LumberSpecTotal,
                ][]
              ).map(([specId, specTotal]) => (
                <div key={specId} className="rounded-md bg-white/7 p-2">
                  <p className="font-semibold text-white/72">{specTotal.name}</p>
                  <dl className="mt-1 grid gap-1 sm:grid-cols-3">
                    <ResultRow
                      label="필요 본수"
                      value={`${formatNumber(specTotal.pieces)}본`}
                    />
                    <ResultRow
                      label="발주 단수"
                      value={`${formatNumber(specTotal.orderBundles)}단`}
                    />
                    <ResultRow
                      label="금액"
                      value={formatCurrency(specTotal.amount)}
                    />
                  </dl>
                </div>
              ))}
            </div>
            <div className="rounded-md bg-[#f2d16b] px-2 py-1.5 text-[#1d1d1b]">
              <dt className="text-[11px] font-bold">전체 자재 총액</dt>
              <dd className="font-bold">
                {formatCurrency(totalsSnapshot.totalMaterialAmount)}
              </dd>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}




