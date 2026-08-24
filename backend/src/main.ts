import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const frontendOrigin = config.get<string>("FRONTEND_ORIGIN", "http://localhost:5173");

  // Increase payload limit for Base64 profile pictures and documents
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Serve static files from the uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix("api/v1");
  app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to load cross origin
  app.enableCors({
    origin: frontendOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
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
