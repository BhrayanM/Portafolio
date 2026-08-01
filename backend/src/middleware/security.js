const helmet = require('helmet');

const securityMiddleware = (app) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        // scriptSrc NO se toca a proposito (D-03): endurecerlo romperia Swagger UI
        // y el frontend. Lo de abajo es aditivo y no afecta a la carga de scripts.
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        // frame-ancestors es la version moderna de X-Frame-Options (anti clickjacking).
        frameAncestors: ["'none'"],
        // Sin plugins embebidos (Flash/Java): superficie muerta pero explotable.
        objectSrc: ["'none'"],
        // Impide que un HTML inyectado reescriba las URLs relativas con <base>.
        baseUri: ["'self'"],
        // Evita que un formulario inyectado postee credenciales a un dominio externo.
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' },
  }));

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });
};

module.exports = { securityMiddleware };
