import type { KavbanTaskFileChange } from './types';

export type KavbanSensitiveChange = {
  path: string;
  reason: string;
};

const sensitiveChangeRules: Array<{
  reason: string;
  pattern: RegExp;
}> = [
  {
    reason: 'Secrets or environment configuration',
    pattern: /(^|\/)\.env|secret|token|credential|password|api[-_]?key/i,
  },
  {
    reason: 'Auth or permission logic',
    pattern: /auth|oauth|session|permission|rbac/i,
  },
  {
    reason: 'Payments or billing',
    pattern: /payment|billing|stripe|checkout|invoice/i,
  },
  {
    reason: 'Database schema or migrations',
    pattern: /migration|schema|database|(^|\/)db\/|prisma|drizzle|sql/i,
  },
  {
    reason: 'Security, encryption, or request middleware',
    pattern: /security|crypto|encrypt|cors|origin|middleware/i,
  },
  {
    reason: 'Production, release, or infrastructure configuration',
    pattern:
      /deploy|release|production|infra|terraform|docker|k8s|helm|\.github\/workflows/i,
  },
  {
    reason: 'User-visible UI',
    pattern: /(^|\/)(app|pages|routes|components|ui)(\/|.*\/).*\.(tsx|jsx)$/i,
  },
];

export function getKavbanSensitiveFileChanges(
  fileChanges: KavbanTaskFileChange[] = []
) {
  return fileChanges.flatMap<KavbanSensitiveChange>((change) => {
    const rule = sensitiveChangeRules.find((item) =>
      item.pattern.test(change.path)
    );

    if (!rule) {
      return [];
    }

    return [
      {
        path: change.path,
        reason: rule.reason,
      },
    ];
  });
}

export function requiresKavbanHumanReviewForChanges(
  fileChanges: KavbanTaskFileChange[] = []
) {
  return getKavbanSensitiveFileChanges(fileChanges).length > 0;
}
