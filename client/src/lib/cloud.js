// Cloud sync for shared events, backed by Supabase (hosted Postgres + Realtime).
// One-time setup: run schema.sql in the Supabase SQL editor (creates tables + open
// RLS policies — the PIN is the access gate, not RLS).
//
// Shape note: the client uses camelCase (contactName, contactTel); Supabase columns
// are snake_case. Mapping happens here so the rest of the app stays camelCase.

import { supabase } from './supabase';

export function isCloudConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return !!url && url !== 'YOUR_SUPABASE_URL_HERE';
}

// Create a shared event in the cloud. Returns the row (incl. numeric id).
export async function createCloudEvent({ title, theme, payNow, pin, members, ownerId }) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      theme,
      paynow_type: payNow?.type || null,
      paynow_proxy: payNow?.proxy || null,
      pin,
      members: members || [],
      owner_id: ownerId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Verify a PIN for a join attempt. Returns the event (camelCase) or null if wrong.
export async function verifyPin(eventId, pin) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, theme, paynow_type, paynow_proxy, members')
    .eq('id', eventId)
    .eq('pin', pin)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    theme: data.theme,
    members: data.members || [],
    payNow: data.paynow_type
      ? { type: data.paynow_type, proxy: data.paynow_proxy }
      : null,
  };
}

export async function updateCloudEventMembers(eventId, members) {
  const { error } = await supabase
    .from('events')
    .update({ members })
    .eq('id', eventId);
  if (error) throw error;
}

export async function getEventForRSVP(eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, theme, members')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addEventGuest(eventId, { name, phone, relation }) {
  const { error } = await supabase
    .from('event_guests')
    .insert({
      event_id: eventId,
      name,
      phone: phone || null,
      relation: relation || null,
    });
  if (error) throw error;
}

export async function fetchEventGuests(eventId) {
  const { data, error } = await supabase
    .from('event_guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCloudTransactions(eventId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapTx);
}

export async function addCloudTransaction(eventId, tx) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      event_id: eventId,
      contact_name: tx.contactName,
      contact_tel: tx.contactTel || null,
      relation: tx.relation || null,
      amount: tx.amount,
      method: tx.method,
    })
    .select()
    .single();
  if (error) throw error;
  return mapTx(data);
}

// Live subscription. onInsert receives a camelCase tx. Returns an unsubscribe fn.
export function subscribeCloudTransactions(eventId, onInsert) {
  const channel = supabase
    .channel(`event_${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `event_id=eq.${eventId}`,
      },
      (payload) => onInsert(mapTx(payload.new))
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// On close: hard-delete the cloud event (cascade wipes transactions). Privacy model.
export async function deleteCloudEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

function mapTx(row) {
  return {
    cloudTxId: row.id,
    contactName: row.contact_name,
    contactTel: row.contact_tel,
    relation: row.relation,
    amount: row.amount,
    method: row.method,
    date: row.created_at,
  };
}
