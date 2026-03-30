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

/**
 * [SUB-01] 文件命名规范化
 *
 * 设计意图：
 * - 教学场景下附件命名容易出现空格、大小写、非法字符等不一致情况。
 * - 这里先把“人类文件名”规整成“系统可比对的基名”，再和作业规则比较。
 *
 * 文档映射：
 * - docs/software-design-specification.md
 * - docs/security-and-permission-design.md
 * - docs/api-interface-specification.md
 */
export function normalizeFileNamePart(value: string) {
  return value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .toLowerCase();
}

/**
 * [SUB-02] 依据作业模板生成期望文件名
 *
 * 设计意图：
 * - 作业命名规则是本系统的核心业务约束之一，必须在提交前变成可计算结果。
 * - 当前只替换学号和作业标题两个核心变量，确保规则简单稳定、便于学生理解。
 */
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

/**
 * [ASM-01] 下拉字段选项反序列化
 *
 * 设计意图：
 * - 管理端编辑表单用换行/逗号更友好，但数据库持久化需要结构化 JSON。
 * - 这里负责把存储格式重新还原成前端可直接渲染的选项数组。
 */
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

/**
 * [ASM-02] 下拉字段选项序列化
 *
 * 设计意图：
 * - 作业配置页允许教师用自然输入方式维护选项，提交时再统一转成稳定的 JSON。
 */
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

/**
 * [SUB-03] 动态附加字段校验器
 *
 * 设计意图：
 * - 学生提交表单不是固定结构，而是由作业配置动态生成。
 * - 为了让“配置的字段”和“提交时的校验”保持同源，这里集中实现文本、数字、下拉三类规则。
 *
 * 运行逻辑：
 * - 逐个字段读取提交值
 * - 先校验必填，再按类型校验
 * - 最终返回规范化后的表单数据，用于持久化写入 Submission.formData
 */
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
