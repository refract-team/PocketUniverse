module.exports = {
  extends: ["custom", 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "warn",
    ],
    // Ignore next/image since this is a chrome extension and these images are bundled.
    //
    // TODO(jqphu): we shouldn't even have next here.
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off"
  },
  root: true,
};
