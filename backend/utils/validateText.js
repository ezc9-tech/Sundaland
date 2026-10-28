const NAME_PATTERN = /^[A-Za-z0-9 ]+$/;

const DESCRIPTION_PATTERN = /^[A-Za-z0-9 .,!?'"()&:;%$#\-\n]+$/;

export function validateText(value, label, { pattern, maxLength }) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return `${label} is required`;
    }

    if (value.length > maxLength) {
        return `${label} must be ${maxLength} characters or fewer`;
    }

    if (!pattern.test(value)) {
        return `${label} contains characters that aren't allowed`;
    }

    return null;
}

export function validateProductName(name) {
    return validateText(name, "name", { pattern: NAME_PATTERN, maxLength: 100 });
}

export function validateProductDescription(description) {
    return validateText(description, "description", { pattern: DESCRIPTION_PATTERN, maxLength: 1000 });
}