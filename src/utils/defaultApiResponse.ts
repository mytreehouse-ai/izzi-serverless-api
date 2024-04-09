import { z } from "@hono/zod-openapi";
import { createApiResponse } from "./createApiResponse";

export const responses = {
  200: createApiResponse({
    description: "Respond a message",
    success: true,
    data: z.object({
      success: z.boolean(),
      data: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          slug: z.string(),
        })
      ),
    }),
  }),
  400: createApiResponse({
    description: "Bad request",
    success: false,
    data: "string",
  }),
  401: createApiResponse({
    description: "Unauthorized",
    success: false,
    data: "string",
  }),
  429: createApiResponse({
    description: "Rate limit exceeded",
    success: false,
    data: "string",
  }),
  500: createApiResponse({
    description: "Internal server error",
    success: false,
    data: "string",
  }),
};
