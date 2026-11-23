export default `#graphql
  enum ReportTarget { USER MESSAGE REVIEW SKILL }
  enum ReportStatus { OPEN RESOLVED DISMISSED }
  enum ReportAction { DISMISS RESOLVE HIDE_CONTENT SUSPEND_USER }

  type Report {
    id: ID!
    reporter: User!
    targetType: ReportTarget!
    targetId: ID!
    targetUser: User
    targetPreview: String
    reason: String!
    status: ReportStatus!
    resolution: String
    createdAt: DateTime!
  }

  type ReportPage {
    items: [Report!]!
    pageInfo: PageInfo!
  }

  type TimelinePoint {
    date: String!
    signups: Int!
    requests: Int!
    sessions: Int!
  }

  type AdminStats {
    users: Int!
    activeUsers: Int!
    suspendedUsers: Int!
    onlineUsers: Int!
    skills: Int!
    connections: Int!
    requests: Int!
    pendingRequests: Int!
    sessionsCompleted: Int!
    messages: Int!
    openReports: Int!
    creditsInCirculation: Int!
    timeline: [TimelinePoint!]!
    topSkills: [PopularSkill!]!
  }

  type ActivityEvent {
    id: ID!
    kind: String!
    text: String!
    actor: User
    createdAt: DateTime!
  }

  input AdminUserFilter {
    search: String
    status: UserStatus
    role: Role
  }

  input CategoryInput {
    name: String!
    description: String
    icon: String
    color: String
    isActive: Boolean
  }

  input ReportInput {
    targetType: ReportTarget!
    targetId: ID!
    reason: String!
  }

  extend type Query {
    adminStats: AdminStats!
    adminUsers(filter: AdminUserFilter, page: PageInput): UserPage!
    adminRequests(status: RequestStatus, page: PageInput): RequestPage!
    adminReports(status: ReportStatus = OPEN, page: PageInput): ReportPage!
    adminActivity(limit: Int = 20): [ActivityEvent!]!
    adminCategories: [SkillCategory!]!
  }

  extend type Mutation {
    reportContent(input: ReportInput!): Report!
    adminSetUserStatus(userId: ID!, status: UserStatus!): User!
    adminSetUserRole(userId: ID!, role: Role!): User!
    createCategory(input: CategoryInput!): SkillCategory!
    updateCategory(id: ID!, input: CategoryInput!): SkillCategory!
    deleteCategory(id: ID!): ID!
    resolveReport(id: ID!, action: ReportAction!, note: String): Report!
  }
`;
