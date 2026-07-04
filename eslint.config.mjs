import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // No son código de la app: binario + datos + scripts JSVM de PocketBase
    // (usan globals/triple-slash propios del runtime de PocketBase, no de Node/TS).
    "pocketbase/**",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
