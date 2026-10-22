/**
 * Clubs Service
 * Manages club directories, president IDs, and memberships in CampusPulse-Clubs.
 */

const { GetCommand, PutCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CONFIG } = require('../config/constants');
const { getDocClient, paginateScan } = require('../db/dynamoClient');
const logger = require('../middleware/logger');

function generateUUID() {
  const nodeCrypto = require('crypto');
  return nodeCrypto.randomUUID();
}

async function listClubs(filters = {}) {
  const scanParams = { TableName: CONFIG.TABLES.CLUBS };

  if (filters.status) {
    scanParams.FilterExpression = '#status = :status';
    scanParams.ExpressionAttributeNames = { '#status': 'status' };
    scanParams.ExpressionAttributeValues = { ':status': filters.status };
  }

  return paginateScan(scanParams);
}

async function getClubById(clubId) {
  const docClient = getDocClient();
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG.TABLES.CLUBS,
      Key: { clubId },
    })
  );
  return result.Item || null;
}

async function createClub(clubData, adminId) {
  const docClient = getDocClient();
  const { name, faculty, facultyEmail, president, presidentId, description, logo } = clubData;

  if (!name || !faculty || !facultyEmail || !presidentId) {
    throw new Error('Missing required club fields: name, faculty, facultyEmail, presidentId');
  }

  const clubId = generateUUID();
  const now = new Date().toISOString();

  const item = {
    clubId,
    name: name.trim(),
    faculty: faculty.trim(),
    facultyEmail: facultyEmail.trim(),
    president: president ? president.trim() : '',
    presidentId,
    description: description ? description.trim() : '',
    logo: logo || '',
    members: [presidentId],
    status: 'active',
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.TABLES.CLUBS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(clubId)',
    })
  );

  logger.info('Club created', { clubId, name: item.name });
  return { clubId, status: 'success', message: 'Club created successfully' };
}

/**
 * Update club details (Admin or Club President)
 */
async function updateClub(clubId, updateData, caller) {
  const docClient = getDocClient();
  const existing = await getClubById(clubId);
  if (!existing) {
    const error = new Error('Club not found');
    error.statusCode = 404;
    throw error;
  }

  // Caller must be Admin or the Club President
  if (caller.role !== 'admin' && caller.userId !== existing.presidentId) {
    const error = new Error('Access denied. Only the club president or an administrator can update club details.');
    error.statusCode = 403;
    throw error;
  }

  const allowedFields = ['name', 'faculty', 'facultyEmail', 'description', 'logo', 'president'];
  const updateExpressions = ['#updatedAt = :updatedAt'];
  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': new Date().toISOString() };

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateExpressions.push(`#${field} = :${field}`);
      names[`#${field}`] = field;
      values[`:${field}`] = updateData[field];
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.CLUBS,
      Key: { clubId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );

  logger.info('Club updated', { clubId, updatedBy: caller.userId });
  return result.Attributes;
}

module.exports = {
  listClubs,
  getClubById,
  createClub,
  updateClub,
};
