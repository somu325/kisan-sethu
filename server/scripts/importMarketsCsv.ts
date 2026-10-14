import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { getMarketRepository, closeDb } from '../src/db/index.js';
import { logger } from '../src/logger.js';
import type { MarketPlace } from '../src/db/repositories/marketRepository.js';

async function importCsv() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log(`
Usage: npm run db:import:markets -- <path/to/markets.csv>

Expected CSV Columns (header row required):
name,type,latitude,longitude,district,state,address,phone,opening_hours,commodities

Example Row:
"Guntur Mirchi Yard","APMC",16.3067,80.4365,"Guntur","Andhra Pradesh","GT Road","0863-2224567","06:00 AM - 02:00 PM","Chilli;Cotton"
`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ CSV file not found at: ${resolvedPath}`);
    process.exit(1);
  }

  logger.info({ path: resolvedPath }, 'Starting CSV market data import...');
  const repo = getMarketRepository();

  const parser = fs.createReadStream(resolvedPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  let importedCount = 0;
  for await (const row of parser) {
    const name = row.name || row.market_name || row.MarketName;
    const type = (row.type || row.market_type || 'MANDI').toUpperCase();
    const lat = parseFloat(row.latitude || row.lat);
    const lng = parseFloat(row.longitude || row.lng || row.lon);
    const district = row.district || row.District || 'Unknown';
    const state = row.state || row.State || 'Unknown';

    if (!name || isNaN(lat) || isNaN(lng)) {
      logger.warn({ row }, 'Skipping row with missing name or invalid coordinates');
      continue;
    }

    const commoditiesRaw = row.commodities || row.Commodities || '';
    const commodities = commoditiesRaw
      ? commoditiesRaw.split(/[;,|]/).map((c: string) => c.trim()).filter(Boolean)
      : [];

    const id = `mkt-${district.toLowerCase().replace(/\s+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}-${importedCount + 1}`;

    const market: MarketPlace = {
      id,
      name,
      type: type === 'APMC' ? 'APMC' : 'MANDI',
      latitude: lat,
      longitude: lng,
      district,
      state,
      address: row.address || undefined,
      phone: row.phone || undefined,
      opening_hours: row.opening_hours || undefined,
      commodities,
      is_sample: false, // Official imported data
    };

    try {
      await repo.create(market);
      importedCount++;
    } catch (err: any) {
      logger.error({ err: err.message, name }, 'Failed to insert market record');
    }
  }

  logger.info({ count: importedCount }, '✅ CSV market import completed successfully');
  await closeDb();
}

importCsv().catch((err) => {
  logger.error({ err }, 'Fatal error during CSV import');
  process.exit(1);
});
