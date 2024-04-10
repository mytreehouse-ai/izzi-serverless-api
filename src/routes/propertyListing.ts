import { createRoute, z } from "@hono/zod-openapi";
import { createApiResponse } from "~/utils/createApiResponse";
import { processNumber } from "~/utils/processNumber";

const querySchema = z.object({
  id: z.preprocess((val) => processNumber(String(val)), z.number()).optional(),
});

const responses = {
  200: createApiResponse({
    description: "Respond a message",
    success: true,
    before: null,
    after: null,
    data: z.object({
      success: z.boolean(),
      data: z.object({
        id: z.number(),
        listing_title: z.string(),
        listing_url: z.string().url(),
        price: z.number(),
        price_formatted: z.string(),
        listing_type: z.string(),
        property_status: z.string(),
        property_type: z.string(),
        sub_category: z.string().nullable(),
        building_name: z.string().nullable(),
        subdivision_name: z.string().nullable(),
        floor_area: z.number().nullable(),
        lot_area: z.number().nullable(),
        building_size: z.number().nullable(),
        bedrooms: z.number().nullable(),
        bathrooms: z.number().nullable(),
        parking_space: z.number().nullable(),
        city: z.string(),
        area: z.string(),
        address: z.string(),
        features: z.array(z.string()),
        main_image_url: z.string().url(),
        coordinates: z.array(z.number()),
        description: z.string(),
        created_at: z.string(),
      }),
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

export const PropertyListingRoute = createRoute({
  method: "get",
  path: "/v1/property-listings/:id",
  tags: ["Property Listing"],
  request: {
    params: querySchema,
  },
  description: "Property listing",
  operationId: "property-listing",
  summary: "Property listing summary",
  responses,
});
