import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const HTTP_METHOD = "/^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/";
const USE_SERVER = "Program:has(> ExpressionStatement[directive='use server'])";
const SERVER_ACTIONS = [
  {
    selector: `${USE_SERVER} > ExportNamedDeclaration > FunctionDeclaration`,
    message: "Define server actions with defineAction.",
  },
  {
    selector: `${USE_SERVER} > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator:not([init.callee.name='defineAction'])`,
    message: "Define server actions with defineAction.",
  },
];
const ROUTE_HANDLERS = [
  {
    selector: `ExportNamedDeclaration > FunctionDeclaration[id.name=${HTTP_METHOD}]`,
    message: "Define route handlers with defineRouteHandler.",
  },
  {
    selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=${HTTP_METHOD}]:not([init.callee.name='defineRouteHandler'])`,
    message: "Define route handlers with defineRouteHandler.",
  },
];
const SOURCES = ["src/**/*.ts", "src/**/*.tsx"];
const ROUTES = ["src/app/**/route.ts"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Route handlers and server actions run inside the request's scope only through these wrappers.
  {
    files: SOURCES,
    rules: {
      "no-restricted-syntax": ["error", ...SERVER_ACTIONS],
    },
  },
  {
    files: ROUTES,
    rules: {
      "no-restricted-syntax": ["error", ...ROUTE_HANDLERS],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
