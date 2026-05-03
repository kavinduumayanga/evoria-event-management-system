import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const assertRouteOrder = (filePath: string, specificRoute: string, wildcardRoute: string) => {
  const source = readFileSync(filePath, 'utf8');
  const specificIndex = source.indexOf(specificRoute);
  const wildcardIndex = source.indexOf(wildcardRoute);

  assert.ok(specificIndex >= 0, `Missing route declaration: ${specificRoute}`);
  assert.ok(wildcardIndex >= 0, `Missing route declaration: ${wildcardRoute}`);
  assert.ok(
    specificIndex < wildcardIndex,
    `Route "${specificRoute}" must be declared before "${wildcardRoute}"`,
  );
};

test('ticket event route is declared before wildcard id route', () => {
  const filePath = path.join(process.cwd(), 'src/routes/ticket.routes.ts');
  assertRouteOrder(
    filePath,
    "router.get('/event/:eventId', getEventTickets);",
    "router.get('/:id', getTicket);",
  );
});

test('session event route is declared before wildcard id route', () => {
  const filePath = path.join(process.cwd(), 'src/routes/session.routes.ts');
  assertRouteOrder(
    filePath,
    "router.get('/event/:eventId', getEventSessions);",
    "router.get('/:id', getSession);",
  );
});
