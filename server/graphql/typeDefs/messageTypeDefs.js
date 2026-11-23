export default `#graphql
  type Message {
    id: ID!
    connectionId: ID
    roomId: ID
    sender: User!
    body: String!
    isMine: Boolean!
    createdAt: DateTime!
    readAt: DateTime
  }

  type MessagePage {
    items: [Message!]!
    hasMore: Boolean!
  }

  type TypingEvent {
    connectionId: ID!
    userId: ID!
    isTyping: Boolean!
  }

  extend type Query {
    "Cursor pagination: pass the createdAt of the oldest loaded message as 'before'"
    messages(connectionId: ID!, before: DateTime, limit: Int = 30): MessagePage!
    unreadMessageCount: Int!
  }

  extend type Mutation {
    sendMessage(connectionId: ID!, body: String!): Message!
    markConversationRead(connectionId: ID!): Int!
    setTyping(connectionId: ID!, isTyping: Boolean!): Boolean!
  }

  extend type Subscription {
    "Omit connectionId to receive every new message addressed to you"
    messageAdded(connectionId: ID): Message!
    typing(connectionId: ID!): TypingEvent!
  }
`;
