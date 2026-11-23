export default `#graphql
  enum MatchType { MUTUAL THEY_TEACH_YOU YOU_TEACH_THEM }
  enum Relation { SELF NONE CONNECTED PENDING_SENT PENDING_RECEIVED }

  type ScoreBreakdown {
    reciprocity: Int!
    coverage: Int!
    proficiency: Int!
    availability: Int!
    reputation: Int!
  }

  type SkillPair {
    skillName: String!
    teacher: User!
    learner: User!
    teacherSkill: Skill
    learnerSkill: Skill
    teacherLevel: SkillLevel!
    learnerLevel: SkillLevel!
    fitPercent: Int!
  }

  type OverlapWindow {
    day: Int!
    dayLabel: String!
    start: String!
    end: String!
    minutes: Int!
  }

  type Match {
    id: ID!
    user: User!
    matchType: MatchType!
    score: Int!
    breakdown: ScoreBreakdown!
    reasons: [String!]!
    youLearn: [SkillPair!]!
    youTeach: [SkillPair!]!
    overlap: [OverlapWindow!]!
    overlapMinutes: Int!
    relation: Relation!
  }

  type MatchPage {
    items: [Match!]!
    pageInfo: PageInfo!
  }

  type ExchangeBlueprint {
    me: User!
    partner: User!
    "Null when the two users have no skills in common"
    match: Match
    myOffers: [Skill!]!
    myWants: [Skill!]!
    theirOffers: [Skill!]!
    theirWants: [Skill!]!
    weights: ScoreBreakdown!
    relation: Relation!
  }

  input MatchFilter {
    matchType: MatchType
    minScore: Int
  }

  extend type Query {
    matches(filter: MatchFilter, page: PageInput): MatchPage!
    exchangeBlueprint(userId: ID!): ExchangeBlueprint!
    relationWith(userId: ID!): Relation!
  }
`;
