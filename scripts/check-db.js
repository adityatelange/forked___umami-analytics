/* eslint-disable no-console */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const chalk = require('chalk');
const spawn = require('cross-spawn');
const { execSync } = require('child_process');

function getDatabaseType(url = process.env.DATABASE_URL) {
  const type = process.env.DATABASE_TYPE || (url && url.split(':')[0]);

  if (type === 'postgres') {
    return 'postgresql';
  }

  if (type === 'mongodb+srv') {
    // https://www.mongodb.com/docs/manual/reference/connection-string/#dns-seed-list-connection-format
    return 'mongodb';
  }

  return type;
}

if (process.env.SKIP_DB_CHECK) {
  console.log('Skipping database check.');
  process.exit(0);
}

const prisma = new PrismaClient();

function success(msg) {
  console.log(chalk.greenBright(`✓ ${msg}`));
}

function error(msg) {
  console.log(chalk.redBright(`✗ ${msg}`));
}

async function checkEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined.');
  } else {
    success('DATABASE_URL is defined.');
  }
}

async function checkConnection() {
  try {
    await prisma.$connect();

    success('Database connection successful.');
  } catch (e) {
    throw new Error('Unable to connect to the database.');
  }
}

async function checkTables() {
  const db = getDatabaseType(process.env.DATABASE_URL);
  if (db === 'mongodb') {
    console.log(execSync('prisma db push').toString());
  } else {
    try {
      await prisma.$queryRaw`select * from account limit 1`;

      success('Database tables found.');
    } catch (e) {
      error('Database tables not found.');
      console.log('Adding tables...');

      console.log(execSync('prisma migrate deploy').toString());
    }
  }
}

async function run(cmd, args) {
  const buffer = [];
  const proc = spawn(cmd, args);

  return new Promise((resolve, reject) => {
    proc.stdout.on('data', data => buffer.push(data));

    proc.on('error', () => {
      reject(new Error('Failed to run Prisma.'));
    });

    proc.on('exit', () => resolve(buffer.join('')));
  });
}

async function checkMigrations() {
  const db = getDatabaseType(process.env.DATABASE_URL);
  if (db === 'mongodb') {
    console.log(execSync('prisma db push').toString());
  } else {
    const output = await run('prisma', ['migrate', 'status']);

    console.log(output);

    const missingMigrations = output.includes('have not yet been applied');
    const missingInitialMigration =
      output.includes('01_init') && !output.includes('The last common migration is: 01_init');
    const notManaged = output.includes('The current database is not managed');

    if (notManaged || missingMigrations) {
      console.log('Running update...');

      if (missingInitialMigration) {
        console.log(execSync('prisma migrate resolve --applied "01_init"').toString());
      }

      console.log(execSync('prisma migrate deploy').toString());
    }
  }

  success('Database is up to date.');
}

(async () => {
  let err = false;
  for (let fn of [checkEnv, checkConnection, checkTables, checkMigrations]) {
    try {
      await fn();
    } catch (e) {
      console.log(chalk.red(`✗ ${e.message}`));
      err = true;
    } finally {
      await prisma.$disconnect();
      if (err) {
        process.exit(1);
      }
    }
  }
})();
