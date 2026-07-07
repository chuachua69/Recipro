import Dexie from 'dexie';

export const db = new Dexie('ReciproDatabase');

db.version(1).stores({
  contacts: '++id, name, tel, balance',
  local_events: '++id, title, date, type, pin, theme, status',
  transactions: '++id, eventId, contactName, contactTel, amount, method, date'
});

db.version(2).stores({
  local_events: '++id, title, date, type, pin, theme, status, cloudId'
});
