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

import catalogData from "../configs/packages_catalog.json";

export async function loadPackagesCatalog(): Promise<PackagesCatalog> {
  return catalogData as PackagesCatalog;
}
