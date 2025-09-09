"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAccounts = getAllAccounts;
exports.getAccount = getAccount;
exports.getAccountByTwitterHandle = getAccountByTwitterHandle;
exports.saveAccount = saveAccount;
exports.updateAccount = updateAccount;
exports.deleteAccount = deleteAccount;
exports.getActiveAccounts = getActiveAccounts;
exports.getAllTweets = getAllTweets;
exports.getTweetsByAccount = getTweetsByAccount;
exports.saveTweet = saveTweet;
exports.getReadyTweets = getReadyTweets;
exports.getReadyTweetsByAccount = getReadyTweetsByAccount;
exports.getPaginatedTweets = getPaginatedTweets;
exports.deleteTweet = deleteTweet;
exports.deleteTweets = deleteTweets;
exports.generateTweetId = generateTweetId;
exports.createThread = createThread;
exports.getActiveThreadForPosting = getActiveThreadForPosting;
exports.getReadyThreads = getReadyThreads;
exports.updateThreadAfterPosting = updateThreadAfterPosting;
exports.startThreadPosting = startThreadPosting;
exports.getThreadTweet = getThreadTweet;
exports.getLastPostedTweetInThread = getLastPostedTweetInThread;
var postgres_1 = require("@vercel/postgres");
// In-memory storage for testing when database is not available
var inMemoryAccounts = [];
var inMemoryTweets = [];
// Use real database connection
var USE_IN_MEMORY = false; // Use PostgreSQL database
// Updated Tweet interface with account_id and threading support
// Encryption utilities for Twitter credentials
// Encryption key for future use - currently using unencrypted storage
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production';
function encrypt(text) {
    try {
        // For development/testing, just use simple base64 encoding
        // In production, use proper encryption with IV
        var encoded = Buffer.from(text).toString('base64');
        return "enc_".concat(encoded);
    }
    catch (error) {
        console.error('Encryption error:', error);
        // Fallback: return original text (not recommended for production)
        return text;
    }
}
function decrypt(encryptedText) {
    try {
        if (encryptedText.startsWith('enc_')) {
            // Remove prefix and decode
            var encoded = encryptedText.substring(4);
            return Buffer.from(encoded, 'base64').toString('utf8');
        }
        // Fallback for unencrypted data
        return encryptedText;
    }
    catch (error) {
        console.error('Decryption error:', error);
        // Fallback: return original text
        return encryptedText;
    }
}
// Account management functions
function getAllAccounts() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        console.log('[Memory] Getting all accounts, count:', inMemoryAccounts.length);
                        return [2 /*return*/, __spreadArray([], inMemoryAccounts, true)];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT * FROM accounts\n      ORDER BY created_at DESC\n    "], ["\n      SELECT * FROM accounts\n      ORDER BY created_at DESC\n    "])))];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            name: row.name,
                            twitter_handle: row.twitter_handle,
                            twitter_api_key: decrypt(row.twitter_api_key),
                            twitter_api_secret: decrypt(row.twitter_api_secret),
                            twitter_access_token: decrypt(row.twitter_access_token),
                            twitter_access_token_secret: decrypt(row.twitter_access_token_secret),
                            personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
                            branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
                                theme: 'educational',
                                audience: 'general',
                                tone: 'professional'
                            }),
                            status: row.status,
                            created_at: new Date(row.created_at),
                            updated_at: new Date(row.updated_at)
                        }); })];
                case 3:
                    error_1 = _a.sent();
                    console.error('[Neon] Error getting accounts:', error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getAccount(id) {
    return __awaiter(this, void 0, void 0, function () {
        var account, result, row, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        account = inMemoryAccounts.find(function (acc) { return acc.id === id; });
                        return [2 /*return*/, account || null];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT * FROM accounts\n      WHERE id = ", "\n    "], ["\n      SELECT * FROM accounts\n      WHERE id = ", "\n    "])), id)];
                case 2:
                    result = _a.sent();
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            name: row.name,
                            twitter_handle: row.twitter_handle,
                            twitter_api_key: decrypt(row.twitter_api_key),
                            twitter_api_secret: decrypt(row.twitter_api_secret),
                            twitter_access_token: decrypt(row.twitter_access_token),
                            twitter_access_token_secret: decrypt(row.twitter_access_token_secret),
                            personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
                            branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
                                theme: 'educational',
                                audience: 'general',
                                tone: 'professional'
                            }),
                            status: row.status,
                            created_at: new Date(row.created_at),
                            updated_at: new Date(row.updated_at)
                        }];
                case 3:
                    error_2 = _a.sent();
                    console.error('[Neon] Error getting account:', error_2);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getAccountByTwitterHandle(twitterHandle) {
    return __awaiter(this, void 0, void 0, function () {
        var withPrefix, withoutPrefix, account, result, row, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    withPrefix = twitterHandle.startsWith('@') ? twitterHandle : "@".concat(twitterHandle);
                    withoutPrefix = twitterHandle.replace('@', '');
                    if (USE_IN_MEMORY) {
                        account = inMemoryAccounts.find(function (acc) { return acc.twitter_handle === withPrefix; });
                        if (!account) {
                            account = inMemoryAccounts.find(function (acc) { return acc.twitter_handle === withoutPrefix; });
                        }
                        return [2 /*return*/, account || null];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n      SELECT * FROM accounts\n      WHERE twitter_handle = ", "\n    "], ["\n      SELECT * FROM accounts\n      WHERE twitter_handle = ", "\n    "])), withPrefix)];
                case 2:
                    result = _a.sent();
                    if (!(result.rows.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n        SELECT * FROM accounts\n        WHERE twitter_handle = ", "\n      "], ["\n        SELECT * FROM accounts\n        WHERE twitter_handle = ", "\n      "])), withoutPrefix)];
                case 3:
                    result = _a.sent();
                    _a.label = 4;
                case 4:
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            name: row.name,
                            twitter_handle: row.twitter_handle,
                            twitter_api_key: decrypt(row.twitter_api_key),
                            twitter_api_secret: decrypt(row.twitter_api_secret),
                            twitter_access_token: decrypt(row.twitter_access_token),
                            twitter_access_token_secret: decrypt(row.twitter_access_token_secret),
                            personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
                            branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
                                theme: 'educational',
                                audience: 'general',
                                tone: 'professional'
                            }),
                            status: row.status,
                            created_at: new Date(row.created_at),
                            updated_at: new Date(row.updated_at)
                        }];
                case 5:
                    error_3 = _a.sent();
                    console.error('[Neon] Error getting account by twitter handle:', error_3);
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function saveAccount(account) {
    return __awaiter(this, void 0, void 0, function () {
        var accountId, newAccount, result, accountId, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        accountId = "acc_".concat(Date.now(), "_").concat(Math.random().toString(36).substring(7));
                        newAccount = __assign(__assign({}, account), { id: accountId, created_at: new Date(), updated_at: new Date() });
                        inMemoryAccounts.push(newAccount);
                        console.log("[Memory] Saved account ".concat(accountId, " - ").concat(account.name));
                        return [2 /*return*/, accountId];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n      INSERT INTO accounts (\n        name, twitter_handle, twitter_api_key, twitter_api_secret,\n        twitter_access_token, twitter_access_token_secret, personas, branding, status\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      RETURNING id\n    "], ["\n      INSERT INTO accounts (\n        name, twitter_handle, twitter_api_key, twitter_api_secret,\n        twitter_access_token, twitter_access_token_secret, personas, branding, status\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      RETURNING id\n    "])), account.name, account.twitter_handle, encrypt(account.twitter_api_key), encrypt(account.twitter_api_secret), encrypt(account.twitter_access_token), encrypt(account.twitter_access_token_secret), JSON.stringify(account.personas), JSON.stringify(account.branding), account.status)];
                case 2:
                    result = _a.sent();
                    accountId = result.rows[0].id;
                    console.log("[Neon] Saved account ".concat(accountId));
                    return [2 /*return*/, accountId];
                case 3:
                    error_4 = _a.sent();
                    console.error('[Neon] Error saving account:', error_4);
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function updateAccount(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var updateFields, values, paramIndex, query, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    updateFields = [];
                    values = [];
                    paramIndex = 1;
                    if (updates.name) {
                        updateFields.push("name = $".concat(paramIndex++));
                        values.push(updates.name);
                    }
                    if (updates.twitter_handle) {
                        updateFields.push("twitter_handle = $".concat(paramIndex++));
                        values.push(updates.twitter_handle);
                    }
                    if (updates.twitter_api_key) {
                        updateFields.push("twitter_api_key = $".concat(paramIndex++));
                        values.push(encrypt(updates.twitter_api_key));
                    }
                    if (updates.twitter_api_secret) {
                        updateFields.push("twitter_api_secret = $".concat(paramIndex++));
                        values.push(encrypt(updates.twitter_api_secret));
                    }
                    if (updates.twitter_access_token) {
                        updateFields.push("twitter_access_token = $".concat(paramIndex++));
                        values.push(encrypt(updates.twitter_access_token));
                    }
                    if (updates.twitter_access_token_secret) {
                        updateFields.push("twitter_access_token_secret = $".concat(paramIndex++));
                        values.push(encrypt(updates.twitter_access_token_secret));
                    }
                    if (updates.personas !== undefined) {
                        updateFields.push("personas = $".concat(paramIndex++));
                        values.push(JSON.stringify(updates.personas));
                    }
                    if (updates.branding !== undefined) {
                        updateFields.push("branding = $".concat(paramIndex++));
                        values.push(JSON.stringify(updates.branding));
                    }
                    if (updates.status) {
                        updateFields.push("status = $".concat(paramIndex++));
                        values.push(updates.status);
                    }
                    if (updateFields.length === 0)
                        return [2 /*return*/];
                    values.push(id);
                    query = "UPDATE accounts SET ".concat(updateFields.join(', '), " WHERE id = $").concat(paramIndex);
                    return [4 /*yield*/, postgres_1.sql.query(query, values)];
                case 1:
                    _a.sent();
                    console.log("[Neon] Updated account ".concat(id));
                    return [3 /*break*/, 3];
                case 2:
                    error_5 = _a.sent();
                    console.error('[Neon] Error updating account:', error_5);
                    throw error_5;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function deleteAccount(id) {
    return __awaiter(this, void 0, void 0, function () {
        var error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["DELETE FROM accounts WHERE id = ", ""], ["DELETE FROM accounts WHERE id = ", ""])), id)];
                case 1:
                    _a.sent();
                    console.log("[Neon] Deleted account ".concat(id));
                    return [3 /*break*/, 3];
                case 2:
                    error_6 = _a.sent();
                    console.error('[Neon] Error deleting account:', error_6);
                    throw error_6;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getActiveAccounts() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        return [2 /*return*/, inMemoryAccounts.filter(function (acc) { return acc.status === 'active'; })];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n      SELECT * FROM accounts\n      WHERE status = 'active'\n      ORDER BY created_at ASC\n    "], ["\n      SELECT * FROM accounts\n      WHERE status = 'active'\n      ORDER BY created_at ASC\n    "])))];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            name: row.name,
                            twitter_handle: row.twitter_handle,
                            twitter_api_key: decrypt(row.twitter_api_key),
                            twitter_api_secret: decrypt(row.twitter_api_secret),
                            twitter_access_token: decrypt(row.twitter_access_token),
                            twitter_access_token_secret: decrypt(row.twitter_access_token_secret),
                            personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
                            branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
                                theme: 'educational',
                                audience: 'general',
                                tone: 'professional'
                            }),
                            status: row.status,
                            created_at: new Date(row.created_at),
                            updated_at: new Date(row.updated_at)
                        }); })];
                case 3:
                    error_7 = _a.sent();
                    console.error('[Neon] Error getting active accounts:', error_7);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Updated tweet functions to support account filtering
function getAllTweets() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      ORDER BY created_at DESC\n    "], ["\n      SELECT * FROM tweets\n      ORDER BY created_at DESC\n    "])))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
                            twitterId: row.twitter_id,
                            twitterUrl: row.twitter_url,
                            errorMessage: row.error_message,
                            status: row.status,
                            createdAt: new Date(row.created_at),
                            qualityScore: row.quality_score,
                            // Keep snake_case for backward compatibility
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            // Threading support
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }); })];
                case 2:
                    error_8 = _a.sent();
                    console.error('[Neon] Error getting tweets:', error_8);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getTweetsByAccount(accountId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      WHERE account_id = ", "\n      ORDER BY created_at DESC\n    "], ["\n      SELECT * FROM tweets\n      WHERE account_id = ", "\n      ORDER BY created_at DESC\n    "])), accountId)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
                            twitterId: row.twitter_id,
                            twitterUrl: row.twitter_url,
                            errorMessage: row.error_message,
                            status: row.status,
                            createdAt: new Date(row.created_at),
                            qualityScore: row.quality_score,
                            // Keep snake_case for backward compatibility
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            // Threading support
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }); })];
                case 2:
                    error_9 = _a.sent();
                    console.error('[Neon] Error getting tweets by account:', error_9);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Helper function to get property value with fallback for camelCase/snake_case
function getProperty(obj, snakeCase, camelCase) {
    var _a;
    var value = (_a = obj[snakeCase]) !== null && _a !== void 0 ? _a : obj[camelCase];
    return typeof value === 'string' ? value : undefined;
}
function saveTweet(tweet) {
    return __awaiter(this, void 0, void 0, function () {
        var tweetObj, newTweet, existingIndex, tweetObj, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        tweetObj = tweet;
                        newTweet = {
                            id: tweet.id,
                            account_id: tweet.account_id,
                            content: tweet.content,
                            hashtags: tweet.hashtags,
                            persona: tweet.persona,
                            status: tweet.status,
                            created_at: tweet.createdAt || getProperty(tweetObj, 'created_at', 'createdAt') || new Date().toISOString(),
                            posted_at: getProperty(tweetObj, 'posted_at', 'postedAt'),
                            twitter_id: getProperty(tweetObj, 'twitter_id', 'twitterId'),
                            twitter_url: getProperty(tweetObj, 'twitter_url', 'twitterUrl'),
                            error_message: getProperty(tweetObj, 'error_message', 'errorMessage'),
                            quality_score: tweetObj.quality_score ? JSON.stringify(tweetObj.quality_score) : (tweetObj.qualityScore ? JSON.stringify(tweetObj.qualityScore) : undefined),
                            // Threading support
                            content_type: tweet.content_type || 'single_tweet',
                            thread_id: tweetObj.thread_id,
                            thread_sequence: tweetObj.thread_sequence,
                            parent_twitter_id: tweetObj.parent_twitter_id,
                            hook_type: tweetObj.hook_type
                        };
                        existingIndex = inMemoryTweets.findIndex(function (t) { return t.id === tweet.id; });
                        if (existingIndex >= 0) {
                            inMemoryTweets[existingIndex] = newTweet;
                            console.log("[Memory] Updated tweet ".concat(tweet.id));
                        }
                        else {
                            inMemoryTweets.push(newTweet);
                            console.log("[Memory] Saved new tweet ".concat(tweet.id));
                        }
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    tweetObj = tweet;
                    console.log("[Neon] Executing saveTweet SQL query for tweet ".concat(tweet.id));
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["\n      INSERT INTO tweets (\n        id, account_id, content, hashtags, persona, posted_at, \n        twitter_id, twitter_url, error_message, status, created_at, quality_score,\n        thread_id, thread_sequence, parent_twitter_id, content_type, hook_type\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      ON CONFLICT (id) \n      DO UPDATE SET\n        account_id = EXCLUDED.account_id,\n        content = EXCLUDED.content,\n        hashtags = EXCLUDED.hashtags,\n        persona = EXCLUDED.persona,\n        posted_at = EXCLUDED.posted_at,\n        twitter_id = EXCLUDED.twitter_id,\n        twitter_url = EXCLUDED.twitter_url,\n        error_message = EXCLUDED.error_message,\n        status = EXCLUDED.status,\n        quality_score = EXCLUDED.quality_score,\n        thread_id = EXCLUDED.thread_id,\n        thread_sequence = EXCLUDED.thread_sequence,\n        parent_twitter_id = EXCLUDED.parent_twitter_id,\n        content_type = EXCLUDED.content_type,\n        hook_type = EXCLUDED.hook_type\n    "], ["\n      INSERT INTO tweets (\n        id, account_id, content, hashtags, persona, posted_at, \n        twitter_id, twitter_url, error_message, status, created_at, quality_score,\n        thread_id, thread_sequence, parent_twitter_id, content_type, hook_type\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", "\n      )\n      ON CONFLICT (id) \n      DO UPDATE SET\n        account_id = EXCLUDED.account_id,\n        content = EXCLUDED.content,\n        hashtags = EXCLUDED.hashtags,\n        persona = EXCLUDED.persona,\n        posted_at = EXCLUDED.posted_at,\n        twitter_id = EXCLUDED.twitter_id,\n        twitter_url = EXCLUDED.twitter_url,\n        error_message = EXCLUDED.error_message,\n        status = EXCLUDED.status,\n        quality_score = EXCLUDED.quality_score,\n        thread_id = EXCLUDED.thread_id,\n        thread_sequence = EXCLUDED.thread_sequence,\n        parent_twitter_id = EXCLUDED.parent_twitter_id,\n        content_type = EXCLUDED.content_type,\n        hook_type = EXCLUDED.hook_type\n    "])), tweet.id, tweet.account_id, tweet.content, JSON.stringify(tweet.hashtags), tweet.persona, getProperty(tweetObj, 'posted_at', 'postedAt'), getProperty(tweetObj, 'twitter_id', 'twitterId'), getProperty(tweetObj, 'twitter_url', 'twitterUrl'), getProperty(tweetObj, 'error_message', 'errorMessage'), tweet.status, tweet.createdAt || getProperty(tweetObj, 'created_at', 'createdAt') || new Date().toISOString(), tweetObj.quality_score ? JSON.stringify(tweetObj.quality_score) : (tweetObj.qualityScore ? JSON.stringify(tweetObj.qualityScore) : null), tweetObj.thread_id || null, tweetObj.thread_sequence || null, tweetObj.parent_twitter_id || null, tweet.content_type || 'single_tweet', tweetObj.hook_type || null)];
                case 2:
                    _a.sent();
                    console.log("[Neon] Saved tweet ".concat(tweet.id));
                    return [3 /*break*/, 4];
                case 3:
                    error_10 = _a.sent();
                    console.error('[Neon] Error saving tweet:', error_10);
                    throw error_10;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getReadyTweets() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      WHERE status = 'ready'\n      ORDER BY created_at ASC\n    "], ["\n      SELECT * FROM tweets\n      WHERE status = 'ready'\n      ORDER BY created_at ASC\n    "])))];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
                            twitterId: row.twitter_id,
                            twitterUrl: row.twitter_url,
                            errorMessage: row.error_message,
                            status: row.status,
                            createdAt: new Date(row.created_at),
                            qualityScore: row.quality_score,
                            // Keep snake_case for backward compatibility
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            // Threading support
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }); })];
                case 2:
                    error_11 = _a.sent();
                    console.error('[Neon] Error getting ready tweets:', error_11);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getReadyTweetsByAccount(accountId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      WHERE status = 'ready' AND account_id = ", "\n      ORDER BY created_at ASC\n    "], ["\n      SELECT * FROM tweets\n      WHERE status = 'ready' AND account_id = ", "\n      ORDER BY created_at ASC\n    "])), accountId)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
                            twitterId: row.twitter_id,
                            twitterUrl: row.twitter_url,
                            errorMessage: row.error_message,
                            status: row.status,
                            createdAt: new Date(row.created_at),
                            qualityScore: row.quality_score,
                            // Keep snake_case for backward compatibility
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            // Threading support
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }); })];
                case 2:
                    error_12 = _a.sent();
                    console.error('[Neon] Error getting ready tweets by account:', error_12);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getPaginatedTweets(params) {
    return __awaiter(this, void 0, void 0, function () {
        var filteredTweets, total, offset, tweets, totalPages, offset, countResult, _a, total, result, _b, tweets, totalPages, error_13;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (USE_IN_MEMORY) {
                        filteredTweets = params.accountId
                            ? inMemoryTweets.filter(function (t) { return t.account_id === params.accountId; })
                            : inMemoryTweets;
                        total = filteredTweets.length;
                        offset = (params.page - 1) * params.limit;
                        tweets = filteredTweets
                            .sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); })
                            .slice(offset, offset + params.limit);
                        totalPages = Math.ceil(total / params.limit);
                        return [2 /*return*/, {
                                data: tweets,
                                total: total,
                                page: params.page,
                                limit: params.limit,
                                totalPages: totalPages,
                                hasNext: params.page < totalPages,
                                hasPrev: params.page > 1,
                            }];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 10, , 11]);
                    offset = (params.page - 1) * params.limit;
                    if (!params.accountId) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["SELECT COUNT(*) as count FROM tweets WHERE account_id = ", ""], ["SELECT COUNT(*) as count FROM tweets WHERE account_id = ", ""])), params.accountId)];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, postgres_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["SELECT COUNT(*) as count FROM tweets"], ["SELECT COUNT(*) as count FROM tweets"])))];
                case 4:
                    _a = _c.sent();
                    _c.label = 5;
                case 5:
                    countResult = _a;
                    total = parseInt(countResult.rows[0].count);
                    if (!params.accountId) return [3 /*break*/, 7];
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["\n          SELECT * FROM tweets\n          WHERE account_id = ", "\n          ORDER BY created_at DESC\n          LIMIT ", " OFFSET ", "\n        "], ["\n          SELECT * FROM tweets\n          WHERE account_id = ", "\n          ORDER BY created_at DESC\n          LIMIT ", " OFFSET ", "\n        "])), params.accountId, params.limit, offset)];
                case 6:
                    _b = _c.sent();
                    return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, (0, postgres_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["\n          SELECT * FROM tweets\n          ORDER BY created_at DESC\n          LIMIT ", " OFFSET ", "\n        "], ["\n          SELECT * FROM tweets\n          ORDER BY created_at DESC\n          LIMIT ", " OFFSET ", "\n        "])), params.limit, offset)];
                case 8:
                    _b = _c.sent();
                    _c.label = 9;
                case 9:
                    result = _b;
                    tweets = result.rows.map(function (row) { return ({
                        id: row.id,
                        account_id: row.account_id,
                        content: row.content,
                        hashtags: row.hashtags || [],
                        persona: row.persona,
                        postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
                        twitterId: row.twitter_id,
                        twitterUrl: row.twitter_url,
                        errorMessage: row.error_message,
                        status: row.status,
                        createdAt: new Date(row.created_at),
                        qualityScore: row.quality_score,
                        // Keep snake_case for backward compatibility
                        posted_at: row.posted_at,
                        twitter_id: row.twitter_id,
                        twitter_url: row.twitter_url,
                        error_message: row.error_message,
                        created_at: row.created_at,
                        quality_score: row.quality_score,
                        // Threading support
                        thread_id: row.thread_id,
                        thread_sequence: row.thread_sequence,
                        parent_twitter_id: row.parent_twitter_id,
                        content_type: row.content_type || 'single_tweet',
                        hook_type: row.hook_type
                    }); });
                    totalPages = Math.ceil(total / params.limit);
                    return [2 /*return*/, {
                            data: tweets,
                            total: total,
                            page: params.page,
                            limit: params.limit,
                            totalPages: totalPages,
                            hasNext: params.page < totalPages,
                            hasPrev: params.page > 1,
                        }];
                case 10:
                    error_13 = _c.sent();
                    console.error('[Neon] Error getting paginated tweets:', error_13);
                    return [2 /*return*/, {
                            data: [],
                            total: 0,
                            page: params.page,
                            limit: params.limit,
                            totalPages: 0,
                            hasNext: false,
                            hasPrev: false,
                        }];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function deleteTweet(id) {
    return __awaiter(this, void 0, void 0, function () {
        var error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["DELETE FROM tweets WHERE id = ", ""], ["DELETE FROM tweets WHERE id = ", ""])), id)];
                case 1:
                    _a.sent();
                    console.log("[Neon] Deleted tweet ".concat(id));
                    return [3 /*break*/, 3];
                case 2:
                    error_14 = _a.sent();
                    console.error('[Neon] Error deleting tweet:', error_14);
                    throw error_14;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function deleteTweets(ids) {
    return __awaiter(this, void 0, void 0, function () {
        var placeholders, query, error_15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (ids.length === 0)
                        return [2 /*return*/];
                    placeholders = ids.map(function (_, index) { return "$".concat(index + 1); }).join(',');
                    query = "DELETE FROM tweets WHERE id IN (".concat(placeholders, ")");
                    return [4 /*yield*/, postgres_1.sql.query(query, ids)];
                case 1:
                    _a.sent();
                    console.log("[Neon] Deleted ".concat(ids.length, " tweets"));
                    return [3 /*break*/, 3];
                case 2:
                    error_15 = _a.sent();
                    console.error('[Neon] Error deleting tweets:', error_15);
                    throw error_15;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function generateTweetId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
// Thread management functions
function createThread(thread) {
    return __awaiter(this, void 0, void 0, function () {
        var threadId, error_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    threadId = crypto.randomUUID();
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["\n      INSERT INTO threads (\n        id, account_id, title, persona, story_template, total_tweets,\n        current_tweet, parent_tweet_id, status, next_post_time,\n        engagement_score, story_category, created_at\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        1,\n        ", ",\n        ", ",\n        ", ",\n        0,\n        ", ",\n        ", "\n      )\n    "], ["\n      INSERT INTO threads (\n        id, account_id, title, persona, story_template, total_tweets,\n        current_tweet, parent_tweet_id, status, next_post_time,\n        engagement_score, story_category, created_at\n      ) VALUES (\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        ", ",\n        1,\n        ", ",\n        ", ",\n        ", ",\n        0,\n        ", ",\n        ", "\n      )\n    "])), threadId, thread.account_id, thread.title, thread.persona, thread.story_template, thread.total_tweets, thread.parent_tweet_id || null, thread.status, thread.next_post_time || null, thread.story_category, new Date().toISOString())];
                case 1:
                    _a.sent();
                    console.log("[Neon] Created thread ".concat(threadId));
                    return [2 /*return*/, threadId];
                case 2:
                    error_16 = _a.sent();
                    console.error('[Neon] Error creating thread:', error_16);
                    throw error_16;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getActiveThreadForPosting(accountId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, row, error_17;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["\n      SELECT * FROM threads\n      WHERE account_id = ", "\n        AND status = 'posting'\n        AND next_post_time IS NOT NULL\n        AND next_post_time <= NOW()\n      ORDER BY next_post_time ASC\n      LIMIT 1\n    "], ["\n      SELECT * FROM threads\n      WHERE account_id = ", "\n        AND status = 'posting'\n        AND next_post_time IS NOT NULL\n        AND next_post_time <= NOW()\n      ORDER BY next_post_time ASC\n      LIMIT 1\n    "])), accountId)];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            account_id: row.account_id,
                            title: row.title,
                            persona: row.persona,
                            story_template: row.story_template,
                            total_tweets: row.total_tweets,
                            current_tweet: row.current_tweet,
                            parent_tweet_id: row.parent_tweet_id,
                            status: row.status,
                            next_post_time: row.next_post_time,
                            engagement_score: row.engagement_score,
                            story_category: row.story_category,
                            created_at: row.created_at
                        }];
                case 2:
                    error_17 = _a.sent();
                    console.error('[Neon] Error getting active thread:', error_17);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getReadyThreads(accountId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_18;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["\n      SELECT * FROM threads\n      WHERE account_id = ", "\n        AND status = 'ready'\n      ORDER BY created_at ASC\n      LIMIT 5\n    "], ["\n      SELECT * FROM threads\n      WHERE account_id = ", "\n        AND status = 'ready'\n      ORDER BY created_at ASC\n      LIMIT 5\n    "])), accountId)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result.rows.map(function (row) { return ({
                            id: row.id,
                            account_id: row.account_id,
                            title: row.title,
                            persona: row.persona,
                            story_template: row.story_template,
                            total_tweets: row.total_tweets,
                            current_tweet: row.current_tweet,
                            parent_tweet_id: row.parent_tweet_id,
                            status: row.status,
                            next_post_time: row.next_post_time,
                            engagement_score: row.engagement_score,
                            story_category: row.story_category,
                            created_at: row.created_at
                        }); })];
                case 2:
                    error_18 = _a.sent();
                    console.error('[Neon] Error getting ready threads:', error_18);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function updateThreadAfterPosting(threadId, twitterId, isComplete) {
    return __awaiter(this, void 0, void 0, function () {
        var error_19;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    if (!isComplete) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["\n        UPDATE threads \n        SET status = 'completed', next_post_time = NULL\n        WHERE id = ", "\n      "], ["\n        UPDATE threads \n        SET status = 'completed', next_post_time = NULL\n        WHERE id = ", "\n      "])), threadId)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (0, postgres_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["\n        UPDATE threads \n        SET current_tweet = current_tweet + 1,\n            next_post_time = NOW() + INTERVAL '5 minutes',\n            parent_tweet_id = COALESCE(parent_tweet_id, ", ")\n        WHERE id = ", "\n      "], ["\n        UPDATE threads \n        SET current_tweet = current_tweet + 1,\n            next_post_time = NOW() + INTERVAL '5 minutes',\n            parent_tweet_id = COALESCE(parent_tweet_id, ", ")\n        WHERE id = ", "\n      "])), twitterId, threadId)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    console.log("[Neon] Updated thread ".concat(threadId, " after posting"));
                    return [3 /*break*/, 6];
                case 5:
                    error_19 = _a.sent();
                    console.error('[Neon] Error updating thread after posting:', error_19);
                    throw error_19;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function startThreadPosting(threadId) {
    return __awaiter(this, void 0, void 0, function () {
        var error_20;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["\n      UPDATE threads \n      SET status = 'posting', next_post_time = NOW()\n      WHERE id = ", " AND status = 'ready'\n    "], ["\n      UPDATE threads \n      SET status = 'posting', next_post_time = NOW()\n      WHERE id = ", " AND status = 'ready'\n    "])), threadId)];
                case 1:
                    _a.sent();
                    console.log("[Neon] Started thread posting for ".concat(threadId));
                    return [3 /*break*/, 3];
                case 2:
                    error_20 = _a.sent();
                    console.error('[Neon] Error starting thread posting:', error_20);
                    throw error_20;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getThreadTweet(threadId, sequence) {
    return __awaiter(this, void 0, void 0, function () {
        var result, row, error_21;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      WHERE thread_id = ", " AND thread_sequence = ", "\n      LIMIT 1\n    "], ["\n      SELECT * FROM tweets\n      WHERE thread_id = ", " AND thread_sequence = ", "\n      LIMIT 1\n    "])), threadId, sequence)];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            status: row.status,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }];
                case 2:
                    error_21 = _a.sent();
                    console.error('[Neon] Error getting thread tweet:', error_21);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getLastPostedTweetInThread(threadId) {
    return __awaiter(this, void 0, void 0, function () {
        var result, row, error_22;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, postgres_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["\n      SELECT * FROM tweets\n      WHERE thread_id = ", "\n        AND twitter_id IS NOT NULL\n        AND status = 'posted'\n      ORDER BY thread_sequence DESC\n      LIMIT 1\n    "], ["\n      SELECT * FROM tweets\n      WHERE thread_id = ", "\n        AND twitter_id IS NOT NULL\n        AND status = 'posted'\n      ORDER BY thread_sequence DESC\n      LIMIT 1\n    "])), threadId)];
                case 1:
                    result = _a.sent();
                    if (result.rows.length === 0)
                        return [2 /*return*/, null];
                    row = result.rows[0];
                    return [2 /*return*/, {
                            id: row.id,
                            account_id: row.account_id,
                            content: row.content,
                            hashtags: row.hashtags || [],
                            persona: row.persona,
                            posted_at: row.posted_at,
                            twitter_id: row.twitter_id,
                            twitter_url: row.twitter_url,
                            error_message: row.error_message,
                            status: row.status,
                            created_at: row.created_at,
                            quality_score: row.quality_score,
                            thread_id: row.thread_id,
                            thread_sequence: row.thread_sequence,
                            parent_twitter_id: row.parent_twitter_id,
                            content_type: row.content_type || 'single_tweet',
                            hook_type: row.hook_type
                        }];
                case 2:
                    error_22 = _a.sent();
                    console.error('[Neon] Error getting last posted tweet in thread:', error_22);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25;
