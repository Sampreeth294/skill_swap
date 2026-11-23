export default `#graphql
  enum RoomType { ONE_TO_ONE GROUP }

  type AgendaItem {
    id: ID!
    text: String!
    done: Boolean!
    doneBy: User
  }

  type RoomNote {
    id: ID!
    roomId: ID!
    title: String!
    content: String!
    version: Int!
    createdBy: User!
    updatedBy: User
    updatedAt: DateTime!
  }

  type LearningRoom {
    id: ID!
    name: String!
    description: String
    skillName: String
    type: RoomType!
    owner: User!
    participants: [User!]!
    maxParticipants: Int!
    schedule: String
    agenda: [AgendaItem!]!
    progress: Int!
    notes: [RoomNote!]!
    isOwner: Boolean!
    isArchived: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RoomNoteEvent {
    roomId: ID!
    note: RoomNote
    deletedId: ID
    editor: User!
  }

  input RoomInput {
    name: String!
    description: String
    skillName: String
    type: RoomType = ONE_TO_ONE
    participantIds: [ID!]!
    schedule: String
  }

  input RoomUpdateInput {
    name: String
    description: String
    skillName: String
    schedule: String
  }

  extend type Query {
    rooms: [LearningRoom!]!
    room(id: ID!): LearningRoom
    roomMessages(roomId: ID!, before: DateTime, limit: Int = 40): MessagePage!
  }

  extend type Mutation {
    createRoom(input: RoomInput!): LearningRoom!
    updateRoom(id: ID!, input: RoomUpdateInput!): LearningRoom!
    addRoomParticipant(roomId: ID!, userId: ID!): LearningRoom!
    leaveRoom(roomId: ID!): ID!
    archiveRoom(roomId: ID!): LearningRoom!
    sendRoomMessage(roomId: ID!, body: String!): Message!
    createRoomNote(roomId: ID!, title: String!): RoomNote!
    "version must equal the version you last saw; otherwise a CONFLICT error is returned"
    updateRoomNote(id: ID!, title: String, content: String, version: Int!): RoomNote!
    deleteRoomNote(id: ID!): ID!
    addAgendaItem(roomId: ID!, text: String!): LearningRoom!
    toggleAgendaItem(roomId: ID!, itemId: ID!): LearningRoom!
    removeAgendaItem(roomId: ID!, itemId: ID!): LearningRoom!
  }

  extend type Subscription {
    roomMessageAdded(roomId: ID!): Message!
    roomNoteUpdated(roomId: ID!): RoomNoteEvent!
    roomUpdated(roomId: ID!): LearningRoom!
  }
`;
