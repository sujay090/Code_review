import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

/**
 * Specify which parts of the request to validate.
 * Each key maps to a Zod object schema.
 */
interface ValidationSchemas {
  body?: z.ZodObject<z.ZodRawShape>;
  query?: z.ZodObject<z.ZodRawShape>;
  params?: z.ZodObject<z.ZodRawShape>;
}

/**
 * Format Zod errors into a flat, human-readable array.
 */
const formatErrors = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

/**
 * Express middleware factory that validates `req.body`, `req.query`,
 * and/or `req.params` against the supplied Zod schemas.
 *
 * On success the parsed (and coerced) values replace the originals
 * so downstream handlers always receive clean, typed data.
 *
 * On failure a 400 response with structured errors is returned.
 */
export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const allErrors: ReturnType<typeof formatErrors> = [];

    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);

      if (!result.success) {
        allErrors.push(...formatErrors(result.error));
      } else {
        // Replace with parsed values (coerced types, defaults applied, etc.)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[key] = result.data;
      }
    }

    if (allErrors.length > 0) {
      res.status(400).json({ message: "Validation failed", errors: allErrors });
      return;
    }

    next();
  };
};
