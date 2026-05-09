export function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/\d/.test(password)) errors.push("One number");
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) errors.push("One special character");
  return errors;
}

export function getPasswordStrengthScore(password) {
  const errors = validatePasswordStrength(password);
  return 5 - errors.length; // 0-5
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
