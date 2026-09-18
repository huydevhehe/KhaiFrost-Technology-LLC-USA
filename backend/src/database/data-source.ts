import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config';
import { loadEnvironment } from '../config/environment';
import { loadDotenv } from '../config/load-dotenv';
import { buildDataSourceOptions } from './database-options';

loadDotenv();
loadEnvironment();

export default new DataSource(buildDataSourceOptions(databaseConfig()));
