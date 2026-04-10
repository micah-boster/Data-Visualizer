export interface DataResponse {
  data: Record<string, unknown>[];
  meta: {
    rowCount: number;
    fetchedAt: string;  // ISO timestamp
    columns: string[];  // Column names in response
  };
  schemaWarnings?: {
    missing: string[];    // Expected columns not found in Snowflake
    unexpected: string[]; // Snowflake columns not in our config
  };
}

export interface DataError {
  error: string;
  details: string;
}
