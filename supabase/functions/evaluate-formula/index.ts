import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Formula Engine - ported from frontend for server-side execution
 */

// Mathematical functions
const mathFunctions: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  sqrt: Math.sqrt,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  sum: (...args) => args.reduce((sum, val) => sum + val, 0),
  avg: (...args) => args.reduce((sum, val) => sum + val, 0) / args.length,
};

// String functions
const stringFunctions: Record<string, (...args: any[]) => string> = {
  upper: (str: string) => String(str).toUpperCase(),
  lower: (str: string) => String(str).toLowerCase(),
  trim: (str: string) => String(str).trim(),
  concat: (...args: any[]) => args.map(String).join(''),
  substring: (str: string, start: number, end?: number) => String(str).substring(start, end),
  replace: (str: string, search: string, replace: string) => String(str).replace(new RegExp(search, 'g'), replace),
  length: (str: string) => String(String(str).length),
};

// Date functions
const dateFunctions: Record<string, (...args: any[]) => any> = {
  now: () => new Date(),
  today: () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  },
  year: (date: Date) => new Date(date).getFullYear(),
  month: (date: Date) => new Date(date).getMonth() + 1,
  day: (date: Date) => new Date(date).getDate(),
  hour: (date: Date) => new Date(date).getHours(),
  minute: (date: Date) => new Date(date).getMinutes(),
  dateAdd: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  dateDiff: (date1: Date, date2: Date, unit: string = 'days') => {
    const diff = new Date(date1).getTime() - new Date(date2).getTime();
    const divisors: Record<string, number> = {
      days: 1000 * 60 * 60 * 24,
      hours: 1000 * 60 * 60,
      minutes: 1000 * 60,
      seconds: 1000,
    };
    return Math.floor(diff / (divisors[unit] || divisors.days));
  },
  formatDate: (date: Date, format: string) => {
    const d = new Date(date);
    const formats: Record<string, string> = {
      'YYYY': String(d.getFullYear()),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0'),
    };
    let result = format;
    for (const [key, value] of Object.entries(formats)) {
      result = result.replace(key, value);
    }
    return result;
  },
};

// Logical functions
const logicalFunctions: Record<string, (...args: any[]) => any> = {
  if: (condition: boolean, ifTrue: any, ifFalse: any) => condition ? ifTrue : ifFalse,
  and: (...args: boolean[]) => args.every(Boolean),
  or: (...args: boolean[]) => args.some(Boolean),
  not: (value: boolean) => !value,
  isNull: (value: any) => value == null,
  isEmpty: (value: any) => value == null || value === '' || (Array.isArray(value) && value.length === 0),
};

// All functions
const allFunctions = {
  ...mathFunctions,
  ...stringFunctions,
  ...dateFunctions,
  ...logicalFunctions,
};

/**
 * Simple expression evaluator
 */
function evaluateFormula(expression: string, context: Record<string, any>): any {
  // Replace column references {column_name} with actual values
  let processedExpression = expression;
  const columnRegex = /\{([^}]+)\}/g;
  let match;

  while ((match = columnRegex.exec(expression)) !== null) {
    const columnName = match[1];
    const value = context[columnName];

    if (value === undefined) {
      throw new Error(`Column "${columnName}" not found in context`);
    }

    // Replace with actual value
    const replacement = typeof value === 'string' ? `"${value}"` : String(value);
    processedExpression = processedExpression.replace(match[0], replacement);
  }

  // Parse and evaluate simple expressions
  try {
    // Handle function calls
    for (const [funcName, func] of Object.entries(allFunctions)) {
      const funcRegex = new RegExp(`${funcName}\\s*\\(([^)]*)\\)`, 'gi');
      let funcMatch;

      while ((funcMatch = funcRegex.exec(processedExpression)) !== null) {
        const argsStr = funcMatch[1];
        const args = argsStr.split(',').map((arg: string) => {
          arg = arg.trim();

          // String literal
          if (arg.startsWith('"') || arg.startsWith("'")) {
            return arg.slice(1, -1);
          }

          // Number
          if (!isNaN(Number(arg))) {
            return Number(arg);
          }

          // Boolean
          if (arg === 'true') return true;
          if (arg === 'false') return false;

          // Null/undefined
          if (arg === 'null') return null;
          if (arg === 'undefined') return undefined;

          return arg;
        });

        const result = func(...args);
        processedExpression = processedExpression.replace(
          funcMatch[0],
          typeof result === 'string' ? `"${result}"` : String(result)
        );
      }
    }

    // Evaluate mathematical expressions
    // Simple eval for basic math (safe because we control the input)
    const mathResult = evaluateMathExpression(processedExpression);
    return mathResult;
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${error.message}`);
  }
}

/**
 * Safe mathematical expression evaluator
 */
function evaluateMathExpression(expr: string): number | string | boolean {
  // Remove quotes for string results
  if (expr.startsWith('"') && expr.endsWith('"')) {
    return expr.slice(1, -1);
  }

  // Boolean
  if (expr === 'true') return true;
  if (expr === 'false') return false;

  // Try to evaluate as number
  try {
    // Only allow safe mathematical operations
    const safeExpr = expr.replace(/[^0-9+\-*/.() ]/g, '');
    if (safeExpr !== expr && !expr.includes('"')) {
      throw new Error('Invalid characters in mathematical expression');
    }

    // Use Function constructor (safer than eval)
    const result = new Function(`return ${safeExpr}`)();
    return result;
  } catch {
    // If not a number, return as string
    return expr;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { expression, rowData, returnType } = await req.json();

    if (!expression) {
      return new Response(
        JSON.stringify({ error: 'Missing expression parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rowData) {
      return new Response(
        JSON.stringify({ error: 'Missing rowData parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Evaluating formula:', expression);
    console.log('With context:', rowData);

    // Evaluate formula
    const result = evaluateFormula(expression, rowData);

    console.log('Formula result:', result);

    // Convert result to expected type
    let typedResult = result;
    if (returnType) {
      switch (returnType) {
        case 'number':
          typedResult = Number(result);
          break;
        case 'text':
          typedResult = String(result);
          break;
        case 'boolean':
          typedResult = Boolean(result);
          break;
        case 'date':
          typedResult = new Date(result);
          break;
      }
    }

    return new Response(
      JSON.stringify({
        result: typedResult,
        expression,
        evaluatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Formula evaluation error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
