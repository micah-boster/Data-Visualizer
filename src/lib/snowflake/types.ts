export interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  warehouse: string;
  database: string;
  schema: string;
  role?: string;
  application?: string;
  clientSessionKeepAlive?: boolean;
}

export interface SnowflakePoolConfig {
  max: number;
  min: number;
  evictionRunIntervalMillis: number;
  idleTimeoutMillis: number;
}

export interface SchemaColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  ORDINAL_POSITION: number;
}
