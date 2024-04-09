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
  agent_id: z.number(),
  agent_name: z.string(),
  product_owner_url_key: z.string(),
  name: z.string(), // This is the listing title
  listing_url: z.string().url(),
  urlkey_details: z.string(), // slug
  price: z.number(),
  price_formatted: z.string(),
  bedrooms: z.number().default(0),
  bathrooms: z.number().default(0),
  car_space: z.number().default(0),
  building_size: z.number().default(0),
  land_size: z.number().default(0),
  attribute_set_name: z.string(), // Property type name
  subcategory: z.string(), // For condo eg: Studio if Commercial this is a warehouse.
  offer_type: z.string(),
  location_latitude: z.string(),
  location_longitude: z.string(),
  listing_region: z.string(),
  listing_region_id: z.string(),
  listing_address: z.string().nullable(),
  listing_area: z.string().nullable(),
  listing_area_id: z.string().nullable(),
  listing_city: z.string(),
  listing_city_id: z.string(),
  project_name: z.string().nullable(),
  main_image_url: z.string().url(),
  property_images: z.array(z.string()),
  description: z.string(),
  indoor_features: z.array(z.string()),
  outdoor_features: z.array(z.string()),
  other_features: z.array(z.string()),
});

export const WebhookCreatePropertyListingRoute = createRoute({
  method: "post",
  path: "/webhook/property-listings",
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
  description: "Property listings",
  operationId: "property-listings",
  summary: "Property listings summary",
  responses,
});
