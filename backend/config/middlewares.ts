import type { Core } from '@strapi/strapi';

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const configuredOrigins = env.array('CORS_ORIGINS', DEV_ORIGINS) as string[];

  return [
    'strapi::logger',
    'strapi::errors',
    'strapi::security',
    {
      name: 'global::rate-limit',
      config: {
        windowMs: env.int('RATE_LIMIT_WINDOW_MS', 60_000),
        max: env.int('RATE_LIMIT_MAX', 300),
      },
    },
    {
      name: 'strapi::cors',
      config: {
        origin: configuredOrigins,
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        keepHeaderOnError: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    {
      name: 'strapi::body',
      config: {
        // بدنه‌های بزرگ‌تر از این سقف رد می‌شوند (جلوگیری از payload bomb)
        jsonLimit: env('BODY_JSON_LIMIT', '256kb'),
        formLimit: env('BODY_FORM_LIMIT', '256kb'),
      },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
