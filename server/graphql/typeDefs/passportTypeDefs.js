export default `#graphql
  enum BadgeTier { BRONZE SILVER GOLD }

  type AchievementBadge {
    code: String!
    title: String!
    description: String!
    icon: String!
    tier: BadgeTier!
    earned: Boolean!
    awardedAt: DateTime
  }

  type SkillHours {
    skillName: String!
    hours: Float!
    sessions: Int!
  }

  type Endorsement {
    skillName: String!
    count: Int!
  }

  type Reputation {
    score: Int!
    level: String!
    nextLevelAt: Int
  }

  type SkillPassport {
    user: User!
    teachingHours: Float!
    learningHours: Float!
    completedExchanges: Int!
    sessionsCompleted: Int!
    skillsTaught: [SkillHours!]!
    skillsLearned: [SkillHours!]!
    masteredSkills: [String!]!
    learnedSkills: [String!]!
    achievements: [AchievementBadge!]!
    endorsements: [Endorsement!]!
    milestonesCompleted: Int!
    recentMilestones: [QuestMilestone!]!
    reputation: Reputation!
    memberSince: DateTime!
  }

  type ActivityDay {
    date: String!
    milestones: Int!
    sessions: Int!
    messages: Int!
  }

  type DashboardStats {
    teachCount: Int!
    learnCount: Int!
    connections: Int!
    pendingIncoming: Int!
    upcomingSessions: Int!
    activeQuests: Int!
    credits: Int!
    unreadNotifications: Int!
    unreadMessages: Int!
    profileCompletion: Int!
    missingProfileItems: [String!]!
  }

  extend type Query {
    "Defaults to the signed-in user"
    skillPassport(userId: ID): SkillPassport!
    dashboardStats: DashboardStats!
    myActivity(days: Int = 14): [ActivityDay!]!
  }
`;
