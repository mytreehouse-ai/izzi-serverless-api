import { createRoute, z } from "@hono/zod-openapi";
import { createApiResponse } from "~/utils/createApiResponse";

const propertyTypes = z.enum(["condominium", "house", "warehouse", "land"]);
const listingTypes = z.enum(["for-sale", "for-rent"]);

function processNumber(val: string) {
  const floatParsed = parseFloat(val);
  if (!isNaN(floatParsed)) {
    return floatParsed;
  }
  const intParsed = parseInt(val);
  return isNaN(intParsed) ? 0 : intParsed;
}

const querySchema = z.object({
  search: z.string().optional(),
  property_type: propertyTypes.optional(),
  listing_type: listingTypes.optional(),
  min_price: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_price: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_bedrooms: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_bedrooms: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_bathrooms: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_bathrooms: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_car_spaces: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_car_spaces: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_floor_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_floor_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_lot_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_lot_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  min_building_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  max_building_size: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  before: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
  after: z
    .preprocess((val) => processNumber(String(val)), z.number())
    .optional(),
});

const responses = {
  200: createApiResponse({
    description: "Respond a message",
    success: true,
    before: null,
    after: null,
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

export const PropertyListingsRoute = createRoute({
  method: "get",
  path: "/v1/property-listings",
  tags: ["Property Listing"],
  request: {
    query: querySchema,
  },
  description: "Property listings",
  operationId: "property-listings",
  summary: "Property listings summary",
  responses,
});
