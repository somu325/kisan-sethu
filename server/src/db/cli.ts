import { getDb, closeDb } from './index.js';
import { up, down } from './migrations/001_initial_schema.js';
import { seed } from './seeds/seedData.js';
import { logger } from '../logger.js';

const command = process.argv[2] || 'migrate';

async function runCli() {
  const db = getDb();

  try {
    if (command === 'migrate') {
      logger.info('Running database migrations (up)...');
      await up(db);
      logger.info('✅ Migrations completed successfully');
    } else if (command === 'rollback') {
      logger.info('Rolling back database migrations (down)...');
      await down(db);
      logger.info('✅ Rollback completed successfully');
    } else if (command === 'seed') {
      logger.info('Seeding database with sample agricultural data...');
      await seed(db);
      logger.info('✅ Database seeded successfully');
    } else if (command === 'reset') {
      logger.info('Resetting database (down -> up -> seed)...');
      await down(db).catch(() => {});
      await up(db);
      await seed(db);
      logger.info('✅ Database reset completed successfully');
    } else {
      console.error(`Unknown command: ${command}. Use: migrate | rollback | seed | reset`);
      process.exit(1);
    }
  } catch (err) {
    logger.error({ err }, `Database CLI operation failed for command: ${command}`);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

runCli();
