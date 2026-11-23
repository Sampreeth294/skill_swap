import { gql } from '@apollo/client';

export const CATEGORY_FIELDS = gql`
  fragment CategoryFields on SkillCategory { id name slug icon color description }
`;

export const SKILL_FIELDS = gql`
  fragment SkillFields on Skill {
    id type name description level experienceMonths status createdAt
    category { ...CategoryFields }
  }
  ${CATEGORY_FIELDS}
`;

export const USER_CARD = gql`
  fragment UserCard on User {
    id name avatarUrl headline location ratingAvg ratingCount completedExchanges isOnline lastSeen
  }
`;

export const ME_FIELDS = gql`
  fragment MeFields on User {
    ...UserCard
    email role bio experience learningInterests credits profileCompletion createdAt
    teachingHours learningHours
    streak { current longest }
    availability { day dayLabel start end }
  }
  ${USER_CARD}
`;

export const MATCH_FIELDS = gql`
  fragment MatchFields on Match {
    id matchType score relation reasons overlapMinutes
    breakdown { reciprocity coverage proficiency availability reputation }
    user { ...UserCard teachSkills { id name level category { id name color icon } } }
    youLearn { skillName teacherLevel learnerLevel fitPercent teacherSkill { id } }
    youTeach { skillName teacherLevel learnerLevel fitPercent teacherSkill { id } }
    overlap { day dayLabel start end minutes }
  }
  ${USER_CARD}
`;

export const MESSAGE_FIELDS = gql`
  fragment MessageFields on Message {
    id connectionId roomId body isMine createdAt readAt
    sender { id name avatarUrl }
  }
`;

export const SESSION_FIELDS = gql`
  fragment SessionFields on Session {
    id title skillName agenda meetingLink startsAt endsAt durationMinutes status myRole
    confirmedByMe confirmationsCount canConfirm canRespond creditsForTeacher
    partner { ...UserCard }
    proposer { id name }
    connection { id }
  }
  ${USER_CARD}
`;

export const REQUEST_FIELDS = gql`
  fragment RequestFields on SwapRequest {
    id mode status message creditCost isIncoming createdAt respondedAt
    from { ...UserCard }
    to { ...UserCard }
    requestedSkill { id name level category { id name color icon } }
    offeredSkill { id name level category { id name color icon } }
  }
  ${USER_CARD}
`;

export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id type title body link read createdAt
    actor { id name avatarUrl }
  }
`;

export const QUEST_FIELDS = gql`
  fragment QuestFields on LearningQuest {
    id title skillName description targetDays startDate endDate daysLeft status completedAt
    completedCount totalCount progress
    milestones { id questId title order dueDate completed completedAt }
  }
`;

export const ROOM_FIELDS = gql`
  fragment RoomFields on LearningRoom {
    id name description skillName type schedule progress isOwner isArchived maxParticipants updatedAt
    owner { id name }
    participants { id name avatarUrl isOnline }
    agenda { id text done doneBy { id name } }
  }
`;

export const NOTE_FIELDS = gql`
  fragment NoteFields on RoomNote {
    id roomId title content version updatedAt
    updatedBy { id name }
    createdBy { id name }
  }
`;
