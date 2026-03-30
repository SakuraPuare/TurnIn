export interface RequiredFieldDefinition {
  name: string;
  label: string;
  type: string;
  description?: string | null;
  options?: string | null;
  required: boolean;
}

export interface SubmissionPayload {
  studentId: string;
  notes?: string;
  formData?: Record<string, string>;
}

export function normalizeFileNamePart(value: string) {
  return value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .toLowerCase();
}

export function buildExpectedFileBase(
  format: string,
  values: {
    studentId: string;
    assignmentTitle: string;
  },
) {
  return normalizeFileNamePart(
    format
      .replaceAll("{studentId}", values.studentId)
      .replaceAll("{assignmentTitle}", values.assignmentTitle),
  );
}

export function parseRequiredFieldOptions(options?: string | null) {
  if (!options) {
    return [];
  }

  try {
    const parsed = JSON.parse(options);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch (_error) {
    return options
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function stringifyRequiredFieldOptions(rawOptions?: string, type?: string) {
  if (type !== "select") {
    return null;
  }

  const options = (rawOptions || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return options.length > 0 ? JSON.stringify(options) : null;
}

export function validateSubmissionPayload(
  requiredFields: RequiredFieldDefinition[],
  formData: Record<string, string> = {},
) {
  const normalized: Record<string, string> = {};

  for (const field of requiredFields) {
    const rawValue = formData[field.name];
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (field.required && !value) {
      return {
        ok: false as const,
        error: `${field.label}不能为空`,
      };
    }

    if (!value) {
      normalized[field.name] = "";
      continue;
    }

    if (field.type === "number" && Number.isNaN(Number(value))) {
      return {
        ok: false as const,
        error: `${field.label}必须是数字`,
      };
    }

    if (field.type === "select") {
      const options = parseRequiredFieldOptions(field.options);

      if (options.length > 0 && !options.includes(value)) {
        return {
          ok: false as const,
          error: `${field.label}的选项无效`,
        };
      }
    }

    normalized[field.name] = value;
  }

  return {
    ok: true as const,
    data: normalized,
  };
}
