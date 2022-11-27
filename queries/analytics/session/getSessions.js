import prisma from 'lib/prisma';
import clickhouse from 'lib/clickhouse';
import { CLICKHOUSE, PRISMA, MONGODB, runQuery } from 'lib/db';

export async function getSessions(...args) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
    [MONGODB]: () => mongodbQuery(...args),
  });
}

async function relationalQuery(websites, start_at) {
  return prisma.client.session.findMany({
    where: {
      ...(websites && websites.length > 0
        ? {
            website: {
              websiteUuid: {
                in: websites,
              },
            },
          }
        : {}),
      createdAt: {
        gte: start_at,
      },
    },
  });
}

async function clickhouseQuery(websites, start_at) {
  const { rawQuery, getDateFormat, getCommaSeparatedStringFormat } = clickhouse;

  return rawQuery(
    `select distinct
      session_id,
      website_id,
      created_at,
      hostname,
      browser,
      os,
      device,
      screen,
      language,
      country
    from event
    where ${
      websites && websites.length > 0
        ? `website_id in (${getCommaSeparatedStringFormat(websites)})`
        : '0 = 0'
    }
      and created_at >= ${getDateFormat(start_at)}`,
  );
}

async function mongodbQuery(websites, start_at) {
  return prisma.client.session.findMany({
    where: {
      ...(websites && websites.length > 0
        ? {
            website: {
              websiteUuid: {
                in: websites,
              },
            },
          }
        : {}),
      createdAt: {
        gte: start_at,
      },
    },
  });
}
