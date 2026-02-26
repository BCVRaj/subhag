/**
 * Data validation utilities
 */

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate CSV file structure
 */
export const validateCSVHeaders = (headers, requiredHeaders) => {
  const missingHeaders = requiredHeaders.filter(
    (required) => !headers.includes(required)
  )
  return {
    valid: missingHeaders.length === 0,
    missingHeaders,
  }
}

/**
 * Validate numeric range
 */
export const isInRange = (value, min, max) => {
  const num = parseFloat(value)
  return !isNaN(num) && num >= min && num <= max
}

/**
 * Validate file type
 */
export const isValidFileType = (filename, allowedTypes) => {
  const extension = filename.split('.').pop().toLowerCase()
  return allowedTypes.includes(`.${extension}`)
}

/**
 * Validate file size
 */
export const isValidFileSize = (fileSize, maxSizeMB) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return fileSize <= maxSizeBytes
}
