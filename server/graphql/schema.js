import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLObjectType } from 'graphql';
import typeDefs from './typeDefs/index.js';
import resolvers from './resolvers/index.js';

export function buildSchema() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Every `id: ID!` field resolves from Mongoose docs (`id`) and lean objects (`_id`)
  for (const type of Object.values(schema.getTypeMap())) {
    if (!(type instanceof GraphQLObjectType) || type.name.startsWith('__')) continue;
    const field = type.getFields().id;
    if (field && !field.resolve) field.resolve = (p) => (p.id != null ? String(p.id) : String(p._id));
  }
  return schema;
}
