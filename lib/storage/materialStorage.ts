import { getSupabaseClient } from "@/lib/supabase/client";

const SAVED_ZONES_STORAGE_KEY = "daum-woodwork-zone-estimates";
const SAVED_PROJECTS_STORAGE_KEY = "daum-woodwork-project-estimates";
const MATERIAL_PRICE_STORAGE_KEY = "materialPriceSettings";
const MATERIAL_PRICE_SETTINGS_ID = "default";

type StorageRecord = Record<string, unknown>;

type SupabaseResult<T> = {
  data: T | null;
  error?: unknown;
};

type SupabaseSelectQuery = PromiseLike<SupabaseResult<StorageRecord[]>> & {
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PromiseLike<SupabaseResult<StorageRecord[]>>;
};

type SupabaseTable = {
  select: (columns?: string) => SupabaseSelectQuery;
  upsert: (
    values: StorageRecord | StorageRecord[],
    options?: { onConflict: string },
  ) => PromiseLike<SupabaseResult<unknown>>;
};

type SupabaseClient = {
  from: (tableName: string) => SupabaseTable;
};

const isRecord = (value: unknown): value is StorageRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const loadJson = <T>(key: string): T | null => {
  const value = window.localStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const saveJson = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const getClient = async () =>
  (await getSupabaseClient()) as SupabaseClient | null;

const getStringValue = (record: StorageRecord, keys: string[]) => {
  const value = keys.map((key) => record[key]).find((candidate) => candidate);

  return typeof value === "string" ? value : "";
};

const getProjectId = (project: StorageRecord) =>
  getStringValue(project, ["id", "projectId"]) || crypto.randomUUID();

export const loadSavedZones = async <T>() => {
  const localZones = loadJson<T[]>(SAVED_ZONES_STORAGE_KEY) ?? [];

  try {
    const client = await getClient();

    if (!client) {
      return localZones;
    }

    const { data, error } = await client
      .from("saved_zones")
      .select("data")
      .order("id", { ascending: true });

    if (error || !data?.length) {
      return localZones;
    }

    return data
      .map((row) => row.data)
      .filter((zone): zone is T => Boolean(zone));
  } catch {
    return localZones;
  }
};

export const saveSavedZones = async <T extends object>(zones: T[]) => {
  saveJson(SAVED_ZONES_STORAGE_KEY, zones);

  try {
    const client = await getClient();

    if (!client || zones.length === 0) {
      return;
    }

    await client.from("saved_zones").upsert(
      zones.map((zone) => {
        const zoneRecord = zone as unknown as StorageRecord;

        return {
        id: getStringValue(zoneRecord, ["id"]),
        zone_name: getStringValue(zoneRecord, ["zoneName", "zone_name"]),
        site_name: getStringValue(zoneRecord, ["siteName", "site_name"]),
        data: zone,
      };
      }),
      { onConflict: "id" },
    );
  } catch {
    // localStorage remains the source of continuity if Supabase fails.
  }
};

export const loadSavedProjects = async <T>() => {
  const localProjects = loadJson<T[]>(SAVED_PROJECTS_STORAGE_KEY) ?? [];

  try {
    const client = await getClient();

    if (!client) {
      return localProjects;
    }

    const { data, error } = await client
      .from("saved_projects")
      .select("*")
      .order("id", { ascending: true });

    if (error || !data?.length) {
      return localProjects;
    }

    return data.map((row) => {
      const id = getStringValue(row, ["id"]) || crypto.randomUUID();
      const projectName = getStringValue(row, ["project_name", "name"]);
      const summarySnapshot = row.summary_snapshot;
      const materialTotals = isRecord(summarySnapshot)
        ? summarySnapshot.materialTotals
        : undefined;
      const woodTotals = isRecord(summarySnapshot)
        ? summarySnapshot.woodTotals
        : undefined;

      return {
        id,
        projectId: id,
        name: projectName,
        projectName,
        projectSaveName: projectName,
        savedAt: getStringValue(row, ["saved_at", "created_at"]) || "",
        createdAt: getStringValue(row, ["created_at", "saved_at"]) || "",
        siteName: getStringValue(row, ["site_name", "siteName"]),
        zonesSnapshot: row.zones_snapshot,
        summarySnapshot,
        materialPriceSnapshot: row.material_price_snapshot,
        materialQuantityTotals: isRecord(materialTotals) ? materialTotals : {},
        lumberTotals: isRecord(woodTotals) ? woodTotals : {},
        lumberSpecTotals:
          isRecord(woodTotals) && isRecord(woodTotals.bySpec)
            ? woodTotals.bySpec
            : undefined,
        sheetTotalAmount: isRecord(summarySnapshot)
          ? Number(summarySnapshot.sheetTotalAmount) || 0
          : 0,
        lumberTotalAmount:
          isRecord(woodTotals) && typeof woodTotals.amount === "number"
            ? woodTotals.amount
            : 0,
        totalMaterialAmount: isRecord(summarySnapshot)
          ? Number(summarySnapshot.totalAmount) || 0
          : 0,
      } as T;
    });
  } catch {
    return localProjects;
  }
};

export const saveSavedProjects = async <T extends object>(
  projects: T[],
) => {
  saveJson(SAVED_PROJECTS_STORAGE_KEY, projects);

  try {
    const client = await getClient();

    if (!client || projects.length === 0) {
      return;
    }

    await client.from("saved_projects").upsert(
      projects.map((project) => {
        const projectRecord = project as unknown as StorageRecord;

        return {
        id: getProjectId(projectRecord),
        project_name: getStringValue(projectRecord, [
          "name",
          "projectSaveName",
          "projectName",
        ]),
        site_name: getStringValue(projectRecord, ["siteName", "site_name"]),
        zones_snapshot: projectRecord.zonesSnapshot,
        summary_snapshot: projectRecord.summarySnapshot,
        material_price_snapshot: projectRecord.materialPriceSnapshot,
      };
      }),
      { onConflict: "id" },
    );
  } catch {
    // localStorage remains the source of continuity if Supabase fails.
  }
};

export const loadMaterialPriceSettings = async <T>() => {
  const localSettings = loadJson<T>(MATERIAL_PRICE_STORAGE_KEY);

  try {
    const client = await getClient();

    if (!client) {
      return localSettings;
    }

    const { data, error } = await client
      .from("material_price_settings")
      .select("data")
      .order("id", { ascending: true });

    if (error || !data?.length) {
      return localSettings;
    }

    return (data[0]?.data as T | undefined) ?? localSettings;
  } catch {
    return localSettings;
  }
};

export const saveMaterialPriceSettings = async <T>(settings: T) => {
  console.log("saveMaterialPriceSettings started", settings);
  saveJson(MATERIAL_PRICE_STORAGE_KEY, settings);

  try {
    const client = await getClient();

    if (!client) {
      console.warn(
        "Supabase client is not available. Material price settings saved only to localStorage.",
      );
      return;
    }

    const { error } = await client.from("material_price_settings").upsert(
      {
        id: MATERIAL_PRICE_SETTINGS_ID,
        category_name: "material_price_settings",
        data: settings as unknown as StorageRecord,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("Failed to save material price settings to Supabase", error);
      return;
    }

    console.log("Saved material price settings to Supabase");
  } catch (error) {
    console.error("Failed to save material price settings to Supabase", error);
  }
};
