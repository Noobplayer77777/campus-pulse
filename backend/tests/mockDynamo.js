/**
 * In-Memory Mock DynamoDB Document Client for Unit Testing.
 * Replicates table partitioning, conditional expressions, transactions, and GSIs
 * without requiring AWS credentials or local DynamoDB dependencies.
 */

class MockDynamoClient {
  constructor() {
    this.tables = {};
    this.laggedIndexes = new Set();
  }

  reset() {
    this.tables = {};
    this.laggedIndexes = new Set();
  }

  setGsiLag(indexName, isLagged) {
    if (isLagged) {
      this.laggedIndexes.add(indexName);
    } else {
      this.laggedIndexes.delete(indexName);
    }
  }

  getTable(tableName) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = new Map();
    }
    return this.tables[tableName];
  }

  buildItemKey(keyObj) {
    // If composite key (e.g. eventId and userId), sort keys for stable lookup
    const keys = Object.keys(keyObj).sort();
    return keys.map((k) => `${k}:${keyObj[k]}`).join('#');
  }

  async send(command) {
    // Artificial latency yield to simulate asynchronous distributed DynamoDB operations
    // and guarantee true interleaving of concurrent execution
    await new Promise((resolve) => setTimeout(resolve, 2));

    const input = command.input || command;
    const commandName = command.constructor ? command.constructor.name : '';

    if (commandName === 'GetCommand') return this.handleGet(input);
    if (commandName === 'PutCommand') return this.handlePut(input);
    if (commandName === 'UpdateCommand') return this.handleUpdate(input);
    if (commandName === 'DeleteCommand') return this.handleDelete(input);
    if (commandName === 'QueryCommand') return this.handleQuery(input);
    if (commandName === 'ScanCommand') return this.handleScan(input);
    if (commandName === 'TransactWriteCommand') return this.handleTransactWrite(input);
    if (commandName === 'BatchWriteCommand' || input.RequestItems) return this.handleBatchWrite(input);

    if (input.TransactItems) return this.handleTransactWrite(input);
    if (input.Item) return this.handlePut(input);
    if (input.UpdateExpression) return this.handleUpdate(input);
    if (input.KeyConditionExpression) return this.handleQuery(input);
    if (input.FilterExpression && !input.Key) return this.handleScan(input);
    if (input.Key) {
      if (input.delete) return this.handleDelete(input);
      return this.handleGet(input);
    }

    throw new Error(`Unsupported Mock DynamoDB command: ${commandName}`);
  }

  handleBatchWrite(input) {
    const requestItems = input.RequestItems || {};
    let totalItems = 0;
    for (const tableName of Object.keys(requestItems)) {
      totalItems += requestItems[tableName].length;
    }
    if (totalItems > 25) {
      const err = new Error("ValidationException: 1 validation error detected: Value at 'requestItems' failed to satisfy constraint: Member must have length less than or equal to 25");
      err.name = 'ValidationException';
      throw err;
    }
    for (const [tableName, ops] of Object.entries(requestItems)) {
      const table = this.getTable(tableName);
      for (const op of ops) {
        if (op.DeleteRequest) {
          const key = this.buildItemKey(op.DeleteRequest.Key);
          table.delete(key);
        } else if (op.PutRequest) {
          const keyObj = this.extractKey(tableName, op.PutRequest.Item);
          const key = this.buildItemKey(keyObj);
          table.set(key, JSON.parse(JSON.stringify(op.PutRequest.Item)));
        }
      }
    }
    return { UnprocessedItems: {} };
  }

  handleGet(input) {
    const table = this.getTable(input.TableName);
    const key = this.buildItemKey(input.Key);
    const item = table.get(key);
    return { Item: item ? JSON.parse(JSON.stringify(item)) : undefined };
  }

  handlePut(input) {
    const table = this.getTable(input.TableName);
    const keyObj = this.extractKey(input.TableName, input.Item);
    const key = this.buildItemKey(keyObj);

    if (input.ConditionExpression) {
      const existing = table.get(key);
      const conditionPassed = this.evalCondition(input.ConditionExpression, existing, input.ExpressionAttributeNames, input.ExpressionAttributeValues);
      if (!conditionPassed) {
        const err = new Error('The conditional request failed');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
    }

    table.set(key, JSON.parse(JSON.stringify(input.Item)));
    return {};
  }

  handleUpdate(input) {
    const table = this.getTable(input.TableName);
    const key = this.buildItemKey(input.Key);
    const existing = table.get(key) ? JSON.parse(JSON.stringify(table.get(key))) : null;

    if (input.ConditionExpression) {
      const conditionPassed = this.evalCondition(input.ConditionExpression, existing, input.ExpressionAttributeNames, input.ExpressionAttributeValues);
      if (!conditionPassed) {
        const err = new Error('The conditional request failed');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
    }

    const item = existing || { ...input.Key };
    this.applyUpdateExpression(item, input.UpdateExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues);
    table.set(key, item);

    let returnAttrs = {};
    if (input.ReturnValues === 'ALL_NEW') {
      returnAttrs = JSON.parse(JSON.stringify(item));
    } else if (input.ReturnValues === 'UPDATED_NEW') {
      returnAttrs = JSON.parse(JSON.stringify(item));
    }

    return { Attributes: returnAttrs };
  }

  handleDelete(input) {
    const table = this.getTable(input.TableName);
    const key = this.buildItemKey(input.Key);
    const existing = table.get(key);

    if (input.ConditionExpression) {
      const conditionPassed = this.evalCondition(input.ConditionExpression, existing, input.ExpressionAttributeNames, input.ExpressionAttributeValues);
      if (!conditionPassed) {
        const err = new Error('The conditional request failed');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
    }

    table.delete(key);
    return {};
  }

  handleQuery(input) {
    if (!input.KeyConditionExpression) {
      const err = new Error('ValidationException: Either the KeyConditions or KeyConditionExpression parameter must be specified in the request.');
      err.name = 'ValidationException';
      throw err;
    }

    if (input.IndexName && this.laggedIndexes.has(input.IndexName)) {
      return { Items: [], Count: 0 };
    }

    const table = this.getTable(input.TableName);
    let items = Array.from(table.values());

    // If querying GSI_Waitlist, sparse filter to items with queuePosition
    if (input.IndexName === 'GSI_Waitlist') {
      items = items.filter((item) => item.queuePosition !== undefined && item.queuePosition !== null);
      items.sort((a, b) => (Number(a.queuePosition) || 0) - (Number(b.queuePosition) || 0));
    }

    let results = items.filter((item) => {
      if (input.KeyConditionExpression) {
        return this.evalKeyCondition(item, input.KeyConditionExpression, input.ExpressionAttributeNames, input.ExpressionAttributeValues);
      }
      return true;
    });

    if (input.FilterExpression) {
      results = results.filter((item) =>
        this.evalCondition(input.FilterExpression, item, input.ExpressionAttributeNames, input.ExpressionAttributeValues)
      );
    }

    // Sort if needed
    if (input.ScanIndexForward === false) {
      results.reverse();
    }

    if (input.ExclusiveStartKey) {
      const startKeyStr = this.buildItemKey(input.ExclusiveStartKey);
      const startIndex = results.findIndex((item) => this.buildItemKey(this.extractKey(input.TableName, item)) === startKeyStr);
      if (startIndex >= 0) {
        results = results.slice(startIndex + 1);
      }
    }

    let lastEvaluatedKey = undefined;
    if (input.Limit && input.Limit > 0 && results.length > input.Limit) {
      const paged = results.slice(0, input.Limit);
      const lastItem = paged[paged.length - 1];
      lastEvaluatedKey = this.extractKey(input.TableName, lastItem);
      results = paged;
    }

    const response = {
      Items: JSON.parse(JSON.stringify(results)),
      Count: results.length,
    };
    if (lastEvaluatedKey) {
      response.LastEvaluatedKey = lastEvaluatedKey;
    }
    return response;
  }

  handleScan(input) {
    const table = this.getTable(input.TableName);
    const items = Array.from(table.values());

    let results = items;
    if (input.FilterExpression) {
      results = results.filter((item) =>
        this.evalCondition(input.FilterExpression, item, input.ExpressionAttributeNames, input.ExpressionAttributeValues)
      );
    }

    if (input.ExclusiveStartKey) {
      const startKeyStr = this.buildItemKey(input.ExclusiveStartKey);
      const startIndex = results.findIndex((item) => this.buildItemKey(this.extractKey(input.TableName, item)) === startKeyStr);
      if (startIndex >= 0) {
        results = results.slice(startIndex + 1);
      }
    }

    let lastEvaluatedKey = undefined;
    if (input.Limit && input.Limit > 0 && results.length > input.Limit) {
      const paged = results.slice(0, input.Limit);
      const lastItem = paged[paged.length - 1];
      lastEvaluatedKey = this.extractKey(input.TableName, lastItem);
      results = paged;
    }

    const response = {
      Items: JSON.parse(JSON.stringify(results)),
      Count: results.length,
    };
    if (lastEvaluatedKey) {
      response.LastEvaluatedKey = lastEvaluatedKey;
    }
    return response;
  }

  handleTransactWrite(input) {
    const reasons = [];
    let hasFailure = false;

    // 1. Verify all conditions first and accumulate CancellationReasons
    for (const action of input.TransactItems) {
      let passed = true;
      if (action.Put) {
        const p = action.Put;
        const table = this.getTable(p.TableName);
        const keyObj = this.extractKey(p.TableName, p.Item);
        const key = this.buildItemKey(keyObj);
        const existing = table.get(key);
        if (p.ConditionExpression) {
          passed = this.evalCondition(p.ConditionExpression, existing, p.ExpressionAttributeNames, p.ExpressionAttributeValues);
        }
      } else if (action.Update) {
        const u = action.Update;
        const table = this.getTable(u.TableName);
        const key = this.buildItemKey(u.Key);
        const existing = table.get(key);
        if (u.ConditionExpression) {
          passed = this.evalCondition(u.ConditionExpression, existing, u.ExpressionAttributeNames, u.ExpressionAttributeValues);
        }
      } else if (action.Delete) {
        const d = action.Delete;
        const table = this.getTable(d.TableName);
        const key = this.buildItemKey(d.Key);
        const existing = table.get(key);
        if (d.ConditionExpression) {
          passed = this.evalCondition(d.ConditionExpression, existing, d.ExpressionAttributeNames, d.ExpressionAttributeValues);
        }
      }

      if (passed) {
        reasons.push({ Code: 'None' });
      } else {
        reasons.push({ Code: 'ConditionalCheckFailed', Message: 'The conditional request failed' });
        hasFailure = true;
      }
    }

    if (hasFailure) {
      const err = new Error('Transaction cancelled, please refer to the cancellation reasons');
      err.name = 'TransactionCanceledException';
      err.CancellationReasons = reasons;
      throw err;
    }

    // 2. If all conditions pass, apply all mutations
    for (const action of input.TransactItems) {
      if (action.Put) {
        const p = action.Put;
        const table = this.getTable(p.TableName);
        const keyObj = this.extractKey(p.TableName, p.Item);
        const key = this.buildItemKey(keyObj);
        table.set(key, JSON.parse(JSON.stringify(p.Item)));
      } else if (action.Update) {
        const u = action.Update;
        const table = this.getTable(u.TableName);
        const key = this.buildItemKey(u.Key);
        const existing = table.get(key) ? JSON.parse(JSON.stringify(table.get(key))) : { ...u.Key };
        this.applyUpdateExpression(existing, u.UpdateExpression, u.ExpressionAttributeNames, u.ExpressionAttributeValues);
        table.set(key, existing);
      } else if (action.Delete) {
        const d = action.Delete;
        const table = this.getTable(d.TableName);
        const key = this.buildItemKey(d.Key);
        table.delete(key);
      }
    }

    return {};
  }

  extractKey(tableName, item) {
    if (tableName.includes('Events')) return { eventId: item.eventId };
    if (tableName.includes('Users')) return { userId: item.userId };
    if (tableName.includes('Clubs')) return { clubId: item.clubId };
    if (tableName.includes('Locations')) return { locationId: item.locationId };
    if (tableName.includes('Registrations')) return { eventId: item.eventId, userId: item.userId };
    if (item.eventId && item.userId) return { eventId: item.eventId, userId: item.userId };
    if (item.eventId) return { eventId: item.eventId };
    if (item.userId) return { userId: item.userId };
    if (item.clubId) return { clubId: item.clubId };
    if (item.locationId) return { locationId: item.locationId };
    return item;
  }

  resolveName(namePlaceholder, names) {
    if (!namePlaceholder) return '';
    if (namePlaceholder.startsWith('#') && names && names[namePlaceholder]) {
      return names[namePlaceholder];
    }
    return namePlaceholder.replace(/^#/, '');
  }

  resolveValue(valPlaceholder, values) {
    if (valPlaceholder && valPlaceholder.startsWith(':') && values && values.hasOwnProperty(valPlaceholder)) {
      return values[valPlaceholder];
    }
    return valPlaceholder;
  }

  evalCondition(expr, item, names = {}, values = {}) {
    if (!expr) return true;

    // Helper to evaluate top-level AND clauses (accounting for parentheses)
    const subClauses = [];
    let currentClause = '';
    let parenDepth = 0;

    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '(') parenDepth++;
      if (ch === ')') parenDepth--;

      if (parenDepth === 0 && expr.substr(i, 5).toUpperCase() === ' AND ') {
        subClauses.push(currentClause.trim());
        currentClause = '';
        i += 4;
        continue;
      }
      currentClause += ch;
    }
    if (currentClause.trim()) {
      subClauses.push(currentClause.trim());
    }

    for (const clause of subClauses) {
      if (!this.evalSingleClause(clause, item, names, values)) {
        return false;
      }
    }

    return true;
  }

  evalSingleClause(clause, item, names = {}, values = {}) {
    let trimmed = clause.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      trimmed = trimmed.substring(1, trimmed.length - 1).trim();
    }

    if (/\s+OR\s+/i.test(trimmed)) {
      const orClauses = trimmed.split(/\s+OR\s+/i);
      return orClauses.some((c) => this.evalSingleClause(c, item, names, values));
    }

    // attribute_not_exists(foo)
    const notExistsMatch = trimmed.match(/attribute_not_exists\(([^)]+)\)/);
    if (notExistsMatch) {
      const attr = this.resolveName(notExistsMatch[1].trim(), names);
      return !item || item[attr] === undefined || item[attr] === null;
    }

    // attribute_exists(foo)
    const existsMatch = trimmed.match(/attribute_exists\(([^)]+)\)/);
    if (existsMatch) {
      const attr = this.resolveName(existsMatch[1].trim(), names);
      return !!item && item[attr] !== undefined && item[attr] !== null;
    }

    // Comparisons: #a < #b or #a = :val or #a <> :val or #a > :val
    const opMatch = trimmed.match(/([#a-zA-Z0-9_]+)\s*(=|<>|!=|<|>|<=|>=)\s*([:#a-zA-Z0-9_]+)/);
    if (opMatch) {
      const leftName = this.resolveName(opMatch[1], names);
      const op = opMatch[2];
      const rightToken = opMatch[3];

      let leftVal = item ? item[leftName] : undefined;
      let rightVal;
      if (rightToken.startsWith(':')) {
        rightVal = this.resolveValue(rightToken, values);
      } else {
        rightVal = item ? item[this.resolveName(rightToken, names)] : undefined;
      }

      if (op === '=') return leftVal === rightVal;
      if (op === '<>' || op === '!=') return leftVal !== rightVal;
      if (op === '<') return leftVal !== undefined && leftVal < rightVal;
      if (op === '<=') return leftVal !== undefined && leftVal <= rightVal;
      if (op === '>') return leftVal !== undefined && leftVal > rightVal;
      if (op === '>=') return leftVal !== undefined && leftVal >= rightVal;
      return false;
    }

    return true;
  }

  evalKeyCondition(item, expr, names = {}, values = {}) {
    return this.evalCondition(expr, item, names, values);
  }

  applyUpdateExpression(item, expr, names = {}, values = {}) {
    if (!expr) return;

    // Support SET, ADD, REMOVE
    const sections = expr.split(/\b(SET|ADD|REMOVE)\b/i).filter(Boolean);
    let currentMode = 'SET';

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      const upper = section.toUpperCase();
      if (upper === 'SET' || upper === 'ADD' || upper === 'REMOVE') {
        currentMode = upper;
        continue;
      }

      const clauses = section.split(/,(?![^(]*\))/).map((c) => c.trim()).filter(Boolean);
      for (const clause of clauses) {
        if (currentMode === 'SET') {
          // e.g. waitlistSequence = if_not_exists(waitlistSequence, :zero) + :one
          const ifNotExistsOpMatch = clause.match(
            /([#a-zA-Z0-9_]+)\s*=\s*if_not_exists\(\s*([#a-zA-Z0-9_]+)\s*,\s*([:0-9a-zA-Z_]+)\s*\)\s*(\+|\-)\s*([:0-9a-zA-Z_]+)/i
          );
          const plusMatch = clause.match(/([#a-zA-Z0-9_]+)\s*=\s*([#a-zA-Z0-9_]+)\s*\+\s*([:a-zA-Z0-9_]+)/);
          const minusMatch = clause.match(/([#a-zA-Z0-9_]+)\s*=\s*([#a-zA-Z0-9_]+)\s*-\s*([:a-zA-Z0-9_]+)/);
          const directMatch = clause.match(/([#a-zA-Z0-9_]+)\s*=\s*(.+)/);

          if (ifNotExistsOpMatch) {
            const attr = this.resolveName(ifNotExistsOpMatch[1], names);
            const fallbackToken = ifNotExistsOpMatch[3];
            const fallback = Number(this.resolveValue(fallbackToken, values)) || 0;
            const op = ifNotExistsOpMatch[4];
            const deltaVal = Number(this.resolveValue(ifNotExistsOpMatch[5], values)) || 0;
            const current = item[attr] !== undefined && item[attr] !== null ? Number(item[attr]) : fallback;
            item[attr] = op === '+' ? current + deltaVal : Math.max(0, current - deltaVal);
          } else if (plusMatch) {
            const attr = this.resolveName(plusMatch[1], names);
            const val = this.resolveValue(plusMatch[3], values);
            item[attr] = (Number(item[attr]) || 0) + Number(val);
          } else if (minusMatch) {
            const attr = this.resolveName(minusMatch[1], names);
            const val = this.resolveValue(minusMatch[3], values);
            item[attr] = (Number(item[attr]) || 0) - Number(val);
          } else if (directMatch) {
            const attr = this.resolveName(directMatch[1], names);
            const valToken = directMatch[2].trim();
            const val = this.resolveValue(valToken, values);
            item[attr] = val;
          }
        } else if (currentMode === 'ADD') {
          // e.g. #waitlistSeq :one
          const addMatch = clause.match(/([#a-zA-Z0-9_]+)\s+([:a-zA-Z0-9_]+)/);
          if (addMatch) {
            const attr = this.resolveName(addMatch[1], names);
            const val = this.resolveValue(addMatch[2], values);
            item[attr] = (Number(item[attr]) || 0) + Number(val);
          }
        } else if (currentMode === 'REMOVE') {
          const attr = this.resolveName(clause, names);
          delete item[attr];
        }
      }
    }
  }
}

module.exports = {
  MockDynamoClient,
};
