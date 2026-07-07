// PayNow SGQR generator.
//
// Supports BOTH proxy types, unlike @chewhx/paynowqr (which hardcodes UEN):
//   - mobile: proxy type '0', value formatted as +65XXXXXXXX
//   - uen:    proxy type '2', value is the UEN as-is
//
// Emits an EMVCo/SGQR-compliant payload string that any Singapore bank app
// (DBS PayLah!, OCBC, UOB, etc.) can scan. Encode this string into a QR image.
// Spec: EMV QRCPS + MAS PayNow (SG.PAYNOW).

// TLV field: 2-digit id + 2-digit length + value.
function tlv(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC16-CCITT (0xFFFF init, poly 0x1021) over the payload including the "6304" tag.
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Normalize a Singapore mobile number to the +65XXXXXXXX form PayNow expects.
// Accepts "91234567", "9123 4567", "+6591234567", "6591234567".
export function normalizeMobile(raw) {
  const digits = String(raw).replace(/[^\d]/g, '');
  let local = digits;
  if (local.startsWith('65') && local.length === 10) local = local.slice(2);
  if (local.length !== 8 || !/^[89]/.test(local)) return null;
  return `+65${local}`;
}

/**
 * Build a PayNow QR payload string.
 * @param {Object} opts
 * @param {'mobile'|'uen'} opts.type       - proxy type
 * @param {string}        opts.proxy       - mobile number or UEN
 * @param {number}        [opts.amount]    - fixed amount in SGD; omit/0 for open amount
 * @param {boolean}       [opts.editable]  - allow payer to change the amount (default true)
 * @param {string}        [opts.reference] - reference shown to payer (e.g. event name)
 * @param {string}        [opts.company]   - merchant/display name (default 'NA')
 * @param {string}        [opts.expiry]    - YYYYMMDD; defaults to +5 years
 * @returns {string} the QR payload, or throws on invalid proxy
 */
export function buildPayNowPayload({
  type,
  proxy,
  amount = 0,
  editable = true,
  reference = '',
  company = 'NA',
  expiry,
}) {
  let proxyValue = proxy;
  if (type === 'mobile') {
    const m = normalizeMobile(proxy);
    if (!m) throw new Error('Invalid Singapore mobile number');
    proxyValue = m;
  } else {
    proxyValue = String(proxy).trim().toUpperCase();
    if (!proxyValue) throw new Error('Invalid UEN');
  }

  const amountEditable = !amount || editable ? '1' : '0';
  const expiryDate =
    expiry ||
    (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 5);
      return d.toISOString().slice(0, 10).replace(/-/g, '');
    })();

  // ID 26: Merchant Account Information (SG.PAYNOW)
  const merchantInfo =
    tlv('00', 'SG.PAYNOW') +
    tlv('01', type === 'mobile' ? '0' : '2') +
    tlv('02', proxyValue) +
    tlv('03', amountEditable) +
    tlv('04', expiryDate);

  let payload =
    tlv('00', '01') + // payload format indicator
    tlv('01', '11') + // point of initiation: 11 = static/reusable (one QR, many guests)
    tlv('26', merchantInfo) +
    tlv('52', '0000') + // merchant category code
    tlv('53', '702'); // currency: SGD

  if (amount && !editable) {
    payload += tlv('54', Number(amount).toFixed(2));
  }

  payload +=
    tlv('58', 'SG') + // country
    tlv('59', (company || 'NA').slice(0, 25)) + // merchant name
    tlv('60', 'Singapore'); // city

  if (reference) {
    payload += tlv('62', tlv('01', reference.slice(0, 25)));
  }

  // ID 63: CRC over everything including the "6304" tag.
  payload += '6304';
  return payload + crc16(payload);
}
