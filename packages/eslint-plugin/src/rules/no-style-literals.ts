import type { Rule } from 'eslint';
import type { Node, CallExpression, ObjectExpression, Property, Identifier, Literal, MemberExpression } from 'estree';
import { getPropertyCategory, getSuggestedToken, getTokenTypeName } from '../util/styleProperties.js';

export interface RuleOptions {
  enforceSpacing?: boolean;
  enforceTypography?: boolean;
  enforceBorderRadius?: boolean;
  allowedLiterals?: number[];
  ignoredProperties?: string[];
}

const DEFAULT_OPTIONS: Required<RuleOptions> = {
  enforceSpacing: true,
  enforceTypography: true,
  enforceBorderRadius: true,
  allowedLiterals: [0, 1],
  ignoredProperties: [],
};

/**
 * Check if a node is a StyleSheet.create() call
 */
function isStyleSheetCreate(node: CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') return false;

  const memberExpr = callee as MemberExpression;
  const object = memberExpr.object;
  const property = memberExpr.property;

  return (
    object.type === 'Identifier' &&
    (object as Identifier).name === 'StyleSheet' &&
    property.type === 'Identifier' &&
    (property as Identifier).name === 'create'
  );
}

/**
 * Check if a property should be enforced based on options
 */
function shouldEnforceProperty(propertyName: string, options: Required<RuleOptions>): boolean {
  if (options.ignoredProperties.includes(propertyName)) {
    return false;
  }

  const category = getPropertyCategory(propertyName);
  if (!category) return false;

  switch (category) {
    case 'spacing':
      return options.enforceSpacing;
    case 'typography':
      return options.enforceTypography;
    case 'borderRadius':
      return options.enforceBorderRadius;
    default:
      return false;
  }
}

/**
 * Check if a value is in the allowed literals list
 */
function isAllowedLiteral(value: unknown, allowedLiterals: number[]): boolean {
  if (typeof value === 'number') {
    return allowedLiterals.includes(value);
  }
  return false;
}

/**
 * Process a style object and report violations
 */
function processStyleObject(
  context: Rule.RuleContext,
  styleObject: ObjectExpression,
  options: Required<RuleOptions>
): void {
  for (const prop of styleObject.properties) {
    if (prop.type !== 'Property') continue;

    const property = prop as Property;

    // Get property name
    let propertyName: string | null = null;
    if (property.key.type === 'Identifier') {
      propertyName = (property.key as Identifier).name;
    } else if (property.key.type === 'Literal' && typeof (property.key as Literal).value === 'string') {
      propertyName = (property.key as Literal).value as string;
    }

    if (!propertyName) continue;

    // Check if this property should be enforced
    if (!shouldEnforceProperty(propertyName, options)) continue;

    // Check if value is a literal
    const value = property.value;
    if (value.type !== 'Literal') continue;

    const literalValue = (value as Literal).value;

    // Skip allowed literals
    if (isAllowedLiteral(literalValue, options.allowedLiterals)) continue;

    // Get category and report
    const category = getPropertyCategory(propertyName);
    if (!category) continue;

    const tokenTypeName = getTokenTypeName(category, propertyName);
    const suggestedToken = getSuggestedToken(category, propertyName);

    context.report({
      node: value as unknown as Node,
      message: `Use a ${tokenTypeName} (e.g., ${suggestedToken}) instead of literal value ${JSON.stringify(literalValue)} for '${propertyName}'`,
    });
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce the use of design tokens instead of literal values in React Native styles',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          enforceSpacing: {
            type: 'boolean',
            default: true,
          },
          enforceTypography: {
            type: 'boolean',
            default: true,
          },
          enforceBorderRadius: {
            type: 'boolean',
            default: true,
          },
          allowedLiterals: {
            type: 'array',
            items: { type: 'number' },
            default: [0, 1],
          },
          ignoredProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noStyleLiteral:
        "Use a {{tokenType}} (e.g., {{suggestedToken}}) instead of literal value {{value}} for '{{property}}'",
    },
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const userOptions = (context.options[0] || {}) as RuleOptions;
    const options: Required<RuleOptions> = {
      ...DEFAULT_OPTIONS,
      ...userOptions,
    };

    return {
      CallExpression(node: Node): void {
        const callExpr = node as CallExpression;

        if (!isStyleSheetCreate(callExpr)) return;

        // Get the first argument (the styles object)
        const stylesArg = callExpr.arguments[0];
        if (!stylesArg || stylesArg.type !== 'ObjectExpression') return;

        const stylesObject = stylesArg as ObjectExpression;

        // Iterate through each style definition (e.g., container, text, etc.)
        for (const styleProp of stylesObject.properties) {
          if (styleProp.type !== 'Property') continue;

          const styleDefinition = styleProp as Property;

          // Each style definition should be an object
          if (styleDefinition.value.type !== 'ObjectExpression') continue;

          const styleObject = styleDefinition.value as ObjectExpression;
          processStyleObject(context, styleObject, options);
        }
      },
    };
  },
};

export default rule;
