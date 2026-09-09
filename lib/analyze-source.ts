import { parse } from '@babel/parser';
import type { CodeConstruct, SourceAnalysis } from './exploration';
type AstNode = {
  type: string;
  loc?: { start: { line: number }; end: { line: number } };
  id?: { name?: string };
  key?: { name?: string; value?: string };
  name?: string;
  [key: string]: unknown;
};
export function analyzeSource(code: string, path: string): SourceAnalysis {
  if (!/\.[cm]?[jt]sx?$/.test(path))
    return { constructs: [], mode: 'unsupported' };
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      plugins: [
        ...(/\.[cm]?tsx?$/.test(path) ? ['typescript' as const] : []),
        ...(/\.[jt]sx$/.test(path) ? ['jsx' as const] : []),
      ],
      errorRecovery: true,
    });
    const constructs: CodeConstruct[] = [];
    const branches = new Set([
      'IfStatement',
      'ConditionalExpression',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'CatchClause',
      'SwitchCase',
      'LogicalExpression',
    ]);
    function complexity(node: AstNode): number {
      let result = 1;
      function scan(value: unknown) {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
          value.forEach(scan);
          return;
        }
        const n = value as AstNode;
        if (branches.has(n.type)) result++;
        for (const [key, child] of Object.entries(n))
          if (!['loc', 'comments', 'tokens', 'errors'].includes(key))
            scan(child);
      }
      scan(node);
      return result;
    }
    function walk(value: unknown, parent?: AstNode) {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach((v) => walk(v, parent));
        return;
      }
      const node = value as AstNode;
      const isClass =
        node.type === 'ClassDeclaration' || node.type === 'ClassExpression';
      const isFunction = [
        'FunctionDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression',
        'ClassMethod',
        'ClassPrivateMethod',
        'ObjectMethod',
      ].includes(node.type);
      if ((isClass || isFunction) && node.loc) {
        const parentId = parent?.id as { name?: string } | undefined;
        const name =
          node.id?.name ||
          node.key?.name ||
          node.key?.value ||
          parentId?.name ||
          (parent?.type === 'ExportDefaultDeclaration'
            ? 'default export'
            : `anonymous @ ${node.loc.start.line}`);
        const start = node.loc.start.line,
          end = node.loc.end.line;
        constructs.push({
          id: `${start}:${end}:${name}`,
          name,
          kind: isClass ? 'class' : 'function',
          start,
          end,
          lines: end - start + 1,
          complexity: complexity(node),
        });
      }
      for (const [key, child] of Object.entries(node))
        if (!['loc', 'comments', 'tokens', 'errors'].includes(key))
          walk(child, node);
    }
    walk(ast);
    return { constructs: constructs.slice(0, 150), mode: 'ast' };
  } catch {
    return { constructs: [], mode: 'unparsed' };
  }
}
