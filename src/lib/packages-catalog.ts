import yaml from "js-yaml";

export type PackageCategory = 
  | "Deep Learning"
  | "Machine Learning"
  | "Data Manipulation"
  | "NLP & GenAI"
  | "Visualisation"
  | "MLOps & Tracking"
  | "Utils";

export interface PackageMeta {
  id: string;
  name: string;
  category: PackageCategory;
  description: string;
  url: string;
  command: string;
  architectures: string[];
}

export interface PackagesCatalog {
  packages: PackageMeta[];
}

const CATALOG_URL = "/configs/packages_config.yaml";

export async function loadPackagesCatalog(): Promise<PackagesCatalog> {
  try {
    const res = await fetch(CATALOG_URL);
    const text = await res.text();
    const data = yaml.load(text) as PackagesCatalog;
    if (!data || !Array.isArray(data.packages)) return { packages: [] };
    return data;
  } catch (e) {
    console.error("Failed to load packages catalog:", e);
    return { packages: [] };
  }
}
