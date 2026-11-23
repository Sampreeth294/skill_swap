export default `#graphql
  enum Role { USER ADMIN }
  enum UserStatus { ACTIVE SUSPENDED }
  enum UserSort { TOP_RATED MOST_EXCHANGES NEWEST }

  type Availability {
    day: Int!
    dayLabel: String!
    start: String!
    end: String!
  }

  type Streak {
    current: Int!
    longest: Int!
    lastDate: String
  }

  type User {
    id: ID!
    name: String!
    "Only visible to the user themself and admins"
    email: String
    role: Role!
    status: UserStatus!
    avatarUrl: String
    headline: String
    bio: String
    location: String
    experience: String
    learningInterests: [String!]!
    availability: [Availability!]!
    ratingAvg: Float!
    ratingCount: Int!
    completedExchanges: Int!
    teachingHours: Float!
    learningHours: Float!
    "Private: own account or admin only"
    credits: Int
    "Private: own account or admin only"
    streak: Streak
    isOnline: Boolean!
    lastSeen: DateTime
    teachSkills: [Skill!]!
    learnSkills: [Skill!]!
    profileCompletion: Int!
    createdAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type UserPage {
    items: [User!]!
    pageInfo: PageInfo!
  }

  type Presence {
    userId: ID!
    isOnline: Boolean!
    lastSeen: DateTime
  }

  type PublicStats {
    users: Int!
    skills: Int!
    exchanges: Int!
    sessions: Int!
    categories: Int!
    hoursShared: Int!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input AvailabilityInput {
    day: Int!
    start: String!
    end: String!
  }

  input ProfileInput {
    name: String
    avatarUrl: String
    headline: String
    bio: String
    location: String
    experience: String
    learningInterests: [String!]
    availability: [AvailabilityInput!]
  }

  input UserFilter {
    search: String
    teaches: String
    categoryId: ID
    location: String
  }

  extend type Query {
    me: User
    user(id: ID!): User
    users(filter: UserFilter, page: PageInput, sort: UserSort = TOP_RATED): UserPage!
    featuredUsers(limit: Int = 6): [User!]!
    publicStats: PublicStats!
  }

  extend type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    updateProfile(input: ProfileInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
  }

  extend type Subscription {
    "Online/offline changes of people you are connected with"
    presenceChanged: Presence!
  }
`;
