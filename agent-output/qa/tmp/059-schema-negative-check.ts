import { providerReviewUpdateSchema } from '../../../src/lib/validations/adminSchemas.ts';

const base = {
  providerId: '11111111-1111-4111-8111-111111111111',
} as const;

const cases = [
  { name: 'rejected missing feedback', data: { ...base, reviewStatus: 'rejected' } },
  {
    name: 'rejected blank feedback',
    data: { ...base, reviewStatus: 'rejected', reviewFeedback: '   \n\t ' },
  },
  { name: 'approved no feedback', data: { ...base, reviewStatus: 'approved' } },
  {
    name: 'rejected valid feedback',
    data: {
      ...base,
      reviewStatus: 'rejected',
      reviewFeedback: 'Not enough details',
    },
  },
] as const;

for (const c of cases) {
  const result = providerReviewUpdateSchema.safeParse(c.data);
  console.log(`${c.name} => ${result.success}`);

  if (!result.success) {
    console.log(
      ' issues:',
      result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    );
  }
}
