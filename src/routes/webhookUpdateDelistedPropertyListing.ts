import { createRoute, z } from "@hono/zod-openapi";
import { createApiResponse } from "~/utils/createApiResponse";

const responses = {
  200: createApiResponse({
    description: "Respond a message",
    success: true,
    data: "Webhook received",
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

const requestBody = z.object({
  listing_url: z.string().url(),
});

export const WebhookUpdateDelistedPropertyListingRoute = createRoute({
  method: "patch",
  path: "/webhook/property-listings/delisted",
  tags: ["Property Listing"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: requestBody,
        },
      },
    },
  },
  description: "Delisted Property listings",
  operationId: "property-listings-delisted",
  summary: "Delisted Property listings summary",
  responses,
});
