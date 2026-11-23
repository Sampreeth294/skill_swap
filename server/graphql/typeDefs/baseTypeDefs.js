export default `#graphql
  "ISO-8601 date-time string"
  scalar DateTime

  type PageInfo {
    total: Int!
    page: Int!
    limit: Int!
    pages: Int!
    hasNextPage: Boolean!
  }

  input PageInput {
    page: Int = 1
    limit: Int = 12
  }

  type Query {
    health: String!
  }

  type Mutation {
    _noop: Boolean
  }

  type Subscription {
    _noop: Boolean
  }
`;
