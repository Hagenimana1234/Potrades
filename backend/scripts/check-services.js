#!/usr/bin/env node

/**
 * Service Health Check Script
 * Checks if required services (Redis, PostgreSQL) are accessible
 */

const Redis = require('ioredis');
const { Client } = require('pg');
const chalk = require('chalk');

async function checkRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(chalk.blue('🔍 Checking Redis connection...'));
  console.log(chalk.gray(`   URL: ${redisUrl}`));

  const redis = new Redis(redisUrl, {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      redis.disconnect();
      resolve({
        service: 'Redis',
        status: 'error',
        message: 'Connection timeout (5s)',
      });
    }, 5000);

    redis.on('connect', () => {
      clearTimeout(timeout);
      redis.disconnect();
      resolve({
        service: 'Redis',
        status: 'success',
        message: 'Connected successfully',
      });
    });

    redis.on('error', (error) => {
      clearTimeout(timeout);
      redis.disconnect();
      resolve({
        service: 'Redis',
        status: 'error',
        message: error.message,
      });
    });
  });
}

async function checkPostgres() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/potrades';
  console.log(chalk.blue('🔍 Checking PostgreSQL connection...'));
  console.log(chalk.gray(`   URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`));

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return {
      service: 'PostgreSQL',
      status: 'success',
      message: 'Connected successfully',
    };
  } catch (error) {
    return {
      service: 'PostgreSQL',
      status: 'error',
      message: error.message,
    };
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🏥 PoTrades - Service Health Check\n'));
  console.log(chalk.gray('Checking required services...\n'));

  const results = [];

  // Check Redis
  const redisResult = await checkRedis();
  results.push(redisResult);

  // Check PostgreSQL
  const postgresResult = await checkPostgres();
  results.push(postgresResult);

  // Display results
  console.log(chalk.bold('\n📊 Results:\n'));

  let allHealthy = true;

  results.forEach((result) => {
    if (result.status === 'success') {
      console.log(chalk.green(`✓ ${result.service}: ${result.message}`));
    } else {
      console.log(chalk.red(`✗ ${result.service}: ${result.message}`));
      allHealthy = false;
    }
  });

  console.log('');

  if (allHealthy) {
    console.log(chalk.bold.green('✓ All services are healthy!\n'));
    console.log(chalk.cyan('You can now start the application:'));
    console.log(chalk.gray('  npm run dev\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('✗ Some services are not accessible\n'));
    console.log(chalk.yellow('📖 Quick fixes:\n'));
    console.log(chalk.gray('1. Start services with Docker:'));
    console.log(chalk.cyan('   docker-compose -f docker-compose.dev.yml up -d\n'));
    console.log(chalk.gray('2. Or install services locally - see DEV_SETUP_QUICK_START.md\n'));
    console.log(chalk.gray('3. Or use cloud services (Neon + Redis Cloud)\n'));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Error running health check:'), error);
  process.exit(1);
});
