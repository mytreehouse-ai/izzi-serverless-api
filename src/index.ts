import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { getRouterName, showRoutes } from "hono/dev";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import slugify from "slugify";
import { corsConfig } from "./config/cors";
import { getPoolDb } from "./database";
import { ListingTypesRoute } from "./routes/listingTypes";
import { PropertyListingRoute } from "./routes/propertyListing";
import { PropertyListingsRoute } from "./routes/propertyListings";
import { PropertyTypesRoute } from "./routes/propertyTypes";
import { WebhookCreatePropertyListingRoute } from "./routes/webhookCreatePropertyListing";
import { WebhookUpdateDelistedPropertyListingRoute } from "./routes/webhookUpdateDelistedPropertyListing";
import { customLogger } from "./utils/customLogger";
import { removeExtraSpaces } from "./utils/removeExtraSpaces";

export type Env = {
  NODE_ENV: "development" | "production";
  DATABASE_URL: string;
};

const app = new OpenAPIHono<{ Bindings: Env }>();

const token = "honoiscool";

app.use("*", cors(corsConfig));
app.use("/v1/*", clerkMiddleware());
// app.use("*", bearerAuth({ token }));
app.use(logger(customLogger));
app.use(poweredBy());
app.use(prettyJSON());
app.use(secureHeaders());

app.openapi(PropertyTypesRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const auth = getAuth(c);

  try {
    if (!auth?.user) {
      return c.json(
        {
          success: false,
          data: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const query = await client.query("SELECT * FROM property_type");

    return c.json({
      success: true,
      data: query.rows,
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openapi(ListingTypesRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const auth = getAuth(c);

  try {
    if (!auth?.user) {
      return c.json(
        {
          success: false,
          data: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const query = await client.query("SELECT * FROM listing_type");

    return c.json({
      success: true,
      data: query.rows,
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openapi(PropertyListingsRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const auth = getAuth(c);
  const queryParams = c.req.valid("query");
  const clerkClient = c.get("clerk");

  try {
    if (!auth?.userId && !auth?.sessionId) {
      return c.json(
        {
          success: false,
          data: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const session = await clerkClient.sessions.getSession(auth.sessionId);
    const user = await clerkClient.users.getUser(auth.userId);

    const defaultSqlQuery = `
			SELECT
				listing.id,
				INITCAP(listing.listing_title) AS listing_title,
				listing.listing_url,
				listing.price,
				listing.price_formatted,
				listing_type.name AS listing_type,
				property_status.name AS property_status,
				property_type.name AS property_type,
				listing.sub_category,
				property.building_name,
				property.subdivision_name,
				property.floor_area,
				property.lot_area,
				property.building_size,
				property.bedrooms,
				property.bathrooms,
				property.parking_space,
				city.name AS city,
				property.area,
				property.address,
				property.features,
				property.main_image_url,
				ST_AsGeoJSON(listing.coordinates) :: json->'coordinates' AS coordinates,
				listing.latitude_in_text,
				listing.longitude_in_text,
				listing.description,
				listing.created_at
			FROM listing
			INNER JOIN listing_type ON listing_type.id = listing.listing_type_id
			INNER JOIN property_status ON property_status.id = listing.property_status_id
			INNER JOIN property ON property.listing_id = listing.id
			INNER JOIN property_type ON property_type.id = property.property_type_id
			INNER JOIN city ON city.id = property.city_id
			WHERE property_status.slug = $1
			${
        queryParams?.property_type
          ? `AND property_type.slug = '${queryParams.property_type}'`
          : ""
      }
			${
        queryParams?.listing_type
          ? `AND listing_type.slug = '${queryParams.listing_type}'`
          : ""
      }
			${
        queryParams?.min_bedrooms && queryParams?.max_bedrooms
          ? `AND property.bedrooms >= ${queryParams.min_bedrooms} AND property.bedrooms <= ${queryParams.max_bedrooms}`
          : ""
      }
			${
        queryParams?.min_bathrooms && queryParams?.max_bathrooms
          ? `AND property.bathrooms >= ${queryParams.min_bathrooms} AND property.bathrooms <= ${queryParams.max_bathrooms}`
          : ""
      }
			${
        queryParams?.min_car_spaces && queryParams?.max_car_spaces
          ? `AND property.parking_space >= ${queryParams.min_car_spaces} AND property.parking_space <= ${queryParams.max_car_spaces}`
          : ""
      }
			${
        queryParams?.after && !queryParams?.before
          ? `AND listing.id < ${queryParams.after}`
          : ""
      }
			${
        queryParams?.before && !queryParams?.after
          ? `AND listing.id > ${queryParams.before}`
          : ""
      }
			ORDER BY listing.id DESC
			LIMIT 5
		`;

    const sqlQueryWithWordSimilaritySearch = `
			WITH similarity AS (
				SELECT
					listing.id,
					INITCAP(listing.listing_title) AS listing_title,
					listing.listing_url,
					listing.price,
					listing.price_formatted,
					listing_type.name AS listing_type,
					property_status.name AS property_status,
					property_type.name AS property_type,
					listing.sub_category,
					property.building_name,
					property.subdivision_name,
					property.floor_area,
					property.lot_area,
					property.building_size,
					property.bedrooms,
					property.bathrooms,
					property.parking_space,
					city.name AS city,
					property.area,
					property.address,
					property.features,
					property.main_image_url,
					ST_AsGeoJSON(listing.coordinates) :: json->'coordinates' AS coordinates,
					listing.latitude_in_text,
					listing.longitude_in_text,
					WORD_SIMILARITY(listing.description, '${
            queryParams.search
          }') AS description_similarity,
					listing.description,
					listing.created_at
				FROM listing
				INNER JOIN listing_type ON listing_type.id = listing.listing_type_id
				INNER JOIN property_status ON property_status.id = listing.property_status_id
				INNER JOIN property ON property.listing_id = listing.id
				INNER JOIN property_type ON property_type.id = property.property_type_id
				INNER JOIN city ON city.id = property.city_id
				WHERE property_status.slug = $1
				${
          queryParams?.property_type
            ? `AND property_type.slug = '${queryParams.property_type}'`
            : ""
        }
				${
          queryParams?.listing_type
            ? `AND listing_type.slug = '${queryParams.listing_type}'`
            : ""
        }
				AND WORD_SIMILARITY(listing.description, '${queryParams.search}') > 0.1
				${
          queryParams?.min_bedrooms && queryParams?.max_bedrooms
            ? `AND property.bedrooms >= ${queryParams.min_bedrooms} AND property.bedrooms <= ${queryParams.max_bedrooms}`
            : ""
        }
				${
          queryParams?.min_bathrooms && queryParams?.max_bathrooms
            ? `AND property.bathrooms >= ${queryParams.min_bathrooms} AND property.bathrooms <= ${queryParams.max_bathrooms}`
            : ""
        }
				${
          queryParams?.min_car_spaces && queryParams?.max_car_spaces
            ? `AND property.parking_space >= ${queryParams.min_car_spaces} AND property.parking_space <= ${queryParams.max_car_spaces}`
            : ""
        }
			)

			SELECT *
			FROM similarity
			${
        queryParams?.after && !queryParams?.before
          ? `WHERE description_similarity < ${queryParams.after}`
          : ""
      }
			${
        queryParams?.before && !queryParams?.after
          ? `WHERE description_similarity > ${queryParams.before}`
          : ""
      }
			ORDER BY description_similarity DESC
			LIMIT 5;
		`;

    const sqlQuery = queryParams?.search
      ? sqlQueryWithWordSimilaritySearch
      : defaultSqlQuery;

    if (c.env.NODE_ENV === "development") {
      customLogger("Property listing sql query:", removeExtraSpaces(sqlQuery));
    }

    const query = await client.query(removeExtraSpaces(sqlQuery), [
      "available",
    ]);

    const recordCount = query.rows.length;

    return c.json({
      success: true,
      before: recordCount ? query.rows[0].id : null,
      after: recordCount ? query.rows[recordCount - 1].id : null,
      data: query.rows,
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openapi(PropertyListingRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const auth = getAuth(c);
  const params = c.req.valid("param");

  try {
    if (!auth?.userId && !auth?.sessionId) {
      return c.json(
        {
          success: false,
          data: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const sqlQuery = `
			SELECT
				listing.id,
				INITCAP(listing.listing_title) AS listing_title,
				listing.listing_url,
				listing.price,
				listing.price_formatted,
				listing_type.name AS listing_type,
				property_status.name AS property_status,
				property_type.name AS property_type,
				listing.sub_category,
				property.building_name,
				property.subdivision_name,
				property.floor_area,
				property.lot_area,
				property.building_size,
				property.bedrooms,
				property.bathrooms,
				property.parking_space,
				city.name AS city,
				property.area,
				property.address,
				property.features,
				property.main_image_url,
				ST_AsGeoJSON(listing.coordinates) :: json->'coordinates' AS coordinates,
				listing.latitude_in_text,
				listing.longitude_in_text,
				listing.description,
				listing.created_at
			FROM listing
			INNER JOIN listing_type ON listing_type.id = listing.listing_type_id
			INNER JOIN property_status ON property_status.id = listing.property_status_id
			INNER JOIN property ON property.listing_id = listing.id
			INNER JOIN property_type ON property_type.id = property.property_type_id
			INNER JOIN city ON city.id = property.city_id
			WHERE listing.id = $1
		`;

    const query = await client.query(sqlQuery, [params.id]);

    return c.json({
      success: true,
      data: query.rows[0],
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openapi(WebhookCreatePropertyListingRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const requestBody = c.req.valid("json");

  try {
    const FOR_SALE = 1;
    const FOR_RENT = 2;
    const AVAILABLE = 1;
    const CONDOMINIUM = 1;
    const HOUSE = 2;
    const WAREHOUSE = 3;
    const LAND = 4;

    let agentId = null;
    let regionId = null;
    let cityId = null;
    let listingType = FOR_SALE;
    let propertyStatus = AVAILABLE;
    let propertyType = null;

    if (requestBody.offer_type === "Rent") {
      listingType = FOR_RENT;
    }

    if (requestBody.attribute_set_name === "Condominium") {
      propertyType = CONDOMINIUM;
    }

    if (requestBody.attribute_set_name === "House") {
      propertyType = HOUSE;
    }

    if (requestBody.attribute_set_name === "Land") {
      propertyType = LAND;
    }

    if (requestBody.attribute_set_name === "Commercial") {
      propertyType = WAREHOUSE;
    }

    const getAgent = await client.query("SELECT * FROM agent WHERE name = $1", [
      requestBody.agent_name,
    ]);

    if (getAgent.rowCount === 0) {
      const createdAgent = await client.query(
        "INSERT INTO agent (name, url_slug_key) VALUES ($1, $2) RETURNING *",
        [requestBody.agent_name, requestBody.product_owner_url_key]
      );
      agentId = createdAgent.rows[0].id;
    } else {
      agentId = getAgent.rows[0].id;
    }

    const getRegion = await client.query(
      "SELECT * FROM region WHERE name = $1",
      [requestBody.listing_region]
    );

    if (getRegion.rowCount === 0) {
      const regionSlug = slugify(requestBody.listing_region, "-");
      const createdRegion = await client.query(
        "INSERT INTO region (name, slug) VALUES ($1, $2) RETURNING *",
        [requestBody.listing_region, regionSlug.toLowerCase()]
      );
      regionId = createdRegion.rows[0].id;
    } else {
      regionId = getRegion.rows[0].id;
    }

    const getCity = await client.query("SELECT * FROM city WHERE name = $1", [
      requestBody.listing_city,
    ]);

    if (getCity.rowCount === 0) {
      const citySlug = slugify(requestBody.listing_city, "-");
      const createdCity = await client.query(
        "INSERT INTO city (name, region_id, slug) VALUES ($1, $2, $3) RETURNING *",
        [requestBody.listing_city, regionId, citySlug.toLowerCase()]
      );
      cityId = createdCity.rows[0].id;
    } else {
      cityId = getCity.rows[0].id;
    }

    if (propertyType) {
      const getListing = await client.query(
        "SELECT * FROM listing WHERE listing_url = $1",
        [requestBody.listing_url]
      );

      if (getListing.rowCount === 1) {
        return c.json({
          success: true,
          data: "Listing already exists",
        });
      }

      const newListing = await client.query(
        `INSERT INTO listing 
			(
				agent_id,
				listing_title,
				listing_url,
				listing_type_id,
				sub_category,
				property_status_id,
				slug,
				price,
				price_formatted,
				coordinates,
				description
			)
			VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_Point($10, $11), $12) RETURNING *`,
        [
          agentId,
          requestBody.name,
          requestBody.listing_url,
          listingType,
          requestBody.subcategory,
          propertyStatus,
          requestBody.urlkey_details,
          requestBody.price,
          requestBody.price_formatted,
          requestBody.location_latitude,
          requestBody.location_longitude,
          requestBody.description,
        ]
      );

      const newProperty = await client.query(
        `INSERT INTO property
			(
				listing_id,
				property_type_id,
				floor_area,
				lot_area,
				building_size,
				bedrooms,
				bathrooms,
				parking_space,
				city_id,
				area,
				address,
				main_image_url,
				project_name,
				features
			)
			VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id
			`,
        [
          newListing.rows[0].id,
          propertyType,
          requestBody.attribute_set_name === "Condominium"
            ? requestBody.building_size
            : null,
          requestBody?.land_size ? requestBody.land_size : null,
          requestBody?.building_size ? requestBody.building_size : null,
          requestBody?.bedrooms ? requestBody.bedrooms : null,
          requestBody?.bathrooms ? requestBody.bathrooms : null,
          requestBody?.car_space ? requestBody.car_space : null,
          cityId,
          requestBody?.listing_area ? requestBody.listing_area : null,
          requestBody?.listing_area ? requestBody.listing_area : null,
          requestBody.main_image_url,
          requestBody?.project_name ? requestBody.project_name : null,
          [
            ...requestBody.indoor_features,
            ...requestBody.outdoor_features,
            ...requestBody.other_features,
          ],
        ]
      );

      if (requestBody.property_images.length) {
        for (const image of requestBody.property_images) {
          await client.query(
            "INSERT INTO property_images (url, property_id) VALUES ($1, $2)",
            [image, newProperty.rows[0].id]
          );
        }
      }
    }

    return c.json({
      success: true,
      data: "Webhook received (created)",
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openapi(WebhookUpdateDelistedPropertyListingRoute, async (c) => {
  const { client, pool } = await getPoolDb(c.env.DATABASE_URL);
  const requestBody = c.req.valid("json");
  try {
    const getListing = await client.query(
      `SELECT listing.id, listing_type.name AS listing_type FROM listing 
			INNER JOIN listing_type ON listing_type.id = listing.listing_type_id
			WHERE listing_url = $1`,
      [requestBody.listing_url]
    );

    if (getListing.rowCount === 0) {
      return c.json({
        success: true,
        data: "Listing does not exist",
      });
    }

    const listingType = getListing.rows[0].listing_type;

    if (listingType === "For Sale") {
      await client.query(
        "UPDATE listing SET property_status_id = 3 WHERE id = $1",
        [getListing.rows[0].id]
      );
    }

    if (listingType === "For Rent") {
      await client.query(
        "UPDATE listing SET property_status_id = 2 WHERE id = $1",
        [getListing.rows[0].id]
      );
    }

    return c.json({
      success: true,
      data: "Webhook received (delisted)",
    });
  } catch (error: any) {
    console.error(error);
    return c.json(
      {
        success: false,
        data: error.message,
      },
      { status: 500 }
    );
  } finally {
    pool.end();
  }
});

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
});

app.get(
  "/swagger",
  swaggerUI({
    url: "/doc",
  })
);

app.doc("/doc", {
  info: {
    title: "Izzi API",
    version: "v1.0.0",
  },
  tags: [{ name: "Property Listing" }],
  servers: [{ url: "http://localhost:8787" }],
  openapi: "3.1.0",
});

console.log(getRouterName(app));

showRoutes(app);

export default app;
