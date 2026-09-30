import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";

type ValidateTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidateTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          details,
        },
      });
      return;
    }

    // Replace the target with the parsed (coerced + sanitized) value
    req[target] = result.data;
    next();
  };
}
