export function parseBigIntSearch(value) {
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function toSafeInteger(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "bigint") return Number(value);
  const num = Number(value);
  return Number.isNaN(num) ? 0 : Math.trunc(num);
}

export function toSafeNumber(decimalValue) {
  if (decimalValue === null || decimalValue === undefined) return null;
  const num = Number(decimalValue);
  return Number.isNaN(num) ? null : num;
}

export function buildFullName(firstName, middleName, lastName) {
  return [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
}

export function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function getUserDisplayName(user) {
  if (!user) return null;
  const firstName = user.staff_profiles?.first_name;
  const lastName = user.staff_profiles?.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || user.email || null;
}

export function buildPatientLocation(patient) {
  return [
    patient?.address_line1,
    patient?.address_line2,
    patient?.city,
    patient?.state,
    patient?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}
