import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema | ValidationChain[]) {
  // Support both Zod schemas and express-validator chains
  if (Array.isArray(schema)) {
    // express-validator chains
    return async (req: Request, _res: Response, next: NextFunction) => {
      // Run all validations
      await Promise.all(schema.map((validation) => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const messages = errors.array().map((e) => `${e.type === 'field' ? e.path : 'unknown'}: ${e.msg}`);
        return next(new ValidationError(messages.join(', ')));
      }
      next();
    };
  } else {
    // Zod schema
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
          next(new ValidationError(messages.join(', ')));
        } else {
          next(error);
        }
      }
    };
  }
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}
