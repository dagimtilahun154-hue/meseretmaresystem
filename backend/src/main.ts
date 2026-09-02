import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import * as fs from "fs";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>("NODE_ENV") === "production";
  const rawFrontendOrigin = config.get<string>("FRONTEND_ORIGIN", "*");

  const allowedOrigins = rawFrontendOrigin
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // Synchronously ensure uploads directory exists
  const uploadsDir = join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Increase payload limit for Base64 profile pictures and documents
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Serve static files from the uploads directory with CORS headers
  app.useStaticAssets(uploadsDir, {
    prefix: "/uploads/",
    setHeaders: (res) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  });

  app.setGlobalPrefix("api/v1");
  app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to load cross origin

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Postman)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (isProduction && (rawFrontendOrigin === "*" || allowedOrigins.includes("*"))) {
        return callback(
          new Error("FATAL SECURITY ERROR: FRONTEND_ORIGIN cannot be '*' in production environments.")
        );
      }

      // If FRONTEND_ORIGIN is '*' or contains '*', reflect the requesting origin
      if (rawFrontendOrigin === "*" || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      // Check explicit allowed origins
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Automatically allow common cloud hosting domains for frontend deployments
      if (
        /^https:\/\/.*\.vercel\.app$/.test(normalizedOrigin) ||
        /^https:\/\/.*\.onrender\.com$/.test(normalizedOrigin) ||
        /^https:\/\/.*\.netlify\.app$/.test(normalizedOrigin) ||
        /^https:\/\/.*\.pages\.dev$/.test(normalizedOrigin) ||
        /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Allow wildcard patterns in FRONTEND_ORIGIN (e.g. *.domain.com)
      const matchedWildcard = allowedOrigins.some((allowed) => {
        if (allowed.startsWith("*.")) {
          const rootDomain = allowed.slice(2);
          return normalizedOrigin.endsWith(rootDomain);
        }
        return false;
      });

      if (matchedWildcard) {
        return callback(null, true);
      }

      // Dynamic fallback to allow request
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-company-id",
      "x-request-id",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "x-request-id"],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  console.log(`Meseret Mare ERP backend running on http://localhost:${port}/api/v1`);
}

bootstrap();
