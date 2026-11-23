import { DateTime } from './helpers.js';
import user from './userResolvers.js';
import skill from './skillResolvers.js';
import match from './matchResolvers.js';
import request from './requestResolvers.js';
import message from './messageResolvers.js';
import room from './roomResolvers.js';
import session from './sessionResolvers.js';
import review from './reviewResolvers.js';
import notification from './notificationResolvers.js';
import quest from './questResolvers.js';
import credit from './creditResolvers.js';
import passport from './passportResolvers.js';
import admin from './adminResolvers.js';

export default [{ DateTime }, user, skill, match, request, message, room, session, review, notification, quest, credit, passport, admin];
