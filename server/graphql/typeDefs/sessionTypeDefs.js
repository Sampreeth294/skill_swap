export default `#graphql
  enum SessionStatus { PROPOSED ACCEPTED REJECTED CANCELLED COMPLETED }
  enum SessionScope { UPCOMING INVITATIONS PAST ALL }
  enum SessionRole { TEACHER LEARNER }

  type Session {
    id: ID!
    connection: Connection
    proposer: User!
    invitee: User!
    teacher: User!
    learner: User!
    partner: User!
    myRole: SessionRole!
    skillName: String!
    title: String!
    agenda: String
    meetingLink: String
    startsAt: DateTime!
    endsAt: DateTime!
    durationMinutes: Int!
    status: SessionStatus!
    confirmedByMe: Boolean!
    confirmationsCount: Int!
    canConfirm: Boolean!
    canRespond: Boolean!
    creditsForTeacher: Int!
    completedAt: DateTime
    createdAt: DateTime!
  }

  type SessionPage {
    items: [Session!]!
    pageInfo: PageInfo!
  }

  input SessionInput {
    connectionId: ID!
    "Who teaches in this session — you or your partner"
    teacherId: ID!
    skillName: String!
    title: String!
    agenda: String
    meetingLink: String
    startsAt: DateTime!
    durationMinutes: Int!
  }

  extend type Query {
    sessions(scope: SessionScope = UPCOMING, page: PageInput): SessionPage!
    session(id: ID!): Session
  }

  extend type Mutation {
    proposeSession(input: SessionInput!): Session!
    respondSession(id: ID!, accept: Boolean!): Session!
    cancelSession(id: ID!): Session!
    "Each participant confirms; credits and hours are awarded once both have confirmed"
    completeSession(id: ID!): Session!
  }
`;
