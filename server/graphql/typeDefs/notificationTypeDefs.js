export default `#graphql
  enum NotificationType {
    SWAP_REQUEST
    REQUEST_ACCEPTED
    REQUEST_REJECTED
    NEW_MESSAGE
    SESSION_INVITATION
    SESSION_UPDATE
    LEARNING_MILESTONE
    EXCHANGE_COMPLETED
    CREDITS_EARNED
    ACHIEVEMENT
    NEW_REVIEW
    ROOM_INVITE
    SYSTEM
  }

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    body: String
    link: String
    read: Boolean!
    actor: User
    createdAt: DateTime!
  }

  type NotificationPage {
    items: [Notification!]!
    pageInfo: PageInfo!
  }

  extend type Query {
    notifications(unreadOnly: Boolean = false, page: PageInput): NotificationPage!
    unreadNotificationCount: Int!
  }

  extend type Mutation {
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Int!
    deleteNotification(id: ID!): ID!
  }

  extend type Subscription {
    notificationAdded: Notification!
  }
`;
