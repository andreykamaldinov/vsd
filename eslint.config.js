// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        files: ['**/*.ts'],
        extends: [
            // Apply the recommended core rules
            eslint.configs.recommended,
            // Apply the recommended TypeScript rules
            ...tseslint.configs.recommended,
            // Optionally apply stylistic rules from typescript-eslint that improve code consistency
            ...tseslint.configs.stylistic,
            // Apply the recommended Angular rules
            ...angular.configs.tsRecommended,
            // eslint.configs.recommended,
            // tseslint.configs.recommended,
            // tseslint.configs.strictTypeChecked,
            // tseslint.configs.stylistic,
            // tseslint.configs.stylisticTypeChecked,
            // angular.configs.tsRecommended,
            // angular.configs.tsAll,
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            '@typescript-eslint/ban-ts-comment': ['error', { minimumDescriptionLength: 10 }],
            '@typescript-eslint/no-array-constructor': 'error',
            '@typescript-eslint/no-duplicate-enum-values': 'error',
            '@typescript-eslint/no-empty-object-type': 'error',
            '@typescript-eslint/no-extra-non-null-assertion': 'error',
            '@typescript-eslint/no-misused-new': 'error',
            '@typescript-eslint/no-namespace': 'error',
            '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-this-alias': 'error',
            '@typescript-eslint/no-unnecessary-type-constraint': 'error',
            '@typescript-eslint/no-unsafe-declaration-merging': 'error',
            '@typescript-eslint/no-unsafe-function-type': 'error',
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/no-useless-constructor': 'error',
            '@typescript-eslint/no-wrapper-object-types': 'error',
            '@typescript-eslint/prefer-as-const': 'error',
            '@typescript-eslint/prefer-namespace-keyword': 'error',
            '@typescript-eslint/triple-slash-reference': 'error',
            'no-array-constructor': 'off',
            'no-useless-constructor': 'off',
            'no-return-await': 'error',
            'no-useless-catch': 'error',
            'no-unused-labels': 'error',
            'no-unneeded-ternary': 'error',
            'no-undefined': 'error',
            'no-undef-init': 'error',
            'no-regex-spaces': 'error',
            'no-proto': 'error',
            'no-new-wrappers': 'error',
            'no-unused-private-class-members': 'error',
            'no-invalid-regexp': 'error',
            curly: ['error', 'all'],
            '@typescript-eslint/restrict-template-expressions': 'error',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/adjacent-overload-signatures': 'error',
            'no-console': ['warn'],
            '@typescript-eslint/explicit-member-accessibility': 'error',
            '@typescript-eslint/no-inferrable-types': ['error', { ignoreParameters: true }],
            'no-unused-vars': 'off',
            'no-duplicate-imports': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/no-invalid-void-type': 'error',
            '@typescript-eslint/indent': 0,
            '@typescript-eslint/member-delimiter-style': 0,
            '@typescript-eslint/no-var-requires': 0,
            '@typescript-eslint/no-use-before-define': 0,
            'prefer-const': 1,
            'prefer-spread': 1,
            'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
            'import/no-unresolved': 'off',
            'import/no-extraneous-dependencies': 'off',
            'import/prefer-default-export': 'off',
            'no-underscore-dangle': 'off',
            'class-methods-use-this': 'off',
            'lines-between-class-members': 'off',
            'no-return-assign': 'off',
            'no-param-reassign': [
                'error',
                {
                    props: false,
                },
            ],
            '@typescript-eslint/array-type': 'error',
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                {
                    assertionStyle: 'as',
                },
            ],
            'no-plusplus': ['off'],
            '@typescript-eslint/unbound-method': 'off',
            'import/no-cycle': 'off',
            'import/extensions': 'off',
        },
    },
    {
        files: ['**/*.html'],
        extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
        rules: {},
    },
]);
