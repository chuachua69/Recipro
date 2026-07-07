import Dexie from 'dexie';

export const db = new Dexie('ReciproDatabase');

db.version(1).stores({
  contacts: '++id, name, tel, balance',
  local_events: '++id, title, date, type, pin, theme, status',
  transactions: '++id, eventId, contactName, contactTel, amount, method, date'
});
