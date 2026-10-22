/**
 * User Profile Service
 * Manages user documents in CampusPulse-Users.
 * Strictly prevents self-privilege escalation (role is immutable through public profile routes).
 */

const { GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CONFIG, ROLES } = require('../config/constants');
const { getDocClient } = require('../db/dynamoClient');
const { enforceStudentOnlyRole } = require('../middleware/auth');
const logger = require('../middleware/logger');

/**
 * Retrieve user profile by ID.
 * @param {string} userId - Cognito Sub ID
 */
async function getUser(userId) {
  const docClient = getDocClient();
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG.TABLES.USERS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

/**
 * Create or sync initial user document upon signup.
 * Guaranteed to assign 'student' role for public signups.
 */
async function createUser(userData) {
  const docClient = getDocClient();
  const now = new Date().toISOString();

  // Enforce student role unless provisioned by trusted administrative workflow
  const assignedRole = enforceStudentOnlyRole(userData.role);

  const item = {
    userId: userData.userId,
    email: userData.email,
    displayName: userData.displayName || userData.name || userData.email.split('@')[0],
    role: assignedRole,
    regNo: userData.regNo || '',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.TABLES.USERS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(userId)',
    })
  );

  logger.info('User profile created in DynamoDB', { userId: item.userId, role: item.role });
  return item;
}

/**
 * Update user display name and profile fields.
 * Explicitly excludes updating the 'role' attribute.
 */
async function updateUserProfile(userId, updateData) {
  const docClient = getDocClient();
  const now = new Date().toISOString();

  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ':updatedAt': now,
  };

  if (updateData.displayName && typeof updateData.displayName === 'string') {
    const trimmed = updateData.displayName.trim();
    if (trimmed.length > 0) {
      updates.push('#displayName = :displayName');
      expressionAttributeNames['#displayName'] = 'displayName';
      expressionAttributeValues[':displayName'] = trimmed;
    }
  }

  if (updateData.regNo && typeof updateData.regNo === 'string') {
    updates.push('#regNo = :regNo');
    expressionAttributeNames['#regNo'] = 'regNo';
    expressionAttributeValues[':regNo'] = updateData.regNo.trim();
  }

  if (updates.length === 0) {
    return await getUser(userId);
  }

  updates.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';

  const result = await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.USERS,
      Key: { userId },
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(userId)',
    })
  );

  logger.info('User profile updated', { userId });
  return result.Attributes;
}

module.exports = {
  getUser,
  createUser,
  updateUserProfile,
};
