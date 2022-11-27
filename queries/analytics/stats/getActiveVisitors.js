import { subMinutes } from 'date-fns';
import prisma from 'lib/prisma';
import clickhouse from 'lib/clickhouse';
import { CLICKHOUSE, PRISMA, MONGODB, runQuery } from 'lib/db';

export async function getActiveVisitors(...args) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
    [MONGODB]: () => mongodbQuery(...args),
  });
}

async function relationalQuery(websiteId) {
  const date = subMinutes(new Date(), 5);
  const params = [date];

  return prisma.rawQuery(
    `select count(distinct session_id) x
    from pageview
      join website 
        on pageview.website_id = website.website_id
    where website.website_uuid = '${websiteId}'
    and pageview.created_at >= $1`,
    params,
  );
}

async function clickhouseQuery(websiteId) {
  const { rawQuery, getDateFormat } = clickhouse;
  const params = [websiteId];

  return rawQuery(
    `select count(distinct session_id) x
    from event
    where website_id = $1
    and created_at >= ${getDateFormat(subMinutes(new Date(), 5))}`,
    params,
  );
}

async function mongodbQuery(websiteUuid) {
  const date = subMinutes(new Date(), 5);

  return [
    {
      x: await prisma.client.pageview.count({
        where: {
          websiteId: await prisma.client.website.findUnique({
            where: {
              websiteUuid: websiteUuid,
            },
          }).id,
          createdAt: {
            gte: date,
          },
        },
      }),
    },
  ];
}
