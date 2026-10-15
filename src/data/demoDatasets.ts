/**
 * TIP CRM — Dataset Information Types
 * Clean production setup with zero pre-seeded demo datasets.
 */

export interface DemoDatasetInfo {
  id: string;
  name: string;
  description: string;
  badge: string;
  filename: string;
  rawCsv: string;
  expectedMetrics: {
    totalRecords: number;
    keyFact: string;
  };
}

export const DEMO_DATASETS: DemoDatasetInfo[] = [];
