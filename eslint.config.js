// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
            tseslint.configs.strictTypeChecked,
            tseslint.configs.stylistic,
            tseslint.configs.stylisticTypeChecked,
            angular.configs.tsRecommended,
            angular.configs.tsAll,
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        processor: angular.processInlineTemplates,
        rules: {
            complexity: ['error', 22],
            curly: ['error', 'all'],
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                {
                    accessibility: 'explicit',
                    overrides: {
                        constructors: 'no-public',
                    },
                },
            ],
            '@typescript-eslint/explicit-function-return-type': [
                'error',
                {
                    allowExpressions: false,
                    allowHigherOrderFunctions: false,
                    allowTypedFunctionExpressions: true,
                },
            ],
            '@typescript-eslint/member-ordering': [
                'error',
                {
                    default: {
                        memberTypes: [
                            'public-static-field',
                            'protected-static-field',
                            'private-static-field',
                            'public-instance-field',
                            'protected-instance-field',
                            'private-instance-field',
                            'public-constructor',
                            'protected-constructor',
                            'private-constructor',
                            'public-static-method',
                            'protected-static-method',
                            'private-static-method',
                            'public-instance-method',
                            'protected-instance-method',
                            'private-instance-method',
                        ],
                        order: 'as-written',
                    },
                },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'forbid',
                    trailingUnderscore: 'forbid',
                },
                {
                    selector: 'variable',
                    modifiers: ['const', 'global'],
                    format: ['camelCase', 'UPPER_CASE'],
                },
                {
                    selector: 'parameter',
                    modifiers: ['unused'],
                    leadingUnderscore: 'allow',
                    format: ['camelCase'],
                },
                {
                    selector: 'memberLike',
                    modifiers: ['private'],
                    leadingUnderscore: 'require',
                    format: ['camelCase'],
                },
                {
                    selector: 'memberLike',
                    modifiers: ['protected'],
                    leadingUnderscore: 'require',
                    format: ['camelCase'],
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                {
                    selector: 'typeParameter',
                    format: ['PascalCase'],
                    prefix: ['T'],
                },
                {
                    selector: 'enumMember',
                    format: ['PascalCase'],
                },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/strict-boolean-expressions': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-unnecessary-type-arguments': 'error',
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
        },
    },
    {
        files: ['**/*.html'],
        extends: [
            angular.configs.templateRecommended,
            angular.configs.templateAccessibility,
            angular.configs.templateAll,
        ],
        rules: {
            '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 7 }],
            '@angular-eslint/template/i18n': [
                'error',
                {
                    checkId: true,
                    checkText: false,
                    checkAttributes: false,
                },
            ],
            '@angular-eslint/template/use-track-by-function': 'error',
        },
    },
]);
