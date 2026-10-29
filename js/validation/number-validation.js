export function requirePositiveNumber(value, fieldName, {
  allowZero = false,
  integer = false
} = {}) {
  if (String(value ?? "").trim() === "") {
    throw new Error(`${fieldName} is required.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0 || (!allowZero && number === 0)) {
    throw new Error(`${fieldName} must be ${allowZero ? "zero or greater" : "greater than zero"}.`);
  }

  if (integer && !Number.isInteger(number)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return number;
}
