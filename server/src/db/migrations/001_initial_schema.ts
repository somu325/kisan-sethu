import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Markets Table
  await knex.schema.createTable('markets', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('type').notNullable(); // 'APMC' | 'MANDI'
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.text('address').nullable();
    table.string('district').notNullable();
    table.string('state').notNullable();
    table.string('phone').nullable();
    table.string('opening_hours').nullable();
    table.text('commodities_json').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('is_sample').defaultTo(true);

    table.index(['state', 'district'], 'idx_markets_state_district');
    table.index(['latitude', 'longitude'], 'idx_markets_lat_lng');
  });

  // 2. Users Table
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('preferred_language').defaultTo('en');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. Conversations Table
  await knex.schema.createTable('conversations', (table) => {
    table.string('id').primary();
    table.string('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('language').defaultTo('en');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 4. Messages Table
  await knex.schema.createTable('messages', (table) => {
    table.string('id').primary();
    table.string('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.string('role').notNullable(); // 'user' | 'assistant' | 'system'
    table.text('text').notNullable();
    table.string('intent').nullable();
    table.text('payload_json').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['conversation_id'], 'idx_messages_conversation_id');
  });

  // 5. Feedback Table
  await knex.schema.createTable('feedback', (table) => {
    table.string('id').primary();
    table.string('message_id').notNullable();
    table.boolean('helpful').notNullable();
    table.text('reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['message_id'], 'idx_feedback_message_id');
  });

  // 6. Crops Table
  await knex.schema.createTable('crops', (table) => {
    table.string('id').primary();
    table.string('name_en').notNullable();
    table.string('name_hi').notNullable();
    table.string('name_te').notNullable();
    table.string('scientific_name').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 7. Problems Table (Pests & Diseases)
  await knex.schema.createTable('problems', (table) => {
    table.string('id').primary();
    table.string('crop_id').notNullable().references('id').inTable('crops').onDelete('CASCADE');
    table.string('name_en').notNullable();
    table.string('name_hi').notNullable();
    table.string('name_te').notNullable();
    table.string('problem_type').notNullable(); // 'pest' | 'disease' | 'weed'
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['crop_id'], 'idx_problems_crop_id');
  });

  // 8. Sources Table (Citations, Agromets, ICAR)
  await knex.schema.createTable('sources', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.string('organization').notNullable();
    table.string('publication_date').nullable();
    table.text('url').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 9. Products Table (Chemical & Organic Formulation Details)
  await knex.schema.createTable('products', (table) => {
    table.string('id').primary();
    table.string('trade_name').notNullable();
    table.string('chemical_name').notNullable();
    table.string('formulation').notNullable();
    table.string('type').notNullable(); // 'chemical' | 'organic'
    table.double('default_dose_per_litre').nullable();
    table.double('default_water_per_acre_l').defaultTo(150);
    table.string('dose_unit').defaultTo('g');
    table.double('estimated_price_per_unit').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 10. Registered Products (CIBRC registry)
  await knex.schema.createTable('registered_products', (table) => {
    table.string('id').primary();
    table.string('cibrc_reg_no').notNullable();
    table.string('chemical_name').notNullable();
    table.string('formulation').notNullable();
    table.text('approved_crops').notNullable(); // JSON array
    table.string('status').defaultTo('Active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 11. Banned Products (Government Bans)
  await knex.schema.createTable('banned_products', (table) => {
    table.string('id').primary();
    table.string('chemical_name').notNullable();
    table.text('banned_on_crops').notNullable(); // JSON array
    table.string('gazette_notification').nullable();
    table.text('reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 12. Verified Recommendations (ICAR / DPPQS verified dosage)
  await knex.schema.createTable('verified_recommendations', (table) => {
    table.string('id').primary();
    table.string('crop_id').notNullable().references('id').inTable('crops').onDelete('CASCADE');
    table.string('problem_id').notNullable().references('id').inTable('problems').onDelete('CASCADE');
    table.string('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.double('dose_per_acre').nullable();
    table.string('dose_unit').defaultTo('g');
    table.double('water_per_acre_l').defaultTo(150);
    table.integer('waiting_period_days').nullable();
    table.string('source_id').nullable().references('id').inTable('sources');
    table.string('verification_status').defaultTo('VERIFIED');
    table.boolean('is_sample').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['crop_id', 'problem_id'], 'idx_verified_recs_crop_prob');
  });

  // 13. Prices Table (Historical & Today's Mandi Prices)
  await knex.schema.createTable('prices', (table) => {
    table.string('id').primary();
    table.string('crop_id').notNullable().references('id').inTable('crops').onDelete('CASCADE');
    table.string('market_id').notNullable().references('id').inTable('markets').onDelete('CASCADE');
    table.string('grade').notNullable();
    table.double('min_price').notNullable();
    table.double('modal_price').notNullable();
    table.double('max_price').notNullable();
    table.string('price_unit').defaultTo('INR/Quintal');
    table.string('date').notNullable(); // YYYY-MM-DD
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['crop_id', 'market_id', 'date'], 'idx_prices_crop_market_date');
  });

  // 14. LLM Usage Table
  await knex.schema.createTable('llm_usage', (table) => {
    table.string('id').primary();
    table.string('provider').notNullable(); // 'gemini' | 'openai' | 'anthropic'
    table.string('model').notNullable();
    table.string('task').notNullable(); // 'intent_classification' | 'answer_extraction' | etc.
    table.integer('input_tokens').defaultTo(0);
    table.integer('output_tokens').defaultTo(0);
    table.integer('latency_ms').defaultTo(0);
    table.string('status').notNullable(); // 'success' | 'error' | 'fallback'
    table.string('error_code').nullable();
    table.double('cost_estimate').defaultTo(0.0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['created_at'], 'idx_llm_usage_created_at');
    table.index(['provider', 'model'], 'idx_llm_usage_provider_model');
  });

  // 15. Response Cache Table
  await knex.schema.createTable('response_cache', (table) => {
    table.string('key').primary();
    table.text('value_json').notNullable();
    table.timestamp('expires_at').notNullable();

    table.index(['expires_at'], 'idx_response_cache_expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('response_cache');
  await knex.schema.dropTableIfExists('llm_usage');
  await knex.schema.dropTableIfExists('prices');
  await knex.schema.dropTableIfExists('verified_recommendations');
  await knex.schema.dropTableIfExists('banned_products');
  await knex.schema.dropTableIfExists('registered_products');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('sources');
  await knex.schema.dropTableIfExists('problems');
  await knex.schema.dropTableIfExists('crops');
  await knex.schema.dropTableIfExists('feedback');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('markets');
}
