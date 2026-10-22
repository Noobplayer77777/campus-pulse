/**
 * Locations Service
 * Manages campus venues and room capacities in CampusPulse-Locations.
 */

const { GetCommand, PutCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CONFIG } = require('../config/constants');
const { getDocClient, paginateScan } = require('../db/dynamoClient');
const logger = require('../middleware/logger');

function generateUUID() {
  const nodeCrypto = require('crypto');
  return nodeCrypto.randomUUID();
}

/**
 * List locations with optional filtering
 * @param {Object} filters
 * @param {boolean} [filters.activeOnly=true]
 * @param {string} [filters.campus]
 */
async function listLocations(filters = {}) {
  const { activeOnly = true, campus } = filters;

  const expressions = [];
  const names = {};
  const values = {};

  if (activeOnly) {
    expressions.push('#active = :active');
    names['#active'] = 'isActive';
    values[':active'] = true;
  }

  if (campus) {
    expressions.push('#campus = :campus');
    names['#campus'] = 'campus';
    values[':campus'] = campus;
  }

  const scanParams = {
    TableName: CONFIG.TABLES.LOCATIONS,
  };

  if (expressions.length > 0) {
    scanParams.FilterExpression = expressions.join(' AND ');
    scanParams.ExpressionAttributeNames = names;
    scanParams.ExpressionAttributeValues = values;
  }

  return paginateScan(scanParams);
}

/**
 * Retrieve a single location by ID
 * @param {string} locationId
 */
async function getLocationById(locationId) {
  const docClient = getDocClient();
  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG.TABLES.LOCATIONS,
      Key: { locationId },
    })
  );
  return result.Item || null;
}

/**
 * Create a new campus location (Admin only)
 * @param {Object} locationData
 * @param {string} adminId
 */
async function createLocation(locationData, adminId) {
  const docClient = getDocClient();
  const { name, capacity, address, campus, description = '' } = locationData;

  if (!name || !capacity || !address || !campus) {
    throw new Error('Missing required location fields: name, capacity, address, campus');
  }

  const numericCapacity = Number(capacity);
  if (isNaN(numericCapacity) || numericCapacity <= 0) {
    throw new Error('Capacity must be a positive number');
  }

  // Check if location name already exists
  const existing = await listLocations({ activeOnly: false });
  const duplicate = existing.find(
    (loc) => loc.name && loc.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicate) {
    throw new Error('A location with this name already exists');
  }

  const locationId = generateUUID();
  const now = new Date().toISOString();

  const item = {
    locationId,
    name: name.trim(),
    capacity: numericCapacity,
    address: address.trim(),
    campus: campus.trim(),
    description: description.trim(),
    isActive: true,
    createdBy: adminId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: CONFIG.TABLES.LOCATIONS,
      Item: item,
    })
  );

  logger.info('Created new location', { locationId, name: item.name, adminId });

  return {
    locationId,
    status: 'success',
    message: 'Location created successfully',
    location: item,
  };
}

/**
 * Update an existing location (Admin only)
 * @param {string} locationId
 * @param {Object} updateData
 */
async function updateLocation(locationId, updateData) {
  const docClient = getDocClient();
  const existing = await getLocationById(locationId);
  if (!existing) {
    throw new Error('Location not found');
  }

  if (updateData.capacity !== undefined) {
    const num = Number(updateData.capacity);
    if (isNaN(num) || num <= 0) {
      throw new Error('Capacity must be a positive number');
    }
    updateData.capacity = num;
  }

  const updateExpressions = ['#updatedAt = :updatedAt'];
  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': new Date().toISOString() };

  for (const [key, val] of Object.entries(updateData)) {
    if (['name', 'capacity', 'address', 'campus', 'description', 'isActive'].includes(key)) {
      updateExpressions.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = val;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: CONFIG.TABLES.LOCATIONS,
      Key: { locationId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

/**
 * Soft delete a location (Admin only)
 * @param {string} locationId
 */
async function deleteLocation(locationId) {
  return updateLocation(locationId, { isActive: false });
}

module.exports = {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
};
