export default `#graphql
  type Review {
    id: ID!
    reviewer: User!
    reviewee: User!
    rating: Int!
    comment: String
    endorsedSkill: String
    createdAt: DateTime!
  }

  type ReviewPage {
    items: [Review!]!
    pageInfo: PageInfo!
  }

  type RatingSummary {
    average: Float!
    count: Int!
    "Counts for 1★..5★"
    distribution: [Int!]!
  }

  input ReviewInput {
    connectionId: ID!
    rating: Int!
    comment: String
    endorsedSkill: String
  }

  extend type Query {
    reviews(userId: ID!, page: PageInput): ReviewPage!
    ratingSummary(userId: ID!): RatingSummary!
    "Recent public 4–5★ reviews with comments, used for landing-page testimonials"
    featuredReviews(limit: Int = 3): [Review!]!
  }

  extend type Mutation {
    createReview(input: ReviewInput!): Review!
  }
`;
