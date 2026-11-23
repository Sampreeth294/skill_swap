import { gql } from '@apollo/client';
import { ME_FIELDS, USER_CARD, SKILL_FIELDS, CATEGORY_FIELDS, MATCH_FIELDS, MESSAGE_FIELDS, SESSION_FIELDS, REQUEST_FIELDS, NOTIFICATION_FIELDS, QUEST_FIELDS, ROOM_FIELDS, NOTE_FIELDS } from '../fragments.js';

export const ME = gql`query Me { me { ...MeFields } } ${ME_FIELDS}`;

export const LANDING = gql`
  query Landing {
    publicStats { users skills exchanges sessions categories hoursShared }
    categories { ...CategoryFields teachCount learnCount }
    featuredUsers(limit: 6) { ...UserCard teachSkills { id name level } learnSkills { id name } }
    popularSkills(limit: 10) { name teachers learners category { id name color icon } }
    featuredReviews(limit: 3) { id rating comment endorsedSkill reviewer { id name avatarUrl headline } reviewee { id name } }
  }
  ${USER_CARD} ${CATEGORY_FIELDS}
`;

export const CATEGORIES = gql`query Categories { categories { ...CategoryFields teachCount learnCount } } ${CATEGORY_FIELDS}`;

export const MY_SKILLS = gql`query MySkills { mySkills { ...SkillFields } } ${SKILL_FIELDS}`;

export const EXPLORE_SKILLS = gql`
  query ExploreSkills($filter: SkillFilter, $page: PageInput, $sort: SkillSort) {
    skills(filter: $filter, page: $page, sort: $sort) {
      items { ...SkillFields matchScore owner { ...UserCard availability { dayLabel start end } } }
      pageInfo { total page pages hasNextPage }
    }
  }
  ${SKILL_FIELDS} ${USER_CARD}
`;

export const USER_PROFILE = gql`
  query UserProfile($id: ID!) {
    user(id: $id) {
      ...UserCard bio experience learningInterests teachingHours learningHours createdAt
      availability { day dayLabel start end }
      teachSkills { ...SkillFields }
      learnSkills { ...SkillFields }
    }
    reviews(userId: $id, page: { limit: 10 }) { items { id rating comment endorsedSkill createdAt reviewer { id name avatarUrl } } pageInfo { total } }
    ratingSummary(userId: $id) { average count distribution }
  }
  ${USER_CARD} ${SKILL_FIELDS}
`;

export const MATCHES = gql`
  query Matches($filter: MatchFilter, $page: PageInput) {
    matches(filter: $filter, page: $page) { items { ...MatchFields } pageInfo { total page pages hasNextPage } }
  }
  ${MATCH_FIELDS}
`;

export const BLUEPRINT = gql`
  query Blueprint($userId: ID!) {
    exchangeBlueprint(userId: $userId) {
      relation
      me { id name avatarUrl availability { day dayLabel start end } }
      partner { ...UserCard availability { day dayLabel start end } }
      match { ...MatchFields }
      myOffers { id name level } myWants { id name level status }
      theirOffers { id name level } theirWants { id name level status }
      weights { reciprocity coverage proficiency availability reputation }
    }
  }
  ${MATCH_FIELDS} ${USER_CARD}
`;

export const SKILL_DNA = gql`
  query SkillDNA($userId: ID) {
    skillDNA(userId: $userId) {
      user { id name avatarUrl }
      nodes { id label kind level weight sessions category { id name color icon } }
      categories { score teach learn category { id name color icon } }
      strongestCategory { id name icon color }
      totals { teach learn mastered learned interests }
    }
  }
`;

export const DASHBOARD = gql`
  query Dashboard {
    dashboardStats { teachCount learnCount connections pendingIncoming upcomingSessions activeQuests credits unreadNotifications unreadMessages profileCompletion missingProfileItems }
    myActivity(days: 14) { date milestones sessions messages }
    matches(page: { limit: 4 }) { items { ...MatchFields } pageInfo { total } }
    swapRequests(box: INCOMING, status: PENDING, page: { limit: 3 }) { items { ...RequestFields } }
    sessions(scope: UPCOMING, page: { limit: 3 }) { items { ...SessionFields } }
    quests(status: ACTIVE) { ...QuestFields }
    notifications(page: { limit: 5 }) { items { ...NotificationFields } }
  }
  ${MATCH_FIELDS} ${REQUEST_FIELDS} ${SESSION_FIELDS} ${QUEST_FIELDS} ${NOTIFICATION_FIELDS}
`;

export const SWAP_REQUESTS = gql`
  query SwapRequests($box: RequestBox, $status: RequestStatus, $page: PageInput) {
    swapRequests(box: $box, status: $status, page: $page) { items { ...RequestFields } pageInfo { total page pages hasNextPage } }
  }
  ${REQUEST_FIELDS}
`;

export const CONNECTIONS = gql`
  query Connections {
    connections {
      id status completedSessions lastMessageAt unreadCount canReview createdAt
      partner { ...UserCard }
      exchanges { skillName teacher { id name } learner { id name } }
      lastMessage { id body createdAt isMine }
      myReview { id rating }
    }
  }
  ${USER_CARD}
`;

export const MESSAGES = gql`
  query Messages($connectionId: ID!, $before: DateTime) {
    messages(connectionId: $connectionId, before: $before, limit: 30) { items { ...MessageFields } hasMore }
  }
  ${MESSAGE_FIELDS}
`;

export const UNREAD_COUNTS = gql`query UnreadCounts { unreadMessageCount unreadNotificationCount }`;

export const SESSIONS = gql`
  query Sessions($scope: SessionScope, $page: PageInput) {
    sessions(scope: $scope, page: $page) { items { ...SessionFields } pageInfo { total page pages hasNextPage } }
  }
  ${SESSION_FIELDS}
`;

export const QUESTS = gql`query Quests { quests { ...QuestFields } me { id streak { current longest } } } ${QUEST_FIELDS}`;

export const PASSPORT = gql`
  query Passport($userId: ID) {
    skillPassport(userId: $userId) {
      user { ...UserCard }
      teachingHours learningHours completedExchanges sessionsCompleted milestonesCompleted memberSince
      skillsTaught { skillName hours sessions }
      skillsLearned { skillName hours sessions }
      masteredSkills learnedSkills
      achievements { code title description icon tier earned awardedAt }
      endorsements { skillName count }
      recentMilestones { id title completedAt }
      reputation { score level nextLevelAt }
    }
  }
  ${USER_CARD}
`;

export const CREDITS = gql`
  query Credits($page: PageInput) {
    myCredits {
      balance earned spent
      rules { signupBonus perTeachingHour maxPerSession creditRequestCost }
      transactions(page: $page) { items { id type amount balanceAfter reason refType createdAt } pageInfo { total page pages hasNextPage } }
    }
  }
`;

export const NOTIFICATIONS = gql`
  query Notifications($unreadOnly: Boolean, $page: PageInput) {
    notifications(unreadOnly: $unreadOnly, page: $page) { items { ...NotificationFields } pageInfo { total page pages hasNextPage } }
    unreadNotificationCount
  }
  ${NOTIFICATION_FIELDS}
`;

export const ROOMS = gql`query Rooms { rooms { ...RoomFields } } ${ROOM_FIELDS}`;

export const ROOM = gql`
  query Room($id: ID!) {
    room(id: $id) { ...RoomFields notes { ...NoteFields } }
    roomMessages(roomId: $id) { items { ...MessageFields } hasMore }
  }
  ${ROOM_FIELDS} ${NOTE_FIELDS} ${MESSAGE_FIELDS}
`;

export const ADMIN_OVERVIEW = gql`
  query AdminOverview {
    adminStats {
      users activeUsers suspendedUsers onlineUsers skills connections requests pendingRequests sessionsCompleted messages openReports creditsInCirculation
      timeline { date signups requests sessions }
      topSkills { name teachers learners category { id name color } }
    }
    adminActivity(limit: 15) { id kind text createdAt actor { id name avatarUrl } }
  }
`;

export const ADMIN_USERS = gql`
  query AdminUsers($filter: AdminUserFilter, $page: PageInput) {
    adminUsers(filter: $filter, page: $page) { items { ...UserCard email role status credits createdAt } pageInfo { total page pages hasNextPage } }
  }
  ${USER_CARD}
`;

export const ADMIN_REPORTS = gql`
  query AdminReports($status: ReportStatus) {
    adminReports(status: $status, page: { limit: 50 }) {
      items { id targetType targetId targetPreview reason status resolution createdAt reporter { id name } targetUser { id name status } }
      pageInfo { total }
    }
  }
`;

export const ADMIN_REQUESTS = gql`
  query AdminRequests($status: RequestStatus) {
    adminRequests(status: $status, page: { limit: 50 }) { items { ...RequestFields } pageInfo { total } }
  }
  ${REQUEST_FIELDS}
`;

export const ADMIN_CATEGORIES = gql`query AdminCategories { adminCategories { ...CategoryFields isActive teachCount learnCount } } ${CATEGORY_FIELDS}`;
