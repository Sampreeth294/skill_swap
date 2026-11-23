export default `#graphql
  enum QuestStatus { ACTIVE COMPLETED }

  type QuestMilestone {
    id: ID!
    questId: ID!
    title: String!
    order: Int!
    dueDate: DateTime
    completed: Boolean!
    completedAt: DateTime
  }

  type LearningQuest {
    id: ID!
    title: String!
    skillName: String!
    description: String
    targetDays: Int!
    startDate: DateTime!
    endDate: DateTime!
    daysLeft: Int!
    status: QuestStatus!
    completedAt: DateTime
    milestones: [QuestMilestone!]!
    completedCount: Int!
    totalCount: Int!
    progress: Int!
  }

  input QuestInput {
    title: String!
    skillName: String!
    description: String
    targetDays: Int = 21
    milestones: [String!]!
  }

  extend type Query {
    quests(status: QuestStatus): [LearningQuest!]!
    quest(id: ID!): LearningQuest
  }

  extend type Mutation {
    createQuest(input: QuestInput!): LearningQuest!
    addMilestone(questId: ID!, title: String!): LearningQuest!
    toggleMilestone(id: ID!): LearningQuest!
    deleteMilestone(id: ID!): LearningQuest!
    deleteQuest(id: ID!): ID!
  }
`;
