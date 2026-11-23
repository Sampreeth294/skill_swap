export default `#graphql
  enum RequestStatus { PENDING ACCEPTED REJECTED CANCELLED }
  enum RequestMode { EXCHANGE CREDIT }
  enum RequestBox { INCOMING OUTGOING ALL }
  enum ConnectionStatus { ACTIVE COMPLETED }

  type SwapRequest {
    id: ID!
    from: User!
    to: User!
    mode: RequestMode!
    requestedSkill: Skill
    offeredSkill: Skill
    creditCost: Int!
    message: String
    status: RequestStatus!
    isIncoming: Boolean!
    createdAt: DateTime!
    respondedAt: DateTime
  }

  type RequestPage {
    items: [SwapRequest!]!
    pageInfo: PageInfo!
  }

  type Exchange {
    teacher: User!
    learner: User!
    skillName: String!
  }

  type Connection {
    id: ID!
    partner: User!
    users: [User!]!
    exchanges: [Exchange!]!
    status: ConnectionStatus!
    completedSessions: Int!
    createdAt: DateTime!
    completedAt: DateTime
    lastMessageAt: DateTime
    lastMessage: Message
    unreadCount: Int!
    canReview: Boolean!
    myReview: Review
  }

  input SwapRequestInput {
    toUserId: ID!
    requestedSkillId: ID!
    offeredSkillId: ID
    mode: RequestMode = EXCHANGE
    message: String
  }

  extend type Query {
    swapRequests(box: RequestBox = ALL, status: RequestStatus, page: PageInput): RequestPage!
    connections(status: ConnectionStatus): [Connection!]!
    connection(id: ID!): Connection
  }

  extend type Mutation {
    sendSwapRequest(input: SwapRequestInput!): SwapRequest!
    acceptSwapRequest(id: ID!): SwapRequest!
    rejectSwapRequest(id: ID!): SwapRequest!
    cancelSwapRequest(id: ID!): SwapRequest!
    "Both partners have finished their exchange (requires 1+ completed session)"
    completeExchange(connectionId: ID!): Connection!
  }

  extend type Subscription {
    requestUpdated: SwapRequest!
  }
`;
