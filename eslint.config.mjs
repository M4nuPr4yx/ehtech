import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["src/**/*.{js,jsx}"],
    // A versão nova do preset inclui recomendações para efeitos já existentes.
    // Mantenha-as visíveis sem exigir uma refatoração das telas nesta atualização.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "scratch/**",
    "backend/uploads/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
