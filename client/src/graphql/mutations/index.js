import { gql } from '@apollo/client';
import { ME_FIELDS, SKILL_FIELDS, REQUEST_FIELDS, MESSAGE_FIELDS, SESSION_FIELDS, QUEST_FIELDS, ROOM_FIELDS, NOTE_FIELDS, NOTIFICATION_FIELDS, CATEGORY_FIELDS } from '../fragments.js';

export const REGISTER = gql`mutation Register($input: RegisterInput!) { register(input: $input) { token user { ...MeFields } } } ${ME_FIELDS}`;
export const LOGIN = gql`mutation Login($input: LoginInput!) { login(input: $input) { token user { ...MeFields } } } ${ME_FIELDS}`;
export const LOGOUT = gql`mutation Logout { logout }`;
export const UPDATE_PROFILE = gql`mutation UpdateProfile($input: ProfileInput!) { updateProfile(input: $input) { ...MeFields } } ${ME_FIELDS}`;
export const CHANGE_PASSWORD = gql`mutation ChangePassword($currentPassword: String!, $newPassword: String!) { changePassword(currentPassword: $currentPassword, newPassword: $newPassword) }`;

export const ADD_SKILL = gql`mutation AddSkill($input: SkillInput!) { addSkill(input: $input) { ...SkillFields } } ${SKILL_FIELDS}`;
export const UPDATE_SKILL = gql`mutation UpdateSkill($id: ID!, $input: SkillUpdateInput!) { updateSkill(id: $id, input: $input) { ...SkillFields } } ${SKILL_FIELDS}`;
export const DELETE_SKILL = gql`mutation DeleteSkill($id: ID!) { deleteSkill(id: $id) }`;

export const SEND_REQUEST = gql`mutation SendRequest($input: SwapRequestInput!) { sendSwapRequest(input: $input) { ...RequestFields } } ${REQUEST_FIELDS}`;
export const ACCEPT_REQUEST = gql`mutation AcceptRequest($id: ID!) { acceptSwapRequest(id: $id) { id status respondedAt } }`;
export const REJECT_REQUEST = gql`mutation RejectRequest($id: ID!) { rejectSwapRequest(id: $id) { id status respondedAt } }`;
export const CANCEL_REQUEST = gql`mutation CancelRequest($id: ID!) { cancelSwapRequest(id: $id) { id status respondedAt } }`;
export const COMPLETE_EXCHANGE = gql`mutation CompleteExchange($connectionId: ID!) { completeExchange(connectionId: $connectionId) { id status completedAt } }`;

export const SEND_MESSAGE = gql`mutation SendMessage($connectionId: ID!, $body: String!) { sendMessage(connectionId: $connectionId, body: $body) { ...MessageFields } } ${MESSAGE_FIELDS}`;
export const MARK_READ = gql`mutation MarkRead($connectionId: ID!) { markConversationRead(connectionId: $connectionId) }`;
export const SET_TYPING = gql`mutation SetTyping($connectionId: ID!, $isTyping: Boolean!) { setTyping(connectionId: $connectionId, isTyping: $isTyping) }`;

export const PROPOSE_SESSION = gql`mutation ProposeSession($input: SessionInput!) { proposeSession(input: $input) { ...SessionFields } } ${SESSION_FIELDS}`;
export const RESPOND_SESSION = gql`mutation RespondSession($id: ID!, $accept: Boolean!) { respondSession(id: $id, accept: $accept) { ...SessionFields } } ${SESSION_FIELDS}`;
export const CANCEL_SESSION = gql`mutation CancelSession($id: ID!) { cancelSession(id: $id) { ...SessionFields } } ${SESSION_FIELDS}`;
export const COMPLETE_SESSION = gql`mutation CompleteSession($id: ID!) { completeSession(id: $id) { ...SessionFields } } ${SESSION_FIELDS}`;

export const CREATE_REVIEW = gql`mutation CreateReview($input: ReviewInput!) { createReview(input: $input) { id rating } }`;

export const MARK_NOTIFICATION = gql`mutation MarkNotification($id: ID!) { markNotificationRead(id: $id) { ...NotificationFields } } ${NOTIFICATION_FIELDS}`;
export const MARK_ALL_NOTIFICATIONS = gql`mutation MarkAllNotifications { markAllNotificationsRead }`;
export const DELETE_NOTIFICATION = gql`mutation DeleteNotification($id: ID!) { deleteNotification(id: $id) }`;

export const CREATE_QUEST = gql`mutation CreateQuest($input: QuestInput!) { createQuest(input: $input) { ...QuestFields } } ${QUEST_FIELDS}`;
export const TOGGLE_MILESTONE = gql`mutation ToggleMilestone($id: ID!) { toggleMilestone(id: $id) { ...QuestFields } } ${QUEST_FIELDS}`;
export const ADD_MILESTONE = gql`mutation AddMilestone($questId: ID!, $title: String!) { addMilestone(questId: $questId, title: $title) { ...QuestFields } } ${QUEST_FIELDS}`;
export const DELETE_MILESTONE = gql`mutation DeleteMilestone($id: ID!) { deleteMilestone(id: $id) { ...QuestFields } } ${QUEST_FIELDS}`;
export const DELETE_QUEST = gql`mutation DeleteQuest($id: ID!) { deleteQuest(id: $id) }`;

export const CREATE_ROOM = gql`mutation CreateRoom($input: RoomInput!) { createRoom(input: $input) { ...RoomFields } } ${ROOM_FIELDS}`;
export const SEND_ROOM_MESSAGE = gql`mutation SendRoomMessage($roomId: ID!, $body: String!) { sendRoomMessage(roomId: $roomId, body: $body) { ...MessageFields } } ${MESSAGE_FIELDS}`;
export const CREATE_NOTE = gql`mutation CreateNote($roomId: ID!, $title: String!) { createRoomNote(roomId: $roomId, title: $title) { ...NoteFields } } ${NOTE_FIELDS}`;
export const UPDATE_NOTE = gql`mutation UpdateNote($id: ID!, $title: String, $content: String, $version: Int!) { updateRoomNote(id: $id, title: $title, content: $content, version: $version) { ...NoteFields } } ${NOTE_FIELDS}`;
export const DELETE_NOTE = gql`mutation DeleteNote($id: ID!) { deleteRoomNote(id: $id) }`;
export const ADD_AGENDA = gql`mutation AddAgenda($roomId: ID!, $text: String!) { addAgendaItem(roomId: $roomId, text: $text) { ...RoomFields } } ${ROOM_FIELDS}`;
export const TOGGLE_AGENDA = gql`mutation ToggleAgenda($roomId: ID!, $itemId: ID!) { toggleAgendaItem(roomId: $roomId, itemId: $itemId) { ...RoomFields } } ${ROOM_FIELDS}`;
export const REMOVE_AGENDA = gql`mutation RemoveAgenda($roomId: ID!, $itemId: ID!) { removeAgendaItem(roomId: $roomId, itemId: $itemId) { ...RoomFields } } ${ROOM_FIELDS}`;
export const LEAVE_ROOM = gql`mutation LeaveRoom($roomId: ID!) { leaveRoom(roomId: $roomId) }`;
export const ARCHIVE_ROOM = gql`mutation ArchiveRoom($roomId: ID!) { archiveRoom(roomId: $roomId) { id isArchived } }`;

export const REPORT_CONTENT = gql`mutation ReportContent($input: ReportInput!) { reportContent(input: $input) { id status } }`;

export const ADMIN_SET_STATUS = gql`mutation AdminSetStatus($userId: ID!, $status: UserStatus!) { adminSetUserStatus(userId: $userId, status: $status) { id status } }`;
export const ADMIN_SET_ROLE = gql`mutation AdminSetRole($userId: ID!, $role: Role!) { adminSetUserRole(userId: $userId, role: $role) { id role } }`;
export const CREATE_CATEGORY = gql`mutation CreateCategory($input: CategoryInput!) { createCategory(input: $input) { ...CategoryFields isActive } } ${CATEGORY_FIELDS}`;
export const UPDATE_CATEGORY = gql`mutation UpdateCategory($id: ID!, $input: CategoryInput!) { updateCategory(id: $id, input: $input) { ...CategoryFields isActive } } ${CATEGORY_FIELDS}`;
export const DELETE_CATEGORY = gql`mutation DeleteCategory($id: ID!) { deleteCategory(id: $id) }`;
export const RESOLVE_REPORT = gql`mutation ResolveReport($id: ID!, $action: ReportAction!, $note: String) { resolveReport(id: $id, action: $action, note: $note) { id status resolution } }`;
