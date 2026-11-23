export default `#graphql
  enum SkillType { TEACH LEARN }
  enum SkillLevel { BEGINNER INTERMEDIATE ADVANCED EXPERT }
  enum SkillStatus { ACTIVE COMPLETED }
  enum SkillSort { NEWEST NAME LEVEL }
  enum DNAKind { TEACH LEARN MASTERED LEARNED INTEREST }

  type SkillCategory {
    id: ID!
    name: String!
    slug: String!
    description: String
    icon: String
    color: String
    isActive: Boolean!
    teachCount: Int!
    learnCount: Int!
  }

  type Skill {
    id: ID!
    owner: User!
    type: SkillType!
    name: String!
    category: SkillCategory
    description: String
    level: SkillLevel!
    experienceMonths: Int!
    status: SkillStatus!
    createdAt: DateTime!
    "Compatibility between the signed-in user and this skill's owner"
    matchScore: Int
  }

  type SkillPage {
    items: [Skill!]!
    pageInfo: PageInfo!
  }

  type PopularSkill {
    name: String!
    category: SkillCategory
    teachers: Int!
    learners: Int!
  }

  type DNANode {
    id: ID!
    label: String!
    kind: DNAKind!
    category: SkillCategory
    level: SkillLevel
    weight: Float!
    sessions: Int!
  }

  type DNACategory {
    category: SkillCategory!
    score: Float!
    teach: Int!
    learn: Int!
  }

  type DNATotals {
    teach: Int!
    learn: Int!
    mastered: Int!
    learned: Int!
    interests: Int!
  }

  type SkillDNA {
    user: User!
    nodes: [DNANode!]!
    categories: [DNACategory!]!
    strongestCategory: SkillCategory
    totals: DNATotals!
  }

  input SkillInput {
    type: SkillType!
    name: String!
    categoryId: ID!
    description: String
    level: SkillLevel = BEGINNER
    experienceMonths: Int = 0
  }

  input SkillUpdateInput {
    name: String
    categoryId: ID
    description: String
    level: SkillLevel
    experienceMonths: Int
    status: SkillStatus
  }

  input SkillFilter {
    search: String
    type: SkillType = TEACH
    categoryId: ID
    level: SkillLevel
    ownerId: ID
  }

  extend type Query {
    categories: [SkillCategory!]!
    skills(filter: SkillFilter, page: PageInput, sort: SkillSort = NEWEST): SkillPage!
    popularSkills(limit: Int = 8): [PopularSkill!]!
    mySkills(type: SkillType): [Skill!]!
    "Defaults to the signed-in user"
    skillDNA(userId: ID): SkillDNA!
  }

  extend type Mutation {
    addSkill(input: SkillInput!): Skill!
    updateSkill(id: ID!, input: SkillUpdateInput!): Skill!
    deleteSkill(id: ID!): ID!
  }
`;
