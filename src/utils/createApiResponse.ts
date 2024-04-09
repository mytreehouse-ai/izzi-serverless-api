import { z } from "@hono/zod-openapi";

type ApiResponse = {
  description: string;
  success: boolean;
  before?: string | null;
  after?: string | null;
} & (
  | {
      success: true;
      data: z.ZodTypeAny | string;
    }
  | {
      success: false;
      data: string;
    }
);

export function createApiResponse(arg: ApiResponse) {
  return {
    description: arg.description,
    content: {
      "application/json": {
        schema: z.object({
          success: z.boolean().default(arg.success),
          before: z.string().nullable().optional(),
          after: z.string().nullable().optional(),
          data: arg.success ? z.array(arg.data as z.ZodTypeAny) : z.string(),
        }),
      },
    },
  };
}
