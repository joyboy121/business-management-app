export function requireText(value, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

export function requireEmail(value) {
  const email = requireText(value, "Email");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  return email;
}

export function requirePassword(value) {
  const password = requireText(value, "Password");

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  return password;
}
