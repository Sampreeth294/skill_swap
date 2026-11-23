import { GraphQLError, Kind } from 'graphql';

/** Rejects abusive, deeply nested queries before execution. */
export function depthLimit(maxDepth = 8) {
  return (context) => {
    const fragments = Object.create(null);
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments[def.name.value] = def;
    }
    const measure = (node, depth, seen) => {
      if (!node.selectionSet) return depth;
      let max = depth;
      for (const sel of node.selectionSet.selections) {
        if (sel.kind === Kind.FIELD) {
          if (sel.name.value.startsWith('__')) continue;
          max = Math.max(max, measure(sel, depth + 1, seen));
        } else if (sel.kind === Kind.INLINE_FRAGMENT) {
          max = Math.max(max, measure(sel, depth, seen));
        } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
          const name = sel.name.value;
          if (seen.has(name) || !fragments[name]) continue;
          max = Math.max(max, measure(fragments[name], depth, new Set([...seen, name])));
        }
      }
      return max;
    };
    return {
      OperationDefinition(node) {
        const depth = measure(node, 0, new Set());
        if (depth > maxDepth) {
          context.reportError(new GraphQLError(`Query is too deep (${depth}). Maximum allowed depth is ${maxDepth}.`, { extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }));
        }
      },
    };
  };
}
