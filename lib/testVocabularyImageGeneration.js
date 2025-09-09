"use strict";
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
exports.testVocabularyImageGeneration = testVocabularyImageGeneration;
exports.testFullVocabularyImagePosting = testFullVocabularyImagePosting;
var imageGenerationService_1 = require("./imageGenerationService");
var db_1 = require("./db");
var twitter_1 = require("./twitter");
function testVocabularyImageGeneration() {
    return __awaiter(this, void 0, void 0, function () {
        var testCard, imageBuffer, testContent, extractedCard, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🧪 Testing vocabulary image generation system...');
                    testCard = {
                        word: 'serendipity',
                        meaning: 'The pleasant surprise of finding something good unexpectedly',
                        example: 'Finding this book was pure serendipity!',
                        partOfSpeech: 'noun',
                        synonyms: ['chance', 'luck', 'fortune']
                    };
                    console.log('🖼️ Generating vocabulary card image...');
                    return [4 /*yield*/, (0, imageGenerationService_1.generateVocabularyCardImage)(testCard)];
                case 1:
                    imageBuffer = _a.sent();
                    console.log("\u2705 Image generated successfully! Size: ".concat(imageBuffer.length, " bytes"));
                    testContent = "\uD83D\uDCDA Word of the Day: \"Serendipity\" means the pleasant surprise of finding something good unexpectedly.\n\nExample: \"Finding this book was pure serendipity!\"\n\nSynonyms: chance, luck, fortune\n\n#EnglishLearning #Vocabulary";
                    console.log('🔍 Testing content extraction...');
                    extractedCard = (0, imageGenerationService_1.extractVocabularyCard)(testContent);
                    console.log('📝 Extracted card:', extractedCard);
                    return [2 /*return*/, {
                            success: true,
                            imageGenerated: true
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error('❌ Vocabulary image generation test failed:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function testFullVocabularyImagePosting(accountId) {
    return __awaiter(this, void 0, void 0, function () {
        var account, testCard, imageBuffer, twitterCredentials, tweetContent, result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log("\uD83E\uDDEA Testing full vocabulary image posting for account: ".concat(accountId));
                    return [4 /*yield*/, (0, db_1.getAccount)(accountId)];
                case 1:
                    account = _a.sent();
                    if (!account) {
                        throw new Error("Account not found: ".concat(accountId));
                    }
                    console.log("\uD83D\uDCF1 Using Twitter account: ".concat(account.twitter_handle));
                    testCard = {
                        word: 'ubiquitous',
                        meaning: 'Present, appearing, or found everywhere',
                        example: 'Smartphones are ubiquitous in modern society',
                        partOfSpeech: 'adjective',
                        synonyms: ['widespread', 'pervasive', 'omnipresent']
                    };
                    console.log('🖼️ Generating vocabulary card image...');
                    return [4 /*yield*/, (0, imageGenerationService_1.generateVocabularyCardImage)(testCard)];
                case 2:
                    imageBuffer = _a.sent();
                    console.log("\u2705 Image generated! Size: ".concat(imageBuffer.length, " bytes"));
                    twitterCredentials = {
                        apiKey: account.twitter_api_key,
                        apiSecret: account.twitter_api_secret,
                        accessToken: account.twitter_access_token,
                        accessSecret: account.twitter_access_token_secret,
                    };
                    tweetContent = '#VocabularyBuilder #EnglishLearning';
                    console.log('🐦 Posting vocabulary card image...');
                    return [4 /*yield*/, (0, twitter_1.postTweetWithImage)(tweetContent, imageBuffer, twitterCredentials)];
                case 3:
                    result = _a.sent();
                    console.log("\uD83C\uDF89 Vocabulary image posted successfully! Tweet ID: ".concat(result.data.id));
                    console.log("\uD83D\uDD17 URL: https://x.com/".concat(account.twitter_handle, "/status/").concat(result.data.id));
                    return [2 /*return*/, {
                            success: true,
                            tweetId: result.data.id
                        }];
                case 4:
                    error_2 = _a.sent();
                    console.error('❌ Full vocabulary image posting test failed:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : String(error_2)
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
