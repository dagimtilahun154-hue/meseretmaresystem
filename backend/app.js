/**
 * cPanel Node.js Selector entry point for the NestJS backend.
 *
 * cPanel's Phusion Passenger expects a CommonJS file that exports the
 * Express/HTTP app on `module.exports`. NestJS creates an Express app
 * internally — we just need to surface it.
 *
 * Usage: set "Application startup file" to  app.js  in cPanel Node.js Selector.
 */

const { NestFactory } = require("@nestjs/core");
const { ConfigService } = require("@nestjs/config");
const { ValidationPipe } = require("@nestjs/common");
const { join } = require("path");
const fs = require("fs");
const helmet = require("helmet");
const { json, urlencoded } = require("express");

async function createApp() {
  // Dynamically import the compiled AppModule
  const { AppModule } = require("./dist/app.module");
  const { HttpExceptionFilter } = require("./dist/common/filters/http-exception.filter");

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get("NODE_ENV") === "production";
  const rawFrontendOrigin = config.get("FRONTEND_ORIGIN", "*");

  const allowedOrigins = rawFrontendOrigin
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Increase payload limits
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Serve static uploads
  app.getHttpAdapter().getInstance().use(
    "/uploads",
    require("express").static(uploadsDir, {
      setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
      },
    })
  );

  app.setGlobalPrefix("api/v1");
  app.use(helmet({ crossOriginResourcePolicy: false }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (isProduction && (rawFrontendOrigin === "*" || allowedOrigins.includes("*"))) {
        return callback(
          new Error("FATAL SECURITY ERROR: FRONTEND_ORIGIN cannot be '*' in production.")
        );
      }

      if (rawFrontendOrigin === "*" || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow common cloud patterns and cPanel domains
      if (
        /^https?:\/\/.*\.(vercel\.app|onrender\.com|netlify\.app|pages\.dev)$/.test(normalizedOrigin) ||
        /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Wildcard support (e.g. *.domain.com)
      const matchedWildcard = allowedOrigins.some((allowed) => {
        if (allowed.startsWith("*.")) {
          return normalizedOrigin.endsWith(allowed.slice(2));
        }
        return false;
      });

      if (matchedWildcard) return callback(null, true);

      // Default allow (fallback)
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", "Authorization", "x-company-id",
      "x-request-id", "Accept", "Origin", "X-Requested-With",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "x-request-id"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  // Return the underlying Express instance for Passenger
  return app.getHttpAdapter().getInstance();
}

// Passenger expects module.exports to be the app (or a promise of one)
module.exports = createApp();
