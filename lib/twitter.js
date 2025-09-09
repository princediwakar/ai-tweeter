"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReplyTweet = postReplyTweet;
exports.postTweet = postTweet;
exports.postTweetWithImage = postTweetWithImage;
exports.postToTwitter = postToTwitter;
exports.validateTwitterCredentials = validateTwitterCredentials;
// Simple Twitter API implementation using fetch and OAuth 1.0a
var crypto = require("crypto");
// Legacy function removed - now using per-account credentials
function generateOAuthSignature(method, url, params, credentials) {
    // Create base string
    var paramString = Object.keys(params)
        .sort()
        .map(function (key) { return "".concat(encodeURIComponent(key), "=").concat(encodeURIComponent(params[key])); })
        .join('&');
    var baseString = "".concat(method.toUpperCase(), "&").concat(encodeURIComponent(url), "&").concat(encodeURIComponent(paramString));
    // Create signing key
    var signingKey = "".concat(encodeURIComponent(credentials.apiSecret), "&").concat(encodeURIComponent(credentials.accessSecret));
    // Generate signature
    var signature = crypto
        .createHmac('sha1', signingKey)
        .update(baseString)
        .digest('base64');
    return signature;
}
function createOAuthHeader(method, url, params, credentials) {
    if (params === void 0) { params = {}; }
    var oauthParams = __assign({ oauth_consumer_key: credentials.apiKey, oauth_token: credentials.accessToken, oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_nonce: crypto.randomBytes(16).toString('hex'), oauth_version: '1.0' }, params);
    var signature = generateOAuthSignature(method, url, oauthParams, credentials);
    oauthParams.oauth_signature = signature;
    var authHeader = 'OAuth ' + Object.keys(oauthParams)
        .sort()
        .map(function (key) { return "".concat(encodeURIComponent(key), "=\"").concat(encodeURIComponent(oauthParams[key]), "\""); })
        .join(', ');
    return authHeader;
}
function postReplyTweet(content_1, replyToTweetId_1, credentials_1) {
    return __awaiter(this, arguments, void 0, function (content, replyToTweetId, credentials, retryCount) {
        var maxRetries, retryDelay, url, method, authHeader, response, errorText, errorObj, result, error_1;
        if (retryCount === void 0) { retryCount = 0; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maxRetries = 3;
                    retryDelay = Math.pow(2, retryCount) * 1000;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 11]);
                    url = 'https://api.twitter.com/2/tweets';
                    method = 'POST';
                    authHeader = createOAuthHeader(method, url, {}, credentials);
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                text: content,
                                reply: {
                                    in_reply_to_tweet_id: replyToTweetId
                                }
                            })
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response.text()];
                case 3:
                    errorText = _a.sent();
                    errorObj = void 0;
                    try {
                        errorObj = JSON.parse(errorText);
                    }
                    catch (_b) {
                        errorObj = { title: 'Unknown error', detail: errorText };
                    }
                    // Handle specific Twitter API errors
                    if (response.status === 403) {
                        if (errorText.includes('oauth1 app permissions')) {
                            throw new Error("\uD83D\uDEAB PERMISSION ERROR: Your Twitter app needs \"Read and Write\" permissions. Please:\n1. Visit https://developer.x.com/en/portal/dashboard\n2. Select your app\n3. Navigate to Settings > User authentication settings  \n4. Enable \"Read and Write\" permissions\n5. Regenerate your Access Token and Secret\n6. Update your .env.local file with the new tokens\n\nCurrent error: ".concat(errorObj.detail || errorText));
                        }
                        throw new Error("\uD83D\uDEAB FORBIDDEN: ".concat(errorObj.detail || errorText));
                    }
                    if (response.status === 429) {
                        throw new Error("\u23F0 RATE LIMIT: Too many requests. Please wait before trying again.");
                    }
                    if (response.status === 401) {
                        throw new Error("\uD83D\uDD10 UNAUTHORIZED: Invalid credentials or expired tokens. Please check your Twitter API keys.");
                    }
                    if (!(response.status >= 500 && retryCount < maxRetries)) return [3 /*break*/, 5];
                    console.warn("\u26A0\uFE0F Server error (".concat(response.status, "), retrying in ").concat(retryDelay, "ms... (").concat(retryCount + 1, "/").concat(maxRetries, ")"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryDelay); })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, postReplyTweet(content, replyToTweetId, credentials, retryCount + 1)];
                case 5: throw new Error("Twitter API error: ".concat(response.status, " ").concat(response.statusText, " - ").concat(errorObj.detail || errorText));
                case 6: return [4 /*yield*/, response.json()];
                case 7:
                    result = _a.sent();
                    console.log('✅ Reply tweet posted successfully to X/Twitter!');
                    console.log("\uD83D\uDCDD Content: ".concat(content));
                    console.log("\uD83D\uDD17 In reply to: ".concat(replyToTweetId));
                    console.log("\uD83C\uDD94 Tweet ID: ".concat(result.data.id));
                    console.log("\uD83D\uDCCA Length: ".concat(content.length, " characters"));
                    console.log("\uD83D\uDD17 URL: https://x.com/user/status/".concat(result.data.id));
                    return [2 /*return*/, {
                            data: {
                                id: result.data.id,
                                text: content
                            }
                        }];
                case 8:
                    error_1 = _a.sent();
                    // Don't retry on client errors (4xx) except specific cases
                    if (error_1 instanceof Error && error_1.message.includes('PERMISSION ERROR')) {
                        console.error('❌ Permission Error:', error_1.message);
                        throw error_1;
                    }
                    if (!(retryCount < maxRetries && !(error_1 instanceof Error))) return [3 /*break*/, 10];
                    console.warn("\u26A0\uFE0F Unexpected error, retrying in ".concat(retryDelay, "ms... (").concat(retryCount + 1, "/").concat(maxRetries, ")"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryDelay); })];
                case 9:
                    _a.sent();
                    return [2 /*return*/, postReplyTweet(content, replyToTweetId, credentials, retryCount + 1)];
                case 10:
                    console.error('❌ Error posting reply tweet:', error_1);
                    throw error_1;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function postTweet(content_1, credentials_1) {
    return __awaiter(this, arguments, void 0, function (content, credentials, retryCount) {
        var maxRetries, retryDelay, url, method, authHeader, response, errorText, errorObj, result, error_2;
        if (retryCount === void 0) { retryCount = 0; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maxRetries = 3;
                    retryDelay = Math.pow(2, retryCount) * 1000;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 11]);
                    url = 'https://api.twitter.com/2/tweets';
                    method = 'POST';
                    authHeader = createOAuthHeader(method, url, {}, credentials);
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ text: content })
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 6];
                    return [4 /*yield*/, response.text()];
                case 3:
                    errorText = _a.sent();
                    errorObj = void 0;
                    try {
                        errorObj = JSON.parse(errorText);
                    }
                    catch (_b) {
                        errorObj = { title: 'Unknown error', detail: errorText };
                    }
                    // Handle specific Twitter API errors
                    if (response.status === 403) {
                        if (errorText.includes('oauth1 app permissions')) {
                            throw new Error("\uD83D\uDEAB PERMISSION ERROR: Your Twitter app needs \"Read and Write\" permissions. Please:\n1. Visit https://developer.x.com/en/portal/dashboard\n2. Select your app\n3. Navigate to Settings > User authentication settings  \n4. Enable \"Read and Write\" permissions\n5. Regenerate your Access Token and Secret\n6. Update your .env.local file with the new tokens\n\nCurrent error: ".concat(errorObj.detail || errorText));
                        }
                        throw new Error("\uD83D\uDEAB FORBIDDEN: ".concat(errorObj.detail || errorText));
                    }
                    if (response.status === 429) {
                        throw new Error("\u23F0 RATE LIMIT: Too many requests. Please wait before trying again.");
                    }
                    if (response.status === 401) {
                        throw new Error("\uD83D\uDD10 UNAUTHORIZED: Invalid credentials or expired tokens. Please check your Twitter API keys.");
                    }
                    if (!(response.status >= 500 && retryCount < maxRetries)) return [3 /*break*/, 5];
                    console.warn("\u26A0\uFE0F Server error (".concat(response.status, "), retrying in ").concat(retryDelay, "ms... (").concat(retryCount + 1, "/").concat(maxRetries, ")"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryDelay); })];
                case 4:
                    _a.sent();
                    return [2 /*return*/, postTweet(content, credentials, retryCount + 1)];
                case 5: throw new Error("Twitter API error: ".concat(response.status, " ").concat(response.statusText, " - ").concat(errorObj.detail || errorText));
                case 6: return [4 /*yield*/, response.json()];
                case 7:
                    result = _a.sent();
                    console.log('✅ Tweet posted successfully to X/Twitter!');
                    console.log("\uD83D\uDCDD Content: ".concat(content));
                    console.log("\uD83C\uDD94 Tweet ID: ".concat(result.data.id));
                    console.log("\uD83D\uDCCA Length: ".concat(content.length, " characters"));
                    console.log("\uD83D\uDD17 URL: https://x.com/user/status/".concat(result.data.id));
                    return [2 /*return*/, {
                            data: {
                                id: result.data.id,
                                text: content
                            }
                        }];
                case 8:
                    error_2 = _a.sent();
                    // Don't retry on client errors (4xx) except specific cases
                    if (error_2 instanceof Error && error_2.message.includes('PERMISSION ERROR')) {
                        console.error('❌ Permission Error:', error_2.message);
                        throw error_2;
                    }
                    if (!(retryCount < maxRetries && !(error_2 instanceof Error))) return [3 /*break*/, 10];
                    console.warn("\u26A0\uFE0F Unexpected error, retrying in ".concat(retryDelay, "ms... (").concat(retryCount + 1, "/").concat(maxRetries, ")"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, retryDelay); })];
                case 9:
                    _a.sent();
                    return [2 /*return*/, postTweet(content, credentials, retryCount + 1)];
                case 10:
                    console.error('❌ Error posting tweet:', error_2);
                    throw error_2;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function postTweetWithImage(content, imageBuffer, credentials) {
    return __awaiter(this, void 0, void 0, function () {
        var TwitterApi, client, mediaUpload, tweet, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('twitter-api-v2'); })];
                case 1:
                    TwitterApi = (_a.sent()).TwitterApi;
                    client = new TwitterApi({
                        appKey: credentials.apiKey,
                        appSecret: credentials.apiSecret,
                        accessToken: credentials.accessToken,
                        accessSecret: credentials.accessSecret,
                    });
                    // Upload image using v1.1 API
                    console.log("\uD83D\uDCE4 Uploading image (".concat(imageBuffer.length, " bytes)"));
                    return [4 /*yield*/, client.v1.uploadMedia(imageBuffer, {
                            mimeType: 'image/jpeg',
                            target: 'tweet'
                        })];
                case 2:
                    mediaUpload = _a.sent();
                    console.log("\u2705 Image uploaded successfully. Media ID: ".concat(mediaUpload));
                    return [4 /*yield*/, client.v2.tweet({
                            text: content,
                            media: { media_ids: [mediaUpload.toString()] }
                        })];
                case 3:
                    tweet = _a.sent();
                    console.log('✅ Tweet with image posted successfully to X/Twitter!');
                    console.log("\uD83D\uDCDD Content: ".concat(content));
                    console.log("\uD83C\uDD94 Tweet ID: ".concat(tweet.data.id));
                    console.log("\uD83D\uDCCA Length: ".concat(content.length, " characters"));
                    console.log("\uD83D\uDD17 URL: https://x.com/user/status/".concat(tweet.data.id));
                    return [2 /*return*/, {
                            data: {
                                id: tweet.data.id,
                                text: content
                            }
                        }];
                case 4:
                    error_3 = _a.sent();
                    console.error('❌ Error posting tweet with image:', error_3);
                    throw error_3;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function postToTwitter(content, hashtags, credentials) {
    return __awaiter(this, void 0, void 0, function () {
        var hasHashtagsInContent, tweetText;
        return __generator(this, function (_a) {
            hasHashtagsInContent = hashtags.some(function (hashtag) { return content.includes(hashtag); });
            tweetText = hasHashtagsInContent
                ? content
                : "".concat(content).concat(hashtags.length > 0 ? ' ' + hashtags.map(function (tag) { return "#".concat(tag); }).join(' ') : '');
            return [2 /*return*/, postTweet(tweetText, credentials)];
        });
    });
}
function validateTwitterCredentials(credentials) {
    return __awaiter(this, void 0, void 0, function () {
        var url, method, authHeader, response, errorText, result, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    url = 'https://api.twitter.com/2/users/me';
                    method = 'GET';
                    authHeader = createOAuthHeader(method, url, {}, credentials);
                    return [4 /*yield*/, fetch(url, {
                            method: method,
                            headers: {
                                'Authorization': authHeader,
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    errorText = _a.sent();
                    console.error('❌ Twitter credentials validation failed:', response.status, errorText);
                    return [2 /*return*/, { valid: false }];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    result = _a.sent();
                    console.log('✅ Twitter credentials validated');
                    console.log("\uD83D\uDC64 Connected as: @".concat(result.data.username, " (").concat(result.data.name, ")"));
                    console.log("\uD83C\uDD94 User ID: ".concat(result.data.id));
                    return [2 /*return*/, {
                            valid: true,
                            userInfo: {
                                username: result.data.username,
                                name: result.data.name,
                                id: result.data.id
                            }
                        }];
                case 5:
                    error_4 = _a.sent();
                    console.error('❌ Twitter credentials validation failed:', error_4);
                    return [2 /*return*/, { valid: false }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
